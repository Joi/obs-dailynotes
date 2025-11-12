const fs = require('fs');
const path = require('path');
const { formatMonthAndDay, formatHourAndMin } = require('./dateUtils');
const { writeFileAtomic } = require('./fsSafe');
const { normalizeMarkdownSpacing } = require('./formatUtils');

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
			await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
			return;
		}
		const newContent = sectionBlock + (existing ? `\n${existing}` : '\n');
		await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
	} else if (sectionName === 'REMINDERS') {
		// Replace any legacy reminders section heuristically
		const legacyRemindersRegex = /(## Reminders \(macOS\)[\s\S]*?)(?=(\n## |\n### |\n<!-- BEGIN REMINDERS -->|\n$))/m;
		if (legacyRemindersRegex.test(existing)) {
			const newContent = existing.replace(legacyRemindersRegex, sectionBlock + '\n');
			await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
			return;
		}
		// Trim any trailing whitespace/newlines so we insert with exactly one blank line separation
		const withoutTrailing = existing.replace(/\s+$/, '');
		const prefix = withoutTrailing ? withoutTrailing + '\n' : '';
		const newContent = prefix + sectionBlock + '\n';
		await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
	} else if (sectionName === 'MEETINGS') {
		// Remove any legacy, unmarked meetings section to avoid duplicate headings
		const legacyMeetingsAll = /(\n)?## Meetings[\s\S]*?(?=(\n## |\n<!-- BEGIN |\n$))/gm;
		existing = existing.replace(legacyMeetingsAll, '');

		// If HEADER exists, insert meetings block immediately after it; otherwise append
		const headerBlockRegex = /<!-- BEGIN HEADER -->[\s\S]*?<!-- END HEADER -->/m;
		if (headerBlockRegex.test(existing)) {
			const newContent = existing.replace(headerBlockRegex, (m) => `${m}\n${sectionBlock}`);
			await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
			return;
		}
		// Ensure single blank line before appending when not inserted after header
		const withoutTrailing = existing.replace(/\s+$/, '');
		const prefix = withoutTrailing ? withoutTrailing + '\n' : '';
		const newContent = prefix + sectionBlock + '\n';
		await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
	} else {
		const withoutTrailing = existing.replace(/\s+$/, '');
		const prefix = withoutTrailing ? withoutTrailing + '\n' : '';
		const newContent = prefix + sectionBlock + '\n';
		await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
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
		MD_HEADER += `\n[[${yesterday_date}]] << Previous | [[START-HERE|🏠 Home]] | Next >> [[${tomorrow_date}]]\n`;
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

	let rawHeader = config.output.meetingTemplate.format
		.replace('{emoji}', emoji)
		.replace('{title}', output.callTitle)
		.replace('{tag}', '');
	// Clean up legacy templates that may still include a trailing " #{tag}"
	rawHeader = rawHeader.replace(/\s*#\s*$/, '').replace(/\s{2,}/g, ' ').trimEnd();
	let header = rawHeader + '\n';

	if (config.output.meetingTemplate.includeTime) {
		header += `- ${output.callStart} - ${output.callEnd}`;
	}

	// Helper: derive vendor-aware link label
	const vendorLabelForUrl = (url, fallback = 'Call Link') => {
		const u = String(url || '').toLowerCase();
		if (!u) return fallback;
		if (u.includes('zoom.us')) return 'Zoom Link';
		if (u.includes('meet.google.com')) return 'Meet Link';
		if (u.includes('teams.microsoft.com') || u.includes('teams.live.com')) return 'Teams Link';
		if (u.includes('webex.com')) return 'Webex Link';
		return fallback;
	};

	// Helper: display-friendly name for emails
	const deriveDisplayName = (raw) => {
		const s = String(raw || '').trim();
		if (!s.includes('@')) return s;
		const local = s.split('@')[0].replace(/\+.*/, '');
		const parts = local.split(/[._-]+/).filter(Boolean);
		const titled = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
		return titled.join(' ');
	};

	let attendeesInline = '';
	let attendeesBlock = '';
	if (config.output.meetingTemplate.includeAttendees && config.formatting.showAttendees && output.attendees.length > 0) {
		const normalized = output.attendees.map((name) => {
			const label = deriveDisplayName(name);
			// If the source looks like an email, avoid creating a wikilink to a non-existent page
			if (String(name || '').includes('@')) return label;
			const safe = String(label || '').replace(/[\[\]|\|]/g, '-');
			return `[[${safe}|${label}]]`;
		});
		const maxInline = 8;
		if (normalized.length <= maxInline) {
			const attendeesToShow = normalized.slice(0, config.formatting.maxAttendeesShown);
			const moreCount = normalized.length - attendeesToShow.length;
			attendeesInline = ` (${attendeesToShow.join(', ')}` + (moreCount > 0 ? ` +${moreCount} more` : '') + ')';
		} else {
			const attendeesToShow = normalized.slice(0, 8);
			const moreCount = normalized.length - attendeesToShow.length;
			attendeesBlock = `\n- Attendees: ${attendeesToShow.join(', ')}` + (moreCount > 0 ? ` +${moreCount} more` : '');
		}
	}

	let callLink = '';
	if (config.output.meetingTemplate.includeLink && config.formatting.showMeetingLinks && output.url !== '') {
		const label = vendorLabelForUrl(output.url, config.formatting.meetingLinkText);
		callLink = ` [${label}](${output.url})`;
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

	return header + attendeesInline + callLink + callNoteLink + attendeesBlock + location;
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
 * If not present, inserts inside the MEETINGS block (preferred), else after the first '## Meetings', else append.
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

	// Replace if present anywhere
	if (existing.includes(startMarker) && existing.includes(endMarker)) {
		const newContent = existing.replace(
			new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm'),
			block
		);
		await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
		return;
	}

	// Prefer inserting inside MEETINGS block
	const meetingsBegin = '<!-- BEGIN MEETINGS -->';
	const meetingsEnd = '<!-- END MEETINGS -->';
	const b = existing.indexOf(meetingsBegin);
	const e = existing.indexOf(meetingsEnd);
	if (b !== -1 && e !== -1 && e > b) {
		const inner = existing.slice(b + meetingsBegin.length, e);
		const headerIdx = inner.indexOf('\n## Meetings');
		let insertionPointInFile;
		if (headerIdx !== -1) {
			const headerAbs = b + meetingsBegin.length + headerIdx;
			const lineEnd = existing.indexOf('\n', headerAbs + '\n## Meetings'.length);
			insertionPointInFile = lineEnd + 1;
		} else {
			insertionPointInFile = b + meetingsBegin.length;
		}
		const before = existing.slice(0, insertionPointInFile);
		const after = existing.slice(insertionPointInFile);
		const newContent = `${before}\n${block}\n${after}`;
		await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
		return;
	}

	// Insert after '## Meetings' heading if present outside block
	const meetingsHeadingIdx = existing.indexOf('\n## Meetings');
	if (meetingsHeadingIdx !== -1) {
		const insertPos = meetingsHeadingIdx + 1;
		const lineEnd = existing.indexOf('\n', insertPos + '## Meetings'.length);
		const before = existing.slice(0, lineEnd + 1);
		const after = existing.slice(lineEnd + 1);
		const newContent = `${before}\n${block}\n${after}`;
		await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
		return;
	}

	// Fallback: append
	const newContent = (existing ? existing + '\n' : '') + block + '\n';
	await writeFileAtomic(filePath, normalizeMarkdownSpacing(newContent), 'utf8');
}

async function normalizeTodayNote(pathPrefix) {
	const filePath = getTodayFilePath(pathPrefix);
	let txt = '';
	try { txt = await fs.promises.readFile(filePath, 'utf8'); } catch { return; }

	// Wrap long Transcript blocks under <details>
	let out = txt.replace(/(^|\n)Transcript\s*\n([\s\S]*?)(?=(\n<!-- END MEETING|\n<!-- BEGIN MEETING|\n## |\n### |$))/g, (m, pfx, body) => {
		const content = body.trimEnd();
		// Only wrap if reasonably long
		const lines = content.split(/\r?\n/).filter(Boolean);
		if (lines.length < 10) return m; // leave short transcripts inline
		return `${pfx}<details>\n<summary>Transcript</summary>\n\n${content}\n\n</details>\n`;
	});

	// Wrap "Notes from Notion" blocks when followed by content
	out = out.replace(/(^|\n)[ \t]*-\s*Notes from Notion\s*\n([\s\S]*?)(?=(\n[ \t]*-\s|\n<!-- END MEETING|\n<!-- BEGIN MEETING|\n## |\n### |$))/g, (m, pfx, body) => {
		const content = body.trimEnd();
		if (!content) return m;
		return `${pfx}<details>\n<summary>Notes from Notion</summary>\n\n${content}\n\n</details>\n`;
	});

	out = normalizeMarkdownSpacing(out);
	if (out !== txt) await writeFileAtomic(filePath, out, 'utf8');
}

module.exports.upsertTodayMeeting = upsertTodayMeeting;
module.exports.normalizeTodayNote = normalizeTodayNote;