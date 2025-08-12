/**
 * Google Calendar to Obsidian Daily Notes
 * Modularized version
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const { authorize, resolveHome } = require('./lib/auth');
const { fetchTodayEvents } = require('./lib/calendar');
const { loadConfig, createFilterRegex, shouldFilterEvent } = require('./lib/config');
const { parseGoogleHangout, parseZoom, parseOtherMeetingType } = require('./lib/parsers');
const { writeToFile, formatHeader, formatOutput, upsertTodaySection, upsertTodayMeeting } = require('./lib/writer');

// Load environment variables
const dotenvPath = path.join(__dirname, '.env');
const dotenvResult = dotenv.config({ path: dotenvPath });
if (dotenvResult.error) {
    console.error('Error loading .env file:', dotenvResult.error);
    process.exit(1);
}

// Validate required environment variables
const TOKEN_PATH = process.env.GCAL_TOKEN_PATH;
const CREDS_PATH = process.env.GCAL_CREDS_PATH;
const PATH_PREFIX = process.env.DAILY_NOTE_PATH;

if (!TOKEN_PATH || !CREDS_PATH || !PATH_PREFIX) {
    console.error('Error: Required environment variables are missing.');
    console.error('Please ensure GCAL_TOKEN_PATH, GCAL_CREDS_PATH, and DAILY_NOTE_PATH are set in your .env file.');
    process.exit(1);
}

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const config = loadConfig(configPath);

// Use event filter from config, with env override
const EVENTS_FILTER = process.env.EVENTS_FILTER 
    ? process.env.EVENTS_FILTER.split(',').map(f => f.trim())
    : config.filters.eventTitles;

// Create filter regex patterns
const eventsFilterRegex = createFilterRegex(EVENTS_FILTER);

/**
 * Process a calendar event and write formatted output
 * @param {Object} event - Google Calendar event object
 * @returns {Promise<void>}
 */
async function processEvent(event) {
    if (shouldFilterEvent(event, config, eventsFilterRegex)) {
        return;
    }

    const parsers = [parseGoogleHangout, parseZoom, parseOtherMeetingType];

    // Try each parser until one returns a result
    for (const parser of parsers) {
        const result = parser(event);
        if (result) {
            const formattedOutput = formatOutput(result, config);
            await writeToFile(formattedOutput, PATH_PREFIX);
            return;
        }
    }
}

/**
 * Main application entry point
 * @returns {Promise<void>}
 */
