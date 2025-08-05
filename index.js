/**
 * @license
 * Copyright Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START calendar_quickstart]
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// Load environment variables from the script's directory
const dotenvPath = path.join(__dirname, '.env');
const dotenvResult = require('dotenv').config({ path: dotenvPath });
if (dotenvResult.error) {
    console.error('Error loading .env file:', dotenvResult.error);
    process.exit(1);
}


// Load configuration
let config = {};
try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
} catch (error) {
    // Use default config if file doesn't exist
    config = {
        filters: {
            eventTitles: ['Tateki / Joi'],
            includeAllDay: false,
            minDurationMinutes: 0
        },
        formatting: {
            timeFormat24h: false,
            showAttendees: true,
            maxAttendeesShown: 10,
            showMeetingLinks: true,
            meetingLinkText: "Call Link",
            showLocation: true,
            includeEmojis: {}
        },
        output: {
            headerTemplate: {
                includeNavigation: true,
                includeTasks: true,
                taskCategories: [
                    {
                        name: "ASAP",
                        query: "not done\nheading includes ASAP"
                    },
                    {
                        name: "Email for Reply",
                        query: "not done\nheading includes Email for Reply"
                    },
                    {
                        name: "Some Day",
                        query: "not done\nheading includes Some Day"
                    }
                ]
            },
            meetingTemplate: {
                format: "### {emoji} {title} #{tag}",
                includeTime: true,
                includeAttendees: true,
                includeLink: true,
                includeNoteLink: true,
                includeLocation: true
            }
        }
    };
}

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = process.env.GCAL_TOKEN_PATH;
const CREDS_PATH = process.env.GCAL_CREDS_PATH;
const PATH_PREFIX = process.env.DAILY_NOTE_PATH;

// Use event filter from config, with env override
const EVENTS_FILTER = process.env.EVENTS_FILTER 
  ? process.env.EVENTS_FILTER.split(',').map(f => f.trim())
  : config.filters.eventTitles;

// Validate required environment variables
if (!TOKEN_PATH || !CREDS_PATH) {
    console.error('Error: Required environment variables are missing.');
    console.error('Please ensure GCAL_TOKEN_PATH and GCAL_CREDS_PATH are set in your .env file.');
    process.exit(1);
}

const today = {
    iso: {
        start: () => new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        now: () => new Date().toISOString(),
        end: () => new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
    },
    local: {
        start: () => new Date(new Date(new Date().setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString(),
        now: () => new Date(new Date().toString().split('GMT')[0] + ' UTC').toISOString(),
        end: () => new Date(new Date(new Date().setHours(23, 59, 59, 999)).toString().split('GMT')[0] + ' UTC').toISOString()
    }
}
const dateNow = new Date();
const timeZoneOffset = dateNow.getTimezoneOffset();

const events_filter_regex = EVENTS_FILTER.map((blacklist, i) => {
    return new RegExp(".*" + blacklist + ".*", 'i');
});

//Utility to format ~
function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}

/**
 * Main application entry point
 * @returns {Promise<void>}
 */
