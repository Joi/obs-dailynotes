#!/usr/bin/env node
/**
 * Migrate hashtags from Reminders notes into the title, removing them from notes.
 * - Makes tags visible/editable in Obsidian and simplifies our structure
 */

const { promisify } = require('util');
const { execFile } = require('child_process');
const execFileAsync = promisify(execFile);

function extractTags(text) {
  if (!text || typeof text !== 'string') return [];
  const re = /#([A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?)/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

function removeTagsFromText(text) {
  if (!text) return '';
  // Remove standalone hashtag tokens, keep other text
  let result = text.replace(/(^|\s)#[A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?(?![\w-])/g, ' ');
  // Collapse whitespace and trim lines
  result = result.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).join('\n');
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

async function getLists() {
  const { stdout } = await execFileAsync('reminders', ['show-lists']);
  return stdout.split('\n').map(s => s.trim()).filter(Boolean);
}

async function getListReminders(listName) {
  const { stdout } = await execFileAsync('reminders', ['show', listName, '--format', 'json']);
  return JSON.parse(stdout);
}

async function editReminder(listName, indexOneBased, newTitle, newNotes) {
  const args = ['edit', listName, String(indexOneBased), newTitle];
  if (typeof newNotes === 'string') {
    args.push('--notes', newNotes);
  }
  await execFileAsync('reminders', args);
}

async function run() {
  const lists = await getLists();
  let changed = 0;
  for (const list of lists) {
    const reminders = await getListReminders(list);
    for (let i = 0; i < reminders.length; i++) {
      const r = reminders[i];
      if (r.isCompleted || r.completed) continue;
      const title = r.title || '';
      const notes = r.notes || '';

      const noteTags = extractTags(notes);
      if (noteTags.length === 0) continue;

      const titleTags = extractTags(title).map(t => t.toLowerCase());
      const toAppend = [];
      for (const t of noteTags) {
        if (!titleTags.includes(t.toLowerCase())) toAppend.push(t);
      }
      if (toAppend.length === 0) {
        // Only clear tags from notes if any present
        const cleanedNotes = removeTagsFromText(notes);
        if (cleanedNotes !== notes) {
          await editReminder(list, i + 1, title, cleanedNotes);
          changed++;
        }
        continue;
      }

      const newTitle = (title + ' ' + toAppend.join(' ')).replace(/\s+/g, ' ').trim();
      const newNotes = removeTagsFromText(notes);

      if (newTitle !== title || newNotes !== notes) {
        await editReminder(list, i + 1, newTitle, newNotes);
        changed++;
      }
    }
  }
  console.log(`Migrated hashtags for ${changed} reminders.`);
}

if (require.main === module) {
  run().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}

module.exports = { extractTags, removeTagsFromText };


