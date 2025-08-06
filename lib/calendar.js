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
    const dateNow = new Date();
    const timeZoneOffset = dateNow.getTimezoneOffset();
    
    const startDate = new Date(today.local.start());
    const endDate = new Date(today.local.end());
    
    startDate.setMinutes(startDate.getMinutes() + timeZoneOffset);
    endDate.setMinutes(endDate.getMinutes() + timeZoneOffset);
    
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        return response.data.items || [];
    } catch (error) {
        throw new Error(`Google Calendar API error: ${error.message}`);
    }
}

module.exports = {
    fetchTodayEvents
};