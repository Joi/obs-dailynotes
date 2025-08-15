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

    // Helper to extract all meeting blocks from a given string
    function extractBlocks(fromText) {
        const acc = [];
        const re = /(<!--\s*BEGIN MEETING\s+(.+?)\s*-->[\s\S]*?<!--\s*END MEETING\s+\2\s*-->)/g;
        let m;
        while ((m = re.exec(fromText)) !== null) acc.push({ key: m[2], block: m[1] });
        return acc;
    }

    if (b !== -1 && e !== -1 && e > b) {
        // Operate inside existing MEETINGS block
        const before = txt.slice(0, b + begin.length);
        const inner = txt.slice(b + begin.length, e);
        const after = txt.slice(e);
        const blocks = extractBlocks(inner);
        const filteredBlocks = (insertedMeetingKeys && insertedMeetingKeys.size > 0)
            ? blocks.filter(x => insertedMeetingKeys.has(x.key))
            : [];
        filteredBlocks.sort((a, b) => a.key.localeCompare(b.key));
        const rebuilt = ['\n## Meetings\n', ...filteredBlocks.map(x => x.block)].join('\n') + '\n';
        const out = before + rebuilt + after;
        if (out !== txt) await fs.promises.writeFile(todayPath, out, 'utf8');
        return;
    }

    // Fallback: no MEETINGS block found. Extract all meeting blocks globally, remove them, and build a fresh block.
    const allBlocks = extractBlocks(txt);
    // Filter to only inserted keys to drop stale/alt-key duplicates
    const filtered = (insertedMeetingKeys && insertedMeetingKeys.size > 0)
        ? allBlocks.filter(x => insertedMeetingKeys.has(x.key))
        : allBlocks;
    if (filtered.length === 0) return;
    filtered.sort((a, b) => a.key.localeCompare(b.key));
    // Remove all meeting blocks from the text
    let stripped = txt.replace(/<!--\s*BEGIN MEETING\s+.+?\s*-->[\s\S]*?<!--\s*END MEETING\s+.+?\s*-->/g, '');
    // Insert MEETINGS block after HEADER if present, else append
    const headerEnd = stripped.indexOf('<!-- END HEADER -->');
    const meetBlock = [begin, '\n## Meetings\n', ...filtered.map(x => x.block), end].join('\n') + '\n';
    let out;
    if (headerEnd !== -1) {
        const insertPos = headerEnd + '<!-- END HEADER -->'.length;
        out = stripped.slice(0, insertPos) + '\n\n' + meetBlock + stripped.slice(insertPos);
    } else {
        out = stripped + (stripped.endsWith('\n') ? '' : '\n') + meetBlock;
    }
    if (out !== txt) await fs.promises.writeFile(todayPath, out, 'utf8');
}

module.exports = {
    buildMeetingKeyFromEvent,
    reorderAndPruneMeetings,
};


