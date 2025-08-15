const path = require('path');
const fs = require('fs');
const { fetchTodayEvents } = require('../calendar');
const { shouldFilterEvent } = require('../config');
const { parseGoogleHangout, parseZoom, parseTeams, parseWebex, parseOtherMeetingType } = require('../parsers');
const { formatHeader, formatOutput, upsertTodaySection, upsertTodayMeeting, normalizeTodayNote } = require('../writer');
const { buildAgendaLinesForEvent } = require('../agendasInjector');
const { buildMeetingKeyFromEvent, reorderAndPruneMeetings, ensureMeetingsSectionInitialized } = require('../meetingBlockManager');
const { loadAgendaCache } = require('../services/remindersService');

/**
 * Orchestrates the daily note generation end-to-end.
 * @param {Object} opts
 * @param {Object} opts.auth - Authorized OAuth2 client for Google APIs
 * @param {Object} opts.config - Resolved configuration object
 * @param {string} opts.pathPrefix - Daily notes directory
 * @param {Function} [opts.log] - Optional logger with info/warn/debug/error
 * @param {Array<RegExp>} opts.eventsFilterRegex - Precompiled filter regex list
 */
async function runDailyPipeline({ auth, config, pathPrefix, log = console, eventsFilterRegex }) {
  // Fetch today's events
  const events = await fetchTodayEvents(auth);

  // Header
  const header = formatHeader(config, pathPrefix);
  await upsertTodaySection('HEADER', header, pathPrefix);

  // Optional agendas cache
  let remindersCache = null;
  const enableAgendaInjection = (config.flags && config.flags.enableAgendas) || String(process.env.ENABLE_AGENDAS || 'false').toLowerCase() === 'true';
  if (enableAgendaInjection) remindersCache = await loadAgendaCache(pathPrefix, log);

  // Ensure/normalize meetings section
  try { await ensureMeetingsSectionInitialized(pathPrefix); } catch (e) { if (log && log.debug) log.debug('meetings init skipped', e && e.message); }

  // Upsert meetings
  const agendasInjectedForPerson = new Set();
  const assistantEmails = new Set(
    (process.env.ASSISTANT_EMAILS ? process.env.ASSISTANT_EMAILS.split(',') : ['assistant@example.com'])
      .map(e => String(e || '').trim().toLowerCase()).filter(Boolean)
  );
  const insertedMeetingKeys = new Set();
  const sortedEvents = [...events].sort((a, b) => new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date));
  for (const event of sortedEvents) {
    if (shouldFilterEvent(event, config, eventsFilterRegex)) continue;
    const parsers = [parseGoogleHangout, parseZoom, parseTeams, parseWebex, parseOtherMeetingType];
    for (const parser of parsers) {
      const result = parser(event);
      if (!result) continue;
      let content = formatOutput(result, config);
      if (enableAgendaInjection) {
        const agendaLines = buildAgendaLinesForEvent(event, remindersCache, agendasInjectedForPerson, assistantEmails);
        if (agendaLines.length) content += `\n${agendaLines.join('\n')}`;
      }
      // Reserve space for ad-hoc notes entry by the user
      content += `\nNotes\n\n`;
      const ymd = result.fullStartDate.getFullYear() + '-' +
        String(result.fullStartDate.getMonth()+1).padStart(2,'0') + '-' +
        String(result.fullStartDate.getDate()).padStart(2,'0') + '-' +
        String(result.fullStartDate.getHours()).padStart(2,'0') +
        String(result.fullStartDate.getMinutes()).padStart(2,'0');
      const meetingKey = buildMeetingKeyFromEvent(event, ymd);
      insertedMeetingKeys.add(meetingKey);
      await upsertTodayMeeting(meetingKey, content, pathPrefix);
      break;
    }
  }

  // Reorder/prune
  try { await reorderAndPruneMeetings(pathPrefix, insertedMeetingKeys); } catch (e) { if (log && log.debug) log.debug('reorder/prune skipped', e && e.message); }

  // Reminders embed
  const remindersQuery = [
    '',
    '## Reminders (Inbox only)',
    '![[reminders_inbox.md]]'
  ].join('\n');
  await upsertTodaySection('REMINDERS', remindersQuery, pathPrefix);

  // Normalize
  await normalizeTodayNote(pathPrefix);
}

module.exports = {
  runDailyPipeline,
};


