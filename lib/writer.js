const fs = require('fs');
const path = require('path');
const { formatMonthAndDay, formatHourAndMin } = require('./dateUtils');

/**
 * Write content to today's daily note file
 * @param {string} buffer - The content to write
 * @param {string} pathPrefix - The directory path for daily notes
 * @returns {Promise<void>}
 */
async function writeToFile(buffer, pathPrefix) {
    const todayDate = new Date();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    const fileName = `${todayDate.getFullYear()}-${month}-${day}.md`;
    const filePath = path.join(pathPrefix, fileName);
    
    try {
        await fs.promises.appendFile(filePath, buffer + '\n');
    } catch (error) {
        throw new Error(`Failed to write to daily note: ${error.message}`);
    }
}

/**
 * Format the daily note header
 * @param {Object} config - Configuration object
 * @returns {string} - Formatted header string
 */
function formatHeader(config) {
    const todayDate = new Date();
    const tomorrowDate = new Date(new Date().setDate(new Date().getDate() + 1));
    const yesterdayDate = new Date(new Date().setDate(new Date().getDate() - 1));
    
    let today_date = todayDate.getFullYear() + "-" + formatMonthAndDay(todayDate, "-");
    let yesterday_date = yesterdayDate.getFullYear() + '-' +
        formatMonthAndDay(yesterdayDate,'-');
    let tomorrow_date = '' + tomorrowDate.getFullYear() + '-' +
        formatMonthAndDay(tomorrowDate,'-');

    let MD_HEADER = `date: ${today_date}\n`;
    
    if (config.output.headerTemplate.includeNavigation) {
        MD_HEADER += `\n[[${yesterday_date}]] << Previous | Next >> [[${tomorrow_date}]]\n`;
    }
    
    if (config.output.headerTemplate.includeTasks && config.output.headerTemplate.taskCategories) {
        MD_HEADER += '\n# Tasks\n';
        
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
 * Format event output based on configuration
 * @param {Object} output - Parsed event data
 * @param {Object} config - Configuration object
 * @returns {string} - Formatted string
 */
function formatOutput(output, config) {
    const emoji = output.emoji || 
                  (config.formatting.includeEmojis && config.formatting.includeEmojis[output.type]) || 
                  '';
    
    let header = config.output.meetingTemplate.format
        .replace('{emoji}', emoji)
        .replace('{title}', output.callTitle)
        .replace('{tag}', 'mtg') + '\n';
    
    if (config.output.meetingTemplate.includeTime) {
        header += `- ${output.callStart} - ${output.callEnd}`;
    }
    
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
    
    let callLink = '';
    if (config.output.meetingTemplate.includeLink && config.formatting.showMeetingLinks && output.url !== '') {
        callLink = ` [${config.formatting.meetingLinkText}](${output.url})`;
    }
    
    let callNoteLink = '';
    if (config.output.meetingTemplate.includeNoteLink && output.url !== '') {
        callNoteLink = ` [[${output.fullStartDate.getFullYear()}-` + 
            formatMonthAndDay(output.fullStartDate, "-") + '-' +
            formatHourAndMin(output.fullStartDate, "") + "]]";
    }
    
    let location = '';
    if (output.url === '' && output.location !== '') {
        location = '\n - Location: ' + output.location;
    } else if (config.output.meetingTemplate.includeLocation && config.formatting.showLocation && output.location !== '') {
        location = ` ${output.location}`;
    }

    return header + attendeesStr + callLink + callNoteLink + location;
}

module.exports = {
    writeToFile,
    formatHeader,
    formatOutput
};