#!/usr/bin/env node
/**
 * Apply tasks from reminders/outbox/*.md into Apple Reminders (opt-in step).
 *
 * - Reads all markdown files in reminders/outbox/
 * - Creates reminders for unchecked tasks without IDs
 * - Writes back IDs to the outbox files for traceability
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');
const outboxDir = path.join(vaultRoot, 'reminders', 'outbox');

const { completeReminder } = require('./syncRemindersEnhanced');

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

async function createReminder(list, title, id) {
  const notes = `ID: ${id}`;
  await execFileAsync('reminders', ['add', list || 'Inbox', title, '--notes', notes]);
}

function parseTasks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const tasks = [];
  // Match: - [ ] Title *(List)*  [optional ID comment]
  const re = /^[\t ]*- \[ \] (.*?)(?: \*\(([^)]+)\)\*)?(?:\s*<!--reminders-id:([^\s>]+)[^>]*-->)?$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) {
      tasks.push({ index: i, title: m[1].trim(), list: (m[2] || 'Inbox').trim(), id: m[3] || null });
    }
  }
  return { lines, tasks };
}

function writeBackIds(filePath, lines, updates) {
  // Apply updates from bottom to top to preserve indices
  updates.sort((a, b) => b.index - a.index);
  for (const u of updates) {
    if (!lines[u.index].includes('<!--reminders-id:')) {
      lines[u.index] = lines[u.index].replace(/\s*$/, ` <!--reminders-id:${u.id}-->`);
    }
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

async function main() {
  if (!fs.existsSync(outboxDir)) {
    console.log('No outbox directory found:', path.relative(vaultRoot, outboxDir));
    return;
  }
  const files = fs.readdirSync(outboxDir).filter(f => f.endsWith('.md'));
  if (!files.length) {
    console.log('No outbox files to process.');
    return;
  }
  let created = 0;
  for (const f of files) {
    const filePath = path.join(outboxDir, f);
    const { lines, tasks } = parseTasks(filePath);
    const updates = [];
    for (const t of tasks) {
      if (t.id) continue; // already has ID
      const newId = crypto.randomBytes(16).toString('hex');
      try {
        await createReminder(t.list, t.title, newId);
        updates.push({ index: t.index, id: newId });
        created++;
      } catch (e) {
        console.error(`Failed to create reminder "${t.title}" in ${t.list}: ${e.message}`);
      }
    }
    if (updates.length) writeBackIds(filePath, lines, updates);
  }
  console.log(`Created ${created} reminder(s) from outbox.`);
}

if (require.main === module) {
  main().catch(err => { console.error(err.message || String(err)); process.exit(1); });
}