async function main() {
    try {
        // Load client secrets from a local file
        const credentialsPath = resolveHome(CREDS_PATH);
        const content = await fs.promises.readFile(credentialsPath, 'utf8');
        const credentials = JSON.parse(content);
        
        // Authorize and get OAuth2 client
        const auth = await authorize(credentials);
        
        // List and process events
        await listEvents(auth);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Start the application
main();

/**
 * Write content to today's daily note file
 * @param {string} buffer - The content to write
 * @returns {Promise<void>}
 */
async function writeToFile(buffer) {
    const todayDate = new Date();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    const fileName = `${todayDate.getFullYear()}-${month}-${day}.md`;
    const filePath = path.join(PATH_PREFIX, fileName);
    
    try {
        await fs.promises.appendFile(filePath, buffer + '\n');
    } catch (error) {
        throw new Error(`Failed to write to daily note: ${error.message}`);
    }
}

/**
 * Create an OAuth2 client with the given credentials
 * @param {Object} credentials The authorization client credentials.
 * @returns {Promise<google.auth.OAuth2>} The authorized OAuth2 client
 */
async function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    try {
        // Check if we have previously stored a token
        const tokenPath = resolveHome(TOKEN_PATH);
        const token = await fs.promises.readFile(tokenPath, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (err) {
        // No token found, get a new one
        return await getAccessToken(oAuth2Client);
    }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    
    // Create readline interface for user input
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    try {
        // Wait for user to enter the code
        const code = await new Promise((resolve) => {
            rl.question('Enter the code from that page here: ', resolve);
        });
        rl.close();
        
        // Exchange code for token
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Store the token to disk for later program executions
        const tokenPath = resolveHome(TOKEN_PATH);
        const tokenDir = path.dirname(tokenPath);
        
        // Ensure directory exists
        await fs.promises.mkdir(tokenDir, { recursive: true });
        
        // Write token with secure permissions
        await fs.promises.writeFile(tokenPath, JSON.stringify(tokens), {
            mode: 0o600 // Read/write for owner only
        });
        // Token stored successfully
        
        return oAuth2Client;
    } catch (error) {
        rl.close();
        throw new Error(`Error retrieving access token: ${error.message}`);
    }
}

/**
 * Find an URL inside a string and potentially find a token in it
 * @param {String} text the text search the URL into
 * @param {String} substr the token to search for
 */
function findUrlWithHint(text, substr) {
    let urlRegex = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

    let ret = text.match(urlRegex);
    if (ret == null || ret == undefined)
        return '';

    if (substr != undefined) {
        for (var i = 0; i < ret.length; i++) {
            if (ret[i].indexOf(substr) != -1)
                return ret[i];
        }
        return '';
    } else
        return ret[0];
}

/** 
 * Make sure the format is HH + join token + MM
 * @param {Date} date the date to format
 * @param {String} join_token the join token
 */
function formatHourAndMin(date, join_token='') {
    return (date.getHours() < 10 ? '0' : '') + date.getHours()
        + join_token + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
}

/**
 * Make sure the format is MM + join token + DD
 * @param {Date} date the date to format
 * @param {String} join_token the join token
 */
function formatMonthAndDay(date, join_token='') {
    let month = date.getMonth() + 1;
    let day = date.getDate();

    return (month < 10 ? '0' : '') + month + join_token + 
        (day < 10 ? '0' : '') + day;
}
/**
 * Parse an invite with a google hangout link
 * 
 * @return {object} None or an object with callTitle, callTime, attendees and 
 * url props
 */
function parseZoom(event) {
    let output = {
        'callTitle': '', 'fullStartDate':'', 'callStart': '', 'callEnd': '',
        'attendees': [], 'url': '', 'type': 'videoCall', 'location': ''
    };

    output.callTitle = event.summary;

    let tmpDate = new Date(event.start.dateTime || event.start.date);
    output.fullStartDate = tmpDate;
    output.callStart = formatHourAndMin(tmpDate, ":");
    tmpDate = new Date(event.end.dateTime || event.end.date);
    output.callEnd = formatHourAndMin(tmpDate, ":");

    if (event.attendees) {
        event.attendees.map((attendee, i) => {
            output.attendees.push(attendee.displayName || attendee.email);
        });
    } else
        // return undefined;
        output.attendees.push('no attendees listed');

    if (event.location && event.location.indexOf('http') != -1)
        output.url = findUrlWithHint(event.location, 'zoom');
    if (output.url.indexOf('zoom') == -1 && event.description &&
        event.description.indexOf('http') != -1)
        output.url = findUrlWithHint(event.description, 'zoom');
    if (output.url.indexOf('zoom') == -1 && event.summary &&
        event.summary.indexOf('http') != -1)
        output.url = findUrlWithHint(event.summary, 'zoom');
    
    if (output.url == '')
        return undefined;
    
    output.location = '';

    return output;
}

/**
 * 
 * @param {} event 
 */
function parseGoogleHangout(event) {
    let output = {
        'callTitle': '', 'fullStartDate':'', 'callStart': '', 'callEnd': '',
        'attendees': [], 'url': '', 'type': 'videoCall', 'location': ''
    };
    if (event.hangoutLink == undefined)
        return undefined;

    output.callTitle = event.summary;
    output.url = event.hangoutLink;

    let tmpDate = new Date(event.start.dateTime || event.start.date);
    output.fullStartDate = tmpDate;
    output.callStart = formatHourAndMin(tmpDate, ":");
    tmpDate = new Date(event.end.dateTime || event.end.date);
    output.callEnd = formatHourAndMin(tmpDate, ":");

    event.attendees.map((attendee, i) => {
        output.attendees.push(attendee.displayName || attendee.email);
    });
    
    output.location = '';

    return output;
}

function parseOtherMeetingType(event) {
    let output = {
        'callTitle': '', 'fullStartDate': '', 'callStart': '', 'callEnd': '',
        'attendees': [], 'url': '', 'location' : '', 'type': 'inPerson'
    };

    output.callTitle = event.summary;

    let tmpDate = new Date(event.start.dateTime || event.start.date);
    output.fullStartDate = tmpDate;
    output.callStart = formatHourAndMin(tmpDate, ":");
    tmpDate = new Date(event.end.dateTime || event.end.date);
    output.callEnd = formatHourAndMin(tmpDate, ":");

    if (event.attendees) {
        event.attendees.map((attendee, i) => {
            output.attendees.push(attendee.displayName || attendee.email);
        });
    } else
        return undefined;

    if (event.location && event.location.indexOf('http') != -1)
        output.url = findUrlWithHint(event.location);
    if (output.url.indexOf('http') == -1 && event.description &&
        event.description.indexOf('http') != -1)
        output.url = findUrlWithHint(event.description);
    if (output.url.indexOf('http') == -1 && event.summary &&
        event.summary.indexOf('http') != -1)
        output.url = findUrlWithHint(event.summary);

        // If there is no URL, add another line showing the physical location
    if (output.url == '') {
        output.location = event.location || '';
    } else {
        output.location = '';
    }

    return output;
}

/**
 * Filter out events you don't want to see
 * 
 * @param {} event 
 */ 

/**
 * Filter events based on configuration
 * @param {Object} event - Google Calendar event
 * @returns {boolean} - true if event should be filtered out
 */
function filterEvents(event) {
    // Check title filters
    for (let i = 0; i < events_filter_regex.length; i++) {
        if (events_filter_regex[i].test(event.summary)) {
            return true;
        }
    }
    
    // Check regex filter if configured
    if (config.filters.eventRegex) {
        const regex = new RegExp(config.filters.eventRegex, 'i');
        if (regex.test(event.summary)) {
            return true;
        }
    }
    
    // Filter all-day events if configured
    if (!config.filters.includeAllDay && !event.start.dateTime) {
        return true;
    }
    
    // Filter by duration
    if (event.start.dateTime && event.end.dateTime) {
        const duration = (new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000; // minutes
        if (duration < config.filters.minDurationMinutes) {
            return true;
        }
        if (duration > config.filters.maxDurationHours * 60) {
            return true;
        }
    }
    
    // Filter by business hours if configured
    if (config.filters.businessHoursOnly && event.start.dateTime) {
        const hour = new Date(event.start.dateTime).getHours();
        if (hour < config.filters.businessHours.start || hour >= config.filters.businessHours.end) {
            return true;
        }
    }

    return false;
}

/**
 * Format event output based on configuration
 * @param {Object} output - Parsed event data
 * @returns {string} - Formatted string
 */
function formatOutput(output) {
    const emoji = output.emoji || 
                  (config.formatting.includeEmojis && config.formatting.includeEmojis[output.type]) || 
                  '';
    
    // Format the header using template
    let header = config.output.meetingTemplate.format
        .replace('{emoji}', emoji)
        .replace('{title}', output.callTitle)
        .replace('{tag}', 'mtg') + '\n';
    
    // Add time if configured
    if (config.output.meetingTemplate.includeTime) {
        header += `- ${output.callStart} - ${output.callEnd}`;
    }
    
    // Add attendees if configured
    let attendeesStr = '';
    if (config.output.meetingTemplate.includeAttendees && config.formatting.showAttendees && output.attendees.length > 0) {
        const attendeesToShow = output.attendees.slice(0, config.formatting.maxAttendeesShown);
        const moreCount = output.attendees.length - attendeesToShow.length;
        attendeesStr = ` (${attendeesToShow.join(', ')}`;
        if (moreCount > 0) {
            attendeesStr += ` +${moreCount} more`;
        }
        attendeesStr += ')';
    }
    
    // Add meeting link if configured
    let callLink = '';
    if (config.output.meetingTemplate.includeLink && config.formatting.showMeetingLinks && output.url !== '') {
        callLink = ` [${config.formatting.meetingLinkText}](${output.url})`;
    }
    
    // Add note link if configured
    let callNoteLink = '';
    if (config.output.meetingTemplate.includeNoteLink && output.url !== '') {
        callNoteLink = ` [[${output.fullStartDate.getFullYear()}-` + 
            formatMonthAndDay(output.fullStartDate, "-") + '-' +
            formatHourAndMin(output.fullStartDate, "") + "]]";
    }
    
    // Add location if configured
    let location = '';
    if (output.url === '' && output.location !== '') {
        location = '\n - Location: ' + output.location;
    } else if (config.output.meetingTemplate.includeLocation && config.formatting.showLocation && output.location !== '') {
        location = ` ${output.location}`;
    }

    return header + attendeesStr + callLink + callNoteLink + location;
}

/**
 * Process a calendar event and write formatted output
 * @param {Object} event - Google Calendar event object
 * @returns {Promise<void>}
 */
async function processEvent(event) {
    if (filterEvents(event)) {
        return;
    }

    const parsers = [parseGoogleHangout, parseZoom, parseOtherMeetingType];

    // Try each parser until one returns a result
    for (const parser of parsers) {
        const result = parser(event);
        if (result) {
            await writeToFile(formatOutput(result));
            return;
        }
    }
    
    // Log unprocessed events for debugging (commented out)
    // const start = event.start.dateTime || event.start.date;
    // console.log(`Unprocessed event: ${start} - ${event.summary}`);
}

function formatHeader() {
    const todayDate = new Date();
    const tomorrowDate = new Date(new Date().setDate(new Date().getDate() + 1));
    const yesterdayDate = new Date(new Date().setDate(new Date().getDate() - 1));
    
    let today_date = todayDate.getFullYear() + "-" + formatMonthAndDay(todayDate, "-");
    let yesterday_date = yesterdayDate.getFullYear() + '-' +
        formatMonthAndDay(yesterdayDate,'-');
    let tomorrow_date = '' + tomorrowDate.getFullYear() + '-' +
        formatMonthAndDay(tomorrowDate,'-');

    let MD_HEADER = `date: ${today_date}\n`;
    
    // Add navigation if configured
    if (config.output.headerTemplate.includeNavigation) {
        MD_HEADER += `\n[[${yesterday_date}]] << Previous | Next >> [[${tomorrow_date}]]\n`;
    }
    
    // Add tasks section if configured
    if (config.output.headerTemplate.includeTasks && config.output.headerTemplate.taskCategories) {
        MD_HEADER += '\n# Tasks\n';
        
        // Add each configured task category
        for (const category of config.output.headerTemplate.taskCategories) {
            MD_HEADER += `### ${category.name}\n`;
            MD_HEADER += '```tasks\n';
            MD_HEADER += `${category.query}\n`;
            MD_HEADER += '```\n';
        }
    }
    
    MD_HEADER += '## Meetings';
    return MD_HEADER;
}

/**
 * Lists all events for today on the user's primary calendar
 * @param {google.auth.OAuth2} auth - An authorized OAuth2 client
 * @returns {Promise<void>}
 */
async function listEvents(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Calculate date range for today
    const startDate = new Date(today.local.start());
    const endDate = new Date(today.local.end());
    
    // Adjust for local timezone offset
    startDate.setMinutes(startDate.getMinutes() + timeZoneOffset);
    endDate.setMinutes(endDate.getMinutes() + timeZoneOffset);
    
    try {
        // Fetch events from Google Calendar
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        const events = response.data.items || [];
        
        if (events.length === 0) {
            return;
        }
        
        // Process events
        
        // Write header to file
        await writeToFile(formatHeader());
        
        // Process each event
        let processedCount = 0;
        for (const event of events) {
            try {
                await processEvent(event);
                processedCount++;
            } catch (error) {
            }
        }
        
        // Processing complete
        
    } catch (error) {
        throw new Error(`Google Calendar API error: ${error.message}`);
    }
}