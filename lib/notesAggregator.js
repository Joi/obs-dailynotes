/**
 * Notes Aggregator - Find synced notes by date
 * 
 * Aggregates notes from ~/switchboard/notes-sync/ for the daily note.
 * Notes are matched by:
 * 1. Date prefix in filename (YYYY-MM-DD ...)
 * 2. Modified date in frontmatter
 * 3. File modified time (fallback)
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_NOTES_SYNC_DIR = path.join(
  process.env.HOME,
  'switchboard',
  'notes-sync'
);

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - Markdown file content
 * @returns {Object} - { frontmatter: {}, body: string }
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2] };
}

/**
 * Extract date from filename if it has YYYY-MM-DD prefix
 * @param {string} filename - e.g., "2026-01-09 Meeting - Budget.md"
 * @returns {string|null} - e.g., "2026-01-09" or null
 */
function extractDateFromFilename(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Get the date a note belongs to (for aggregation purposes)
 * Priority: filename date prefix > frontmatter modified > file mtime
 * @param {string} filePath - Full path to the markdown file
 * @returns {string} - Date in YYYY-MM-DD format
 */
function getNoteDateFromFile(filePath) {
  const filename = path.basename(filePath);
  
  // 1. Check filename for date prefix
  const filenameDate = extractDateFromFilename(filename);
  if (filenameDate) {
    return filenameDate;
  }

  // 2. Check frontmatter modified date
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    if (frontmatter.modified) {
      const date = new Date(frontmatter.modified);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  } catch (e) {
    // Fall through to mtime
  }

  // 3. Fall back to file modified time
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Categorize note type from filename
 * @param {string} filename - e.g., "2026-01-09 Meeting - Budget.md"
 * @returns {string} - 'meeting', 'scan', 'note', or 'other'
 */
function categorizeNote(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('meeting')) return 'meeting';
  if (lower.includes('scan')) return 'scan';
  if (lower.includes('note')) return 'note';
  return 'other';
}

/**
 * Get display title from filename
 * Strips date prefix and .md extension
 * @param {string} filename - e.g., "2026-01-09 Meeting - Budget.md"
 * @returns {string} - e.g., "Meeting - Budget"
 */
function getDisplayTitle(filename) {
  let title = filename.replace(/\.md$/, '');
  // Remove date prefix if present
  title = title.replace(/^\d{4}-\d{2}-\d{2}\s*[-–]?\s*/, '');
  return title || filename;
}

/**
 * Find all notes for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} [syncDir] - Path to notes-sync directory
 * @returns {Array<Object>} - Array of note objects
 */
function getNotesForDate(date, syncDir = DEFAULT_NOTES_SYNC_DIR) {
  const notes = [];

  if (!fs.existsSync(syncDir)) {
    return notes;
  }

  const files = fs.readdirSync(syncDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'));

  for (const filename of files) {
    const filePath = path.join(syncDir, filename);
    const noteDate = getNoteDateFromFile(filePath);

    if (noteDate === date) {
      notes.push({
        filename,
        path: filePath,
        relativePath: `notes-sync/${filename}`,
        title: getDisplayTitle(filename),
        type: categorizeNote(filename),
        date: noteDate,
        hasDatePrefix: !!extractDateFromFilename(filename)
      });
    }
  }

  // Sort by type (meetings first, then scans, then others)
  const typeOrder = { meeting: 0, scan: 1, note: 2, other: 3 };
  notes.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return notes;
}

/**
 * Find notes that need filing (no date prefix)
 * @param {string} [syncDir] - Path to notes-sync directory
 * @returns {Array<Object>} - Array of note objects without date prefixes
 */
function getUnfiledNotes(syncDir = DEFAULT_NOTES_SYNC_DIR) {
  const notes = [];

  if (!fs.existsSync(syncDir)) {
    return notes;
  }

  const files = fs.readdirSync(syncDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'));

  for (const filename of files) {
    if (!extractDateFromFilename(filename)) {
      const filePath = path.join(syncDir, filename);
      notes.push({
        filename,
        path: filePath,
        relativePath: `notes-sync/${filename}`,
        title: getDisplayTitle(filename),
        type: categorizeNote(filename),
        hasDatePrefix: false
      });
    }
  }

  return notes;
}

/**
 * Generate markdown section for daily note
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} [syncDir] - Path to notes-sync directory
 * @returns {string} - Markdown section content
 */
function buildCapturedNotesSection(date, syncDir = DEFAULT_NOTES_SYNC_DIR) {
  const notes = getNotesForDate(date, syncDir);
  const unfiled = getUnfiledNotes(syncDir);

  if (notes.length === 0 && unfiled.length === 0) {
    return '';
  }

  const lines = ['', '## 📱 Captured Notes'];

  if (notes.length > 0) {
    const meetings = notes.filter(n => n.type === 'meeting');
    const scans = notes.filter(n => n.type === 'scan');
    const others = notes.filter(n => n.type !== 'meeting' && n.type !== 'scan');

    if (meetings.length > 0) {
      lines.push('### From Meetings');
      for (const note of meetings) {
        lines.push(`- [[${note.relativePath}|${note.title}]]`);
      }
    }

    if (scans.length > 0) {
      lines.push('### Paper Scans');
      for (const note of scans) {
        lines.push(`- [[${note.relativePath}|${note.title}]]`);
      }
    }

    if (others.length > 0) {
      lines.push('### Other Notes');
      for (const note of others) {
        lines.push(`- [[${note.relativePath}|${note.title}]]`);
      }
    }
  }

  if (unfiled.length > 0) {
    lines.push('### Needs Filing (no date prefix)');
    for (const note of unfiled) {
      lines.push(`- [[${note.relativePath}|${note.title}]] → add date prefix`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  getNotesForDate,
  getUnfiledNotes,
  buildCapturedNotesSection,
  extractDateFromFilename,
  getDisplayTitle,
  categorizeNote,
  DEFAULT_NOTES_SYNC_DIR
};
