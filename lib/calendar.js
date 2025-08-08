const { google } = require('googleapis');
const { getTodayBoundaries, getRFC3339LocalDayBounds } = require('./dateUtils');

/**
 * Lists all events for today on the user's primary calendar
 * @param {google.auth.OAuth2} auth - An authorized OAuth2 client
 * @returns {Promise<Array>} - Array of calendar events
 */
async function fetchTodayEvents(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    const bounds = getRFC3339LocalDayBounds();
    const timeMin = bounds.start; // RFC3339 with local offset
    const timeMax = bounds.end;   // RFC3339 with local offset
    
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const items = response.data.items || [];
        // Extra safety: filter items to local day window using start.dateTime/date
        const startOfDay = new Date(bounds.start);
        const endOfDay = new Date(bounds.end);
        const filtered = items.filter(ev => {
            const startStr = (ev.start && (ev.start.dateTime || ev.start.date)) || null;
            if (!startStr) return false;
            const start = new Date(startStr);
            return start >= startOfDay && start <= endOfDay;
        });
        return filtered;
    } catch (error) {
        throw new Error(`Google Calendar API error: ${error.message}`);
    }
}

module.exports = {
    fetchTodayEvents
};