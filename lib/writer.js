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

    // Extra hardening for HEADER: strip any legacy header/meatings leftovers before inserting fresh block
    if (sectionName === 'HEADER') {
        // Remove any legacy, unmarked header chunks (date... up to meetings/next marker)
        const legacyHeaderAll = /(date:\s*\d{4}-\d{2}-\d{2}[\s\S]*?)(?=\n## Meetings|\n<!-- BEGIN MEETINGS -->|\n<!-- BEGIN REMINDERS -->|$)/gm;
        existing = existing.replace(legacyHeaderAll, '');
        // Remove any stray '## Meetings' headings and their legacy content until next marker/heading/EOF
        const strayMeetingsAll = /(\n)?## Meetings[\s\S]*?(?=(\n## |\n<!-- BEGIN |\n$))/gm;
        existing = existing.replace(strayMeetingsAll, '');
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
        const newContent = (existing ? existing + '\n' : '') + sectionBlock + '\n';
        await fs.promises.writeFile(filePath, newContent, 'utf8');
    } else if (sectionName === 'MEETINGS') {
        // Place meetings right after the '## Meetings' heading and replace legacy content there
        const existingWithMeetingsMarker = existing.includes('<!-- BEGIN MEETINGS -->');
        if (existingWithMeetingsMarker) {
            const newContent = existing.replace(
                new RegExp(`<!-- BEGIN MEETINGS -->[\s\S]*?<!-- END MEETINGS -->`, 'm'),
                sectionBlock
            );
            await fs.promises.writeFile(filePath, newContent, 'utf8');
            return;
        }
        const headingIdx = existing.indexOf('\n## Meetings');
        if (headingIdx !== -1) {
            // Find end of heading line
            const afterHeadingStart = headingIdx + 1; // position of starting newline
            const headingLineEnd = existing.indexOf('\n', afterHeadingStart + '## Meetings'.length);
            const afterHeadingPos = headingLineEnd + 1;
            // Find where meetings content should end: before Reminders marker/heading or next BEGIN marker or EOF
            const nextRemindersMarker = existing.indexOf('\n<!-- BEGIN REMINDERS -->', afterHeadingPos);
            const nextRemindersHeading = existing.indexOf('\n## Reminders', afterHeadingPos);
            const nextAnyMarker = existing.indexOf('\n<!-- BEGIN ', afterHeadingPos);
            let endPos = existing.length;
            for (const p of [nextRemindersMarker, nextRemindersHeading, nextAnyMarker]) {
                if (p !== -1 && p < endPos) endPos = p;
            }
            const before = existing.slice(0, afterHeadingPos);
            const after = existing.slice(endPos);
            const newContent = `${before}${sectionBlock}\n${after}`;
            await fs.promises.writeFile(filePath, newContent, 'utf8');
            return;
        }
        // Fallback: append
        const newContent = (existing ? existing + '\n' : '') + sectionBlock + '\n';
        await fs.promises.writeFile(filePath, newContent, 'utf8');
    } else {
        const newContent = (existing ? existing + '\n' : '') + sectionBlock + '\n';
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

            // Base query lines
            const baseQuery = typeof category.query === 'string' ? category.query : '';
            const queryLines = baseQuery.split('\n').filter(Boolean);

            // Optional folder filters: path includes "..."
            if (Array.isArray(category.pathIncludes)) {
                for (const folder of category.pathIncludes) {
                    if (typeof folder === 'string' && folder.trim() !== '') {
                        queryLines.push(`path includes "${folder}"`);
                    }
                }
            }

            // Optional tag filters: tag includes #...
            if (Array.isArray(category.tagIncludes)) {
                for (const tag of category.tagIncludes) {
                    if (typeof tag === 'string' && tag.trim() !== '') {
                        const normalized = tag.startsWith('#') ? tag : `#${tag}`;
                        queryLines.push(`tag includes ${normalized}`);
                    }
                }
            }

            // Optional grouping: group by <field>
            if (typeof category.groupBy === 'string' && category.groupBy.trim() !== '') {
                // Only add if not already present
                const hasGroup = queryLines.some(line => line.toLowerCase().startsWith('group by'));
                if (!hasGroup) {
                    queryLines.push(`group by ${category.groupBy}`);
                }
            }

            // Optional sorting: sort by <field> (multiple allowed)
            if (Array.isArray(category.sortBy)) {
                const existingSortLines = new Set(
                    queryLines.filter(line => line.toLowerCase().startsWith('sort by')).map(l => l.toLowerCase())
                );
                for (const field of category.sortBy) {
                    if (typeof field === 'string' && field.trim() !== '') {
                        const sortLine = `sort by ${field}`;
                        if (!existingSortLines.has(sortLine.toLowerCase())) {
                            queryLines.push(sortLine);
                        }
                    }
                }
            }

            MD_HEADER += queryLines.join('\n') + '\n';
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