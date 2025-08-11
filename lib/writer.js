const fs = require('fs');
const path = require('path');
const { formatMonthAndDay, formatHourAndMin } = require('./dateUtils');

function getTodayFilePath(pathPrefix) {
    const todayDate = new Date();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    const fileName = `${todayDate.getFullYear()}-${month}-${day}.md`;
    return path.join(pathPrefix, fileName);
}

/**
 * Replace or insert a named section in today's note, non-destructively.
 * Section is delimited by HTML comments, and only that block is replaced.
 * If missing, the section is inserted (at top for HEADER, bottom otherwise).
 */
async function upsertTodaySection(sectionName, content, pathPrefix) {
    const filePath = getTodayFilePath(pathPrefix);
    const startMarker = `<!-- BEGIN ${sectionName} -->`;
    const endMarker = `<!-- END ${sectionName} -->`;
    const sectionBlock = `${startMarker}\n${content}\n${endMarker}`;

    await fs.promises.mkdir(pathPrefix, { recursive: true });
    let existing = '';
    try {
        existing = await fs.promises.readFile(filePath, 'utf8');
    } catch (_) {
        existing = '';
    }

    // If there are multiple existing blocks, remove them all before inserting a fresh one
    const blockRegexGlobal = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}\\n?`, 'g');
    if (blockRegexGlobal.test(existing)) {
        existing = existing.replace(blockRegexGlobal, '');
    }

    // Extra hardening for HEADER: strip any legacy header leftovers before inserting fresh block
    if (sectionName === 'HEADER') {
        // Remove any legacy, unmarked header chunks (date... up to meetings/next marker)
        const legacyHeaderAll = /(date:\s*\d{4}-\d{2}-\d{2}[\s\S]*?)(?=\n## Meetings|\n<!-- BEGIN MEETINGS -->|\n<!-- BEGIN REMINDERS -->|$)/gm;
        existing = existing.replace(legacyHeaderAll, '');
    }

    // Insert or migrate legacy section
    if (sectionName === 'HEADER') {
        // Try to replace legacy header (from date: ... through first '## Meetings') if present
        const legacyHeaderRegex = /(date:\s*\d{4}-\d{2}-\d{2}[\s\S]*?)(?=\n## Meetings|\n<!-- BEGIN MEETINGS -->)/m;
        if (legacyHeaderRegex.test(existing)) {
            const newContent = existing.replace(legacyHeaderRegex, sectionBlock);
            await fs.promises.writeFile(filePath, newContent, 'utf8');
            return;
        }
        const newContent = sectionBlock + (existing ? `\n${existing}` : '\n');
        await fs.promises.writeFile(filePath, newContent, 'utf8');
    } else if (sectionName === 'REMINDERS') {
        // Replace any legacy reminders section heuristically
        const legacyRemindersRegex = /(## Reminders \(macOS\)[\s\S]*?)(?=(\n## |\n### |\n<!-- BEGIN REMINDERS -->|\n$))/m;
        if (legacyRemindersRegex.test(existing)) {
            const newContent = existing.replace(legacyRemindersRegex, sectionBlock + '\n');
            await fs.promises.writeFile(filePath, newContent, 'utf8');
            return;
        }
        // Trim any trailing whitespace/newlines so we insert with exactly one blank line separation
        const withoutTrailing = existing.replace(/\s+$/, '');
        const prefix = withoutTrailing ? withoutTrailing + '\n' : '';
        const newContent = prefix + sectionBlock + '\n';
        await fs.promises.writeFile(filePath, newContent, 'utf8');
    } else if (sectionName === 'MEETINGS') {
        // Remove any legacy, unmarked meetings section to avoid duplicate headings
        const legacyMeetingsAll = /(\n)?## Meetings[\s\S]*?(?=(\n## |\n<!-- BEGIN |\n$))/gm;
        existing = existing.replace(legacyMeetingsAll, '');

        // If HEADER exists, insert meetings block immediately after it; otherwise append
        const headerBlockRegex = /<!-- BEGIN HEADER -->[\s\S]*?<!-- END HEADER -->/m;
        if (headerBlockRegex.test(existing)) {
            const newContent = existing.replace(headerBlockRegex, (m) => `${m}\n${sectionBlock}`);
            await fs.promises.writeFile(filePath, newContent, 'utf8');
            return;
        }
        // Ensure single blank line before appending when not inserted after header
        const withoutTrailing = existing.replace(/\s+$/, '');
        const prefix = withoutTrailing ? withoutTrailing + '\n' : '';
        const newContent = prefix + sectionBlock + '\n';
        await fs.promises.writeFile(filePath, newContent, 'utf8');
    } else {
        const withoutTrailing = existing.replace(/\s+$/, '');
        const prefix = withoutTrailing ? withoutTrailing + '\n' : '';
        const newContent = prefix + sectionBlock + '\n';
        await fs.promises.writeFile(filePath, newContent, 'utf8');
    }
}

/** Legacy append: retained for compatibility where needed */
async function writeToFile(buffer, pathPrefix) {
    const filePath = getTodayFilePath(pathPrefix);
    await fs.promises.mkdir(pathPrefix, { recursive: true });
    await fs.promises.appendFile(filePath, buffer + '\n');
}

/**
 * Format the daily note header
 * @param {Object} config - Configuration object
 * @param {string} pathPrefix - Path to daily notes directory
 * @returns {string} - Formatted header string
 */
function formatHeader(config, pathPrefix) {
    const todayDate = new Date();
    const tomorrowDate = new Date(new Date().setDate(new Date().getDate() + 1));
    const yesterdayDate = new Date(new Date().setDate(new Date().getDate() - 1));
    
    let today_date = todayDate.getFullYear() + "-" + formatMonthAndDay(todayDate, "-");
    let yesterday_date = yesterdayDate.getFullYear() + '-' +
        formatMonthAndDay(yesterdayDate,'-');
    let tomorrow_date = '' + tomorrowDate.getFullYear() + '-' +
        formatMonthAndDay(tomorrowDate,'-');

    // Timezone metadata
    const tzName = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Local';
    const offsetMinutes = -todayDate.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const tzHours = String(Math.floor(abs / 60)).padStart(2, '0');
    const tzMins = String(abs % 60).padStart(2, '0');
    const tzOffset = `UTC${sign}${tzHours}:${tzMins}`;

    let MD_HEADER = `date: ${today_date}\ntimezone: ${tzName} (${tzOffset})\n`;
    
    if (config.output.headerTemplate.includeNavigation) {
        MD_HEADER += `\n[[${yesterday_date}]] << Previous | Next >> [[${tomorrow_date}]]\n`;
    }
    
    // Include today's priorities/urgent todos if the file exists
    const todoTodayPath = path.join(pathPrefix, 'reminders', 'todo-today.md');
    try {
        const todoContent = fs.readFileSync(todoTodayPath, 'utf8');
        if (todoContent && todoContent.trim()) {
            MD_HEADER += `\n${todoContent}\n`;
        }
    } catch (e) {
        // File doesn't exist or can't be read, skip it
    }
    
    // Removed Tasks plugin integration from header
    
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
        // Render attendees as Obsidian wikilinks to root-level person pages
        const attendeesLinked = output.attendees.map((name) => {
            const safe = String(name || '').replace(/[\[\]|\|]/g, '-');
            return `[[${safe}|${name}]]`;
        });
        const attendeesToShow = attendeesLinked.slice(0, config.formatting.maxAttendeesShown);
        const moreCount = attendeesLinked.length - attendeesToShow.length;
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
    upsertTodaySection,
    getTodayFilePath,
    formatHeader,
    formatOutput
};

/**
 * Insert or replace a single meeting block identified by meetingKey.
 * If not present, inserts just after the first '## Meetings' heading, else appends to end.
 */
async function upsertTodayMeeting(meetingKey, content, pathPrefix) {
    const filePath = getTodayFilePath(pathPrefix);
    const startMarker = `<!-- BEGIN MEETING ${meetingKey} -->`;
    const endMarker = `<!-- END MEETING ${meetingKey} -->`;
    const block = `${startMarker}\n${content}\n${endMarker}`;

    await fs.promises.mkdir(pathPrefix, { recursive: true });
    let existing = '';
    try {
        existing = await fs.promises.readFile(filePath, 'utf8');
    } catch (_) {
        existing = '';
    }

    if (existing.includes(startMarker) && existing.includes(endMarker)) {
        const newContent = existing.replace(
            new RegExp(`${startMarker}[\s\S]*?${endMarker}`, 'm'),
            block
        );
        await fs.promises.writeFile(filePath, newContent, 'utf8');
        return;
    }

    // Insert after '## Meetings' heading if present
    const meetingsHeadingIdx = existing.indexOf('\n## Meetings');
    if (meetingsHeadingIdx !== -1) {
        const insertPos = meetingsHeadingIdx + 1; // after leading newline
        // Find end of that heading line
        const lineEnd = existing.indexOf('\n', insertPos + '## Meetings'.length);
        const before = existing.slice(0, lineEnd + 1);
        const after = existing.slice(lineEnd + 1);
        const newContent = `${before}\n${block}\n${after}`;
        await fs.promises.writeFile(filePath, newContent, 'utf8');
        return;
    }

    // Fallback: append to end
    const newContent = (existing ? existing + '\n' : '') + block + '\n';
    await fs.promises.writeFile(filePath, newContent, 'utf8');
}

module.exports.upsertTodayMeeting = upsertTodayMeeting;