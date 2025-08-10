const fs = require('fs');
const path = require('path');

/**
 * Load configuration from file or return defaults
 * @param {string} configPath - Path to config file
 * @returns {Object} - Configuration object
 */
function loadConfig(configPath) {
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        return getDefaultConfig();
    }
}

/**
 * Get default configuration
 * @returns {Object} - Default configuration
 */
function getDefaultConfig() {
    return {
        filters: {
            eventTitles: ['Tateki / <Owner>'],
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

/**
 * Create event filter regex patterns
 * @param {Array<string>} filterList - List of strings to filter
 * @returns {Array<RegExp>} - Array of regex patterns
 */
function createFilterRegex(filterList) {
    return filterList.map((blacklist) => {
        return new RegExp(".*" + blacklist + ".*", 'i');
    });
}

/**
 * Filter events based on configuration
 * @param {Object} event - Google Calendar event
 * @param {Object} config - Configuration object
 * @param {Array<RegExp>} filterRegex - Pre-compiled regex patterns
 * @returns {boolean} - true if event should be filtered out
 */
function shouldFilterEvent(event, config, filterRegex) {
    const summary = event && typeof event.summary === 'string' ? event.summary : '';
    for (let i = 0; i < filterRegex.length; i++) {
        if (filterRegex[i].test(summary)) {
            return true;
        }
    }
    
    if (config.filters.eventRegex) {
        const regex = new RegExp(config.filters.eventRegex, 'i');
        if (regex.test(summary)) {
            return true;
        }
    }
    
    if (!config.filters.includeAllDay && !event.start.dateTime) {
        return true;
    }
    
    if (event.start.dateTime && event.end.dateTime) {
        const duration = (new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000;
        if (duration < config.filters.minDurationMinutes) {
            return true;
        }
        if (config.filters.maxDurationHours && duration > config.filters.maxDurationHours * 60) {
            return true;
        }
    }
    
    if (config.filters.businessHoursOnly && event.start.dateTime) {
        const hour = new Date(event.start.dateTime).getHours();
        if (hour < config.filters.businessHours.start || hour >= config.filters.businessHours.end) {
            return true;
        }
    }

    return false;
}

module.exports = {
    loadConfig,
    getDefaultConfig,
    createFilterRegex,
    shouldFilterEvent
};