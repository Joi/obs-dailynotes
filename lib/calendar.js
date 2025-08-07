const { google } = require('googleapis');
const { getTodayBoundaries } = require('./dateUtils');

/**
 * Lists all events for today on the user's primary calendar
 * @param {google.auth.OAuth2} auth - An authorized OAuth2 client
 * @returns {Promise<Array>} - Array of calendar events
 */
async function fetchTodayEvents(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    const today = getTodayBoundaries();
    // Use the local day boundaries directly; do not apply manual offset adjustments
    const timeMin = today.local.start();
    const timeMax = today.local.end();
    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: systemTimeZone,
        });
        
        return response.data.items || [];
    } catch (error) {
        throw new Error(`Google Calendar API error: ${error.message}`);
    }
}

module.exports = {
    fetchTodayEvents
};