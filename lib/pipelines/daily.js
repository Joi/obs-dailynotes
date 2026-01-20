const path = require('path');
const fs = require('fs');
const { fetchTodayEvents } = require('../calendar');
const { shouldFilterEvent } = require('../config');
const { parseGoogleHangout, parseZoom, parseTeams, parseWebex, parseOtherMeetingType } = require('../parsers');
const { formatHeader, formatOutput, upsertTodaySection, upsertTodayMeeting, normalizeTodayNote } = require('../writer');
const { buildAgendaLinesForEvent } = require('../agendasInjector');
const { buildMeetingKeyFromEvent, reorderAndPruneMeetings, ensureMeetingsSectionInitialized } = require('../meetingBlockManager');
const { loadAgendaCache } = require('../services/remindersService');
const { buildAmplifierProjectsSection } = require('../amplifierProjects');
const { buildKnowledgeStatusSection } = require('../knowledgeStatus');
const { buildCapturedNotesSection } = require('../notesAggregator');
const { buildGTDFocusSection } = require('../gtdFocus');

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
  // Exclude injecting user's agenda when an optional attendee matches the configured email(s)
  const agendaOptionalExclusions = new Set(
    (process.env.AGENDA_OPTIONAL_EXCLUSIONS ? process.env.AGENDA_OPTIONAL_EXCLUSIONS.split(',') : ['mika@ito.com'])
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
        // Skip agenda injection if any optional attendee matches exclusion list
        const hasExcludedOptional = Array.isArray(event.attendees) && event.attendees.some(a => {
          const email = String(a.email || '').toLowerCase();
          return a.optional === true && agendaOptionalExclusions.has(email);
        });
        const agendaLines = hasExcludedOptional ? [] : buildAgendaLinesForEvent(event, remindersCache, agendasInjectedForPerson, assistantEmails);
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

  // Resolve switchboard paths (used by multiple sections)
  const switchboardDataPath = process.env.SWITCHBOARD_DATA_PATH || path.join(require('os').homedir(), 'switchboard', 'data');
  const switchboardPath = path.dirname(switchboardDataPath); // ~/switchboard
  const switchboardNotesSyncDir = path.join(switchboardPath, 'notes-sync');

  // GTD Focus section (urgent, overdue, due today)
  const focusSection = buildGTDFocusSection(pathPrefix);
  if (focusSection) {
    await upsertTodaySection('FOCUS', focusSection, pathPrefix);
  }

  // GTD Dashboard link
  const gtdDashboardLink = [
    '',
    '## 📋 GTD Dashboard',
    '[[GTD Dashboard]]'
  ].join('\n');
  await upsertTodaySection('REMINDERS', gtdDashboardLink, pathPrefix);

  // Captured Notes section (from Apple Notes sync)
  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const capturedNotesSection = buildCapturedNotesSection(todayStr, switchboardNotesSyncDir);
  if (capturedNotesSection) {
    await upsertTodaySection('CAPTURED', capturedNotesSection, pathPrefix);
  }

  // Amplifier Projects section
  const amplifierSection = await buildAmplifierProjectsSection(switchboardPath, log);
  if (amplifierSection) {
    await upsertTodaySection('AMPLIFIER', amplifierSection, pathPrefix);
  }

  // Knowledge Status section (from knowledge-curator)
  const knowledgeSection = await buildKnowledgeStatusSection(switchboardPath, log);
  if (knowledgeSection) {
    await upsertTodaySection('KNOWLEDGE', knowledgeSection, pathPrefix);
  }

  // Normalize
  await normalizeTodayNote(pathPrefix);
}

module.exports = {
  runDailyPipeline,
};


