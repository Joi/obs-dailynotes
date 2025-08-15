const fs = require('fs');
const path = require('path');
const os = require('os');

const { getTodayFilePath, upsertTodaySection, upsertTodayMeeting } = require('../../lib/writer');
const { reorderAndPruneMeetings } = require('../../lib/meetingBlockManager');

function mkTempDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'obs-dn-order-'));
}

function read(file) { return fs.readFileSync(file, 'utf8'); }

function extractMeetingKeysFromMeetingsSection(text) {
	const begin = '<!-- BEGIN MEETINGS -->';
	const end = '<!-- END MEETINGS -->';
	const b = text.indexOf(begin), e = text.indexOf(end);
	if (b === -1 || e === -1 || e <= b) return [];
	const inner = text.slice(b + begin.length, e);
	const re = /<!--\s*BEGIN MEETING\s+(.+?)\s*-->/g;
	const keys = [];
	let m;
	while ((m = re.exec(inner)) !== null) keys.push(m[1]);
	return keys;
}

describe('meeting ordering', () => {
	test('default ordering is chronological (time-based keys)', async () => {
		const dir = mkTempDir();
		const today = getTodayFilePath(dir);
		await upsertTodaySection('MEETINGS', '## Meetings', dir);
		// Insert out of order: 09:00, 08:30, 09:05
		await upsertTodayMeeting('2025-01-01-0900', 'A', dir);
		await upsertTodayMeeting('2025-01-01-0830', 'B', dir);
		await upsertTodayMeeting('2025-01-01-0905', 'C', dir);
		await reorderAndPruneMeetings(dir, new Set(['2025-01-01-0900','2025-01-01-0830','2025-01-01-0905']));
		const out = read(today);
		const keys = extractMeetingKeysFromMeetingsSection(out);
		expect(keys).toEqual(['2025-01-01-0830','2025-01-01-0900','2025-01-01-0905']);
	});

	test('reorder is stable across multiple runs', async () => {
		const dir = mkTempDir();
		const today = getTodayFilePath(dir);
		await upsertTodaySection('MEETINGS', '## Meetings', dir);
		await upsertTodayMeeting('2025-01-01-1000', 'X', dir);
		await upsertTodayMeeting('2025-01-01-0930', 'Y', dir);
		await upsertTodayMeeting('2025-01-01-1015', 'Z', dir);
		const keysSet = new Set(['2025-01-01-1000','2025-01-01-0930','2025-01-01-1015']);
		await reorderAndPruneMeetings(dir, keysSet);
		let keys = extractMeetingKeysFromMeetingsSection(read(today));
		expect(keys).toEqual(['2025-01-01-0930','2025-01-01-1000','2025-01-01-1015']);
		// Run again with same set
		await reorderAndPruneMeetings(dir, keysSet);
		keys = extractMeetingKeysFromMeetingsSection(read(today));
		expect(keys).toEqual(['2025-01-01-0930','2025-01-01-1000','2025-01-01-1015']);
	});
});
