#!/usr/bin/env node
/**
 * Export unchecked agenda tasks from today's daily note into a per-person Outbox
 * directory (vaultRoot/reminders/outbox). This is a safe staging step.
 *
 * - Reads today's daily note (DAILY_NOTE_PATH/YYYY-MM-DD.md)
 * - Parses tasks under "Agenda for [[Person]]" sections and plain tasks
 * - Skips tasks that already have reminders IDs or are checked
 * - Writes/updates per-person files in reminders/outbox/<Person>.md
 * - Avoids duplicates within each outbox file
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');
const outboxDir = path.join(vaultRoot, 'reminders', 'outbox');

const { parseTasksFromContent } = require('./syncRemindersEnhanced');

function getTodayPath() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
}

function normalizeTaskKey(title, list) {
  return `${(list || 'Inbox').trim()}|${String(title || '').replace(/\s+/g, ' ').trim().toLowerCase()}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function appendUniqueTasks(filePath, tasks) {
  let existing = '';
  try { existing = fs.readFileSync(filePath, 'utf8'); } catch {}
  const seen = new Set();
  const outLines = existing ? existing.split(/\r?\n/) : [];
  // Seed seen with existing unchecked tasks by title+list
  const re = /^- \[ \] (.*?)(?: \*\(([^)]+)\)\*)?(?:\s*<!--reminders-id:[^>]+-->)?$/;
  for (const line of outLines) {
    const m = line.match(re);
    if (m) {
      const t = m[1]; const l = m[2] || 'Inbox';
      seen.add(normalizeTaskKey(t, l));
    }
  }
  // Write header on empty file
  if (!existing) {
    outLines.push('## Outbox');
    outLines.push('');
  }
  let added = 0;
  for (const t of tasks) {
    const key = normalizeTaskKey(t.title, t.list);
    if (seen.has(key)) continue;
    seen.add(key);
    outLines.push(`- [ ] ${t.title} *(${t.list || 'Inbox'})*`);
    added++;
  }
  if (added > 0) {
    fs.writeFileSync(filePath, outLines.join('\n'), 'utf8');
  }
  return added;
}

async function main() {
  const todayPath = getTodayPath();
  let content = '';
  try { content = fs.readFileSync(todayPath, 'utf8'); } catch {
    console.error('Today\'s daily note not found:', todayPath);
    process.exit(1);
  }
  const tasks = parseTasksFromContent(content, todayPath);
  // Only new, unchecked tasks (no ID)
  const newUnchecked = tasks.filter(t => !t.hasId && !t.done);
  if (!newUnchecked.length) {
    console.log('No new unchecked agenda tasks to export.');
    return;
  }
  ensureDir(outboxDir);
  const grouped = new Map(); // person/list name -> array
  for (const t of newUnchecked) {
    const person = (t.context && t.context.person) || t.list || 'Inbox';
    const name = String(person || 'Inbox').trim();
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push({ title: t.title, list: t.list || (t.context && t.context.person) || 'Inbox' });
  }
  let totalAdded = 0;
  for (const [name, arr] of grouped.entries()) {
    const safe = name.replace(/[\\/:*?"<>|]/g, '-');
    const filePath = path.join(outboxDir, `${safe}.md`);
    const added = appendUniqueTasks(filePath, arr);
    if (added) {
      console.log(`Added ${added} task(s) to ${path.relative(vaultRoot, filePath)}`);
      totalAdded += added;
    }
  }
  if (!totalAdded) {
    console.log('No new tasks added to Outbox.');
  }
}

if (require.main === module) {
  main().catch(err => { console.error(err.message || String(err)); process.exit(1); });
}


