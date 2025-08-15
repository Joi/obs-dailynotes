const fs = require('fs');
const path = require('path');
const { getTodayFilePath } = require('./writer');

function buildMeetingKeyFromEvent(event, fallbackYmd) {
    const strategy = String(process.env.MEETING_KEY_STRATEGY || 'time').toLowerCase();
    if (strategy === 'ical') {
        const id = event && (event.iCalUID || event.id);
        return id || fallbackYmd;
    }
    // Default: use time-based key to guarantee chronological sort
    return fallbackYmd;
}

/**
 * Reorders and prunes meeting blocks inside the MEETINGS section of today's note.
 * - Keeps only blocks whose keys are in insertedMeetingKeys (if provided), else removes all.
 * - Sorts by key ascending for stable earliest-first order.
 */
async function reorderAndPruneMeetings(pathPrefix, insertedMeetingKeys) {
    const todayPath = getTodayFilePath(pathPrefix);
    let txt = '';
    try { txt = await fs.promises.readFile(todayPath, 'utf8'); } catch {}
    const begin = '<!-- BEGIN MEETINGS -->';
    const end = '<!-- END MEETINGS -->';
    const b = txt.indexOf(begin); const e = txt.indexOf(end);
    if (b === -1 || e === -1 || e <= b) return;

    const before = txt.slice(0, b + begin.length);
    const inner = txt.slice(b + begin.length, e);
    const after = txt.slice(e);

    const blocks = [];
    const re = /(<!--\s*BEGIN MEETING\s+(.+?)\s*-->[\s\S]*?<!--\s*END MEETING\s+\2\s*-->)/g;
    let m;
    while ((m = re.exec(inner)) !== null) {
        blocks.push({ key: m[2], block: m[1] });
    }

    const filteredBlocks = (insertedMeetingKeys && insertedMeetingKeys.size > 0)
        ? blocks.filter(x => insertedMeetingKeys.has(x.key))
        : [];

    filteredBlocks.sort((a, b) => a.key.localeCompare(b.key));
    const rebuilt = ['\n## Meetings\n', ...filteredBlocks.map(x => x.block)].join('\n') + '\n';
    const out = before + rebuilt + after;
    if (out !== txt) await fs.promises.writeFile(todayPath, out, 'utf8');
}

module.exports = {
    buildMeetingKeyFromEvent,
    reorderAndPruneMeetings,
};