async function main() {
    try {
        // Load client secrets
        const credentialsPath = resolveHome(CREDS_PATH);
        const content = await fs.promises.readFile(credentialsPath, 'utf8');
        const credentials = JSON.parse(content);
        
        // Authorize and get OAuth2 client
        const auth = await authorize(credentials, TOKEN_PATH);
        
        // Fetch today's events
        const events = await fetchTodayEvents(auth);
        
        // Always write header even if there are no events today
        const header = formatHeader(config, PATH_PREFIX);
        await upsertTodaySection('HEADER', header, PATH_PREFIX);
        
        // Optionally load reminders cache for agendas
        let remindersCache = null;
        try {
            const vaultRoot = path.resolve(PATH_PREFIX, '..');
            const cachePath = path.join(vaultRoot, 'reminders', 'reminders_cache.json');
            const raw = await fs.promises.readFile(cachePath, 'utf8');
            remindersCache = JSON.parse(raw);
        } catch (_) {}

        // Ensure a Meetings heading exists; insert once if missing
        try {
            const todayPath = path.join(PATH_PREFIX, new Date().toISOString().slice(0,10) + '.md');
            let txt = '';
            try { txt = await fs.promises.readFile(todayPath, 'utf8'); } catch {}
            if (!/\n##\s*Meetings\b/m.test('\n' + txt)) {
                await upsertTodaySection('MEETINGS', '## Meetings', PATH_PREFIX);
                // refresh txt
                try { txt = await fs.promises.readFile(todayPath, 'utf8'); } catch {}
            }
            // Clean up legacy and unmarked content both outside and inside the MEETINGS block
            if (txt) {
                const begin = '<!-- BEGIN MEETINGS -->';
                const end = '<!-- END MEETINGS -->';
                const beginIdx = txt.indexOf(begin);
                const endIdx = txt.indexOf(end);
                let kept = txt;
                let block = '';
                if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
                    block = txt.slice(beginIdx, endIdx + end.length);
                    kept = txt.slice(0, beginIdx) + '[[[MEET_BLOCK]]]' + txt.slice(endIdx + end.length);
                }
                const cleaned = kept.replace(/(\n##\s*Meetings\s*\n)[\s\S]*?(?=(\n##\s|\n<!-- BEGIN |$))/gm, '$1');
                let restored = cleaned.replace('[[[MEET_BLOCK]]]', block);
                // Also normalize the content INSIDE the MEETINGS block to only keep header and per-meeting markers
                if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
                    const inner = txt.slice(beginIdx + begin.length, endIdx);
                    const headerMatch = inner.match(/\n##\s*Meetings\s*\n/);
                    const meetings = inner.match(/<!--\s*BEGIN MEETING\s+[\s\S]*?<!--\s*END MEETING\s+\d{4}-\d{2}-\d{2}-\d{4}\s*-->/g) || [];
                    const rebuiltInner = `\n## Meetings\n\n${meetings.join('\n\n')}\n`;
                    restored = txt.slice(0, beginIdx + begin.length) + rebuiltInner + txt.slice(endIdx);
                }
                if (restored !== txt) await fs.promises.writeFile(todayPath, restored, 'utf8');
            }
        } catch {}

        // Upsert each meeting independently to avoid overwriting user notes
        // Sort by start time ascending, then insert in reverse to maintain ascending order under the heading
        const agendasInjectedForPerson = new Set();
        // Assistant emails to exclude from agenda injection (comma-separated env; default includes mika@ito.com)
        const assistantEmails = new Set(
            (process.env.ASSISTANT_EMAILS ? process.env.ASSISTANT_EMAILS.split(',') : ['mika@ito.com'])
                .map(e => String(e || '').trim().toLowerCase()).filter(Boolean)
        );
        const sortedEvents = [...events].sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date));
        for (const event of sortedEvents.reverse()) {
            if (shouldFilterEvent(event, config, eventsFilterRegex)) continue;
            const parsers = [parseGoogleHangout, parseZoom, parseOtherMeetingType];
            for (const parser of parsers) {
                const result = parser(event);
                if (result) {
                    let content = formatOutput(result, config);
                    // Inject per-person agenda items under meeting when cache is present
                    if (remindersCache && remindersCache.byPerson && Array.isArray(event.attendees)) {
                        const attendeeNames = event.attendees.map(a => a.displayName || '').filter(Boolean);
                        const attendeeEmails = event.attendees.map(a => String(a.email || '').toLowerCase()).filter(Boolean);
                        const agendaLines = [];
                        for (const [personKey, info] of Object.entries(remindersCache.byPerson)) {
                            const aliasSet = new Set([info.name, ...(Array.isArray(info.aliases) ? info.aliases : [])]);
                            const emailSet = new Set((Array.isArray(info.emails) ? info.emails : []).map(e => String(e || '').toLowerCase()));
                            const matchedByEmail = attendeeEmails.some(e => emailSet.has(e));
                            const matchedByName = attendeeNames.some(n => aliasSet.has(n));
                            const matched = matchedByEmail || matchedByName;
                            // Skip agenda injection for assistants (by email match OR by exact name match among attendees)
                            const isAssistant = attendeeEmails.some(e => assistantEmails.has(e)) || attendeeNames.some(n => assistantEmails.has(String(n || '').toLowerCase()));
                            const skipAsAssistant = isAssistant;
                            if (matched && !skipAsAssistant && !agendasInjectedForPerson.has(personKey) && Array.isArray(info.items) && info.items.length) {
                                agendasInjectedForPerson.add(personKey);
                                agendaLines.push(`\n- Agenda for [[${info.name}|${info.name}]]:`);
                                for (const it of info.items.slice(0, 5)) {
                                    agendaLines.push(`  - [ ] ${it.title} (${it.list}) <!--reminders-id:${it.id} list:${it.list} person:${personKey}-->`);
                                }
                            }
                        }
                        if (agendaLines.length) {
                            content += `\n${agendaLines.join('\n')}`;
                        }
                    }
                    // Add a convenient notes bullet line after the meeting details
                    content += `\n - `;
                    const ymd = result.fullStartDate.getFullYear() + '-' +
                      String(result.fullStartDate.getMonth()+1).padStart(2,'0') + '-' +
                      String(result.fullStartDate.getDate()).padStart(2,'0') + '-' +
                      String(result.fullStartDate.getHours()).padStart(2,'0') +
                      String(result.fullStartDate.getMinutes()).padStart(2,'0');
                    await upsertTodayMeeting(ymd, content, PATH_PREFIX);
                    break;
                }
            }
        }
        // Reorder existing per-meeting blocks inside MEETINGS by timestamp ascending (earliest at top)
        try {
            const todayPath = path.join(PATH_PREFIX, new Date().toISOString().slice(0,10) + '.md');
            let txt = '';
            try { txt = await fs.promises.readFile(todayPath, 'utf8'); } catch {}
            const begin = '<!-- BEGIN MEETINGS -->';
            const end = '<!-- END MEETINGS -->';
            const b = txt.indexOf(begin); const e = txt.indexOf(end);
            if (b !== -1 && e !== -1 && e > b) {
                const before = txt.slice(0, b + begin.length);
                const inner = txt.slice(b + begin.length, e);
                const after = txt.slice(e);
                const blocks = [];
                const re = /(<!--\s*BEGIN MEETING\s+(\d{4}-\d{2}-\d{2}-\d{4})\s*-->[\s\S]*?<!--\s*END MEETING\s+\2\s*-->)/g;
                let m;
                while ((m = re.exec(inner)) !== null) {
                    blocks.push({ key: m[2], block: m[1] });
                }
                if (blocks.length) {
                    blocks.sort((a, b) => a.key.localeCompare(b.key));
                    const rebuilt = ['\n## Meetings\n', ...blocks.map(x => x.block)].join('\n') + '\n';
                    const out = before + rebuilt + after;
                    if (out !== txt) await fs.promises.writeFile(todayPath, out, 'utf8');
                }
            }
        } catch {}
        // Do not rewrite the full Meetings block; per-meeting upserts preserve user notes
        
        // Append Reminders tasks query at the very bottom so Tasks plugin shows macOS reminders
        const remindersQuery = [
            '',
            '## Reminders (Inbox only)',
            '![[reminders_inbox.md]]'
        ].join('\n');
        await upsertTodaySection('REMINDERS', remindersQuery, PATH_PREFIX);

        // silent by default
        
    } catch (error) {
        if (process.env.VERBOSE === 'true') {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

// Start the application
main();