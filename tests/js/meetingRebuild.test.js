const fs = require('fs');
const path = require('path');
const os = require('os');

const { reorderAndPruneMeetings } = require('../../lib/meetingBlockManager');
const { getTodayFilePath } = require('../../lib/writer');

function mkTempDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'obs-dn-rebuild-')); }

function write(file, txt) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, txt, 'utf8'); }
function read(file) { return fs.readFileSync(file, 'utf8'); }

function hasOutsideMeetingBlocks(text) {
	const begin = '<!-- BEGIN MEETINGS -->';
	const end = '<!-- END MEETINGS -->';
	const b = text.indexOf(begin), e = text.indexOf(end);
	// Remove inside block and check for any meeting markers outside
	let outside = text;
	if (b !== -1 && e !== -1 && e > b) {
		outside = text.slice(0, b) + text.slice(e + end.length);
	}
	return /<!--\s*BEGIN MEETING\s+/.test(outside);
}

describe('MEETINGS rebuild when missing', () => {
	test('rebuilds a single MEETINGS block after HEADER', async () => {
		const dir = mkTempDir();
		const today = getTodayFilePath(dir);
		const content = [
			'<!-- BEGIN HEADER -->',
			'date: 2025-01-01',
			'<!-- END HEADER -->',
			'',
			'<!-- BEGIN MEETING 2025-01-01-0900 -->',
			'A',
			'<!-- END MEETING 2025-01-01-0900 -->',
			'...',
			'<!-- BEGIN MEETING 2025-01-01-0830 -->',
			'B',
			'<!-- END MEETING 2025-01-01-0830 -->',
		].join('\n');
		write(today, content);
		const keys = new Set(['2025-01-01-0830', '2025-01-01-0900']);
		await reorderAndPruneMeetings(dir, keys);
		const out = read(today);
		expect(out).toMatch('<!-- BEGIN MEETINGS -->');
		expect(out.indexOf('<!-- END HEADER -->')).toBeLessThan(out.indexOf('<!-- BEGIN MEETINGS -->'));
		// Order should be 0830 then 0900 inside block
		const inner = out.slice(out.indexOf('<!-- BEGIN MEETINGS -->'), out.indexOf('<!-- END MEETINGS -->'));
		expect(inner.indexOf('2025-01-01-0830')).toBeLessThan(inner.indexOf('2025-01-01-0900'));
		// No stray meeting blocks outside
		expect(hasOutsideMeetingBlocks(out)).toBe(false);
	});
});
