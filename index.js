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
        
        if (events.length === 0) {
            return;
        }
        
        // Write header to file
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

        // Build and upsert a single MEETINGS section in chronological order
        let processedCount = 0;
        const meetingBlocks = [];
        for (const event of events) {
            if (shouldFilterEvent(event, config, eventsFilterRegex)) continue;
            const parsers = [parseGoogleHangout, parseZoom, parseOtherMeetingType];
            for (const parser of parsers) {
                const result = parser(event);
                if (result) {
                    let content = formatOutput(result, config);
                    // Inject per-person agenda items under meeting when cache is present
                    if (remindersCache && remindersCache.byPerson && Array.isArray(event.attendees)) {
                        const attendeeNames = event.attendees.map(a => a.displayName || '').filter(Boolean);
                        const attendeeEmails = event.attendees.map(a => a.email || '').filter(Boolean);
                        const agendaLines = [];
                        for (const [personId, info] of Object.entries(remindersCache.byPerson)) {
                            const aliasSet = new Set([info.name, ...(Array.isArray(info.aliases) ? info.aliases : [])]);
                            const emailSet = new Set(Array.isArray(info.emails) ? info.emails : []);
                            const matchedByEmail = attendeeEmails.some(e => emailSet.has(e));
                            const matchedByName = attendeeNames.some(n => aliasSet.has(n));
                            const matched = matchedByEmail || matchedByName;
                            if (matched && Array.isArray(info.items) && info.items.length) {
                                agendaLines.push(`\n- Agenda for [[${info.name}|${info.name}]]:`);
                                for (const it of info.items.slice(0, 5)) {
                                    agendaLines.push(`  - [ ] ${it.title} (${it.list}) <!--reminders-id:${it.id} list:${it.list} person-id:${personId}-->`);
                                }
                            }
                        }
                        if (agendaLines.length) {
                            content += `\n${agendaLines.join('\n')}`;
                        }
                    }
                    meetingBlocks.push({ start: result.fullStartDate, content });
                    processedCount++;
                    break;
                }
            }
        }
        meetingBlocks.sort((a, b) => a.start - b.start);
        const meetingsSection = ['## Meetings', meetingBlocks.map(b => b.content).join('\n')].filter(Boolean).join('\n');
        await upsertTodaySection('MEETINGS', meetingsSection, PATH_PREFIX);
        
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