#!/usr/bin/env node
/**
 * Dedupe Apple Reminders by title (case-insensitive, whitespace-normalized)
 *
 * Default: dry-run (prints duplicates). Use --apply to complete duplicates, keeping one.
 *
 * Heuristics:
 * - Only considers non-completed reminders
 * - Groups by normalized title (trim, collapse spaces, lowercase)
 * - Keeps the first encountered item in each group; completes the rest
 */

const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { findReminderById, completeReminder } = require('./syncRemindersEnhanced');

function normalizeTitle(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function loadAllReminders() {
  const { stdout } = await execFileAsync('reminders', ['show-all', '--format', 'json']);
  try {
    const items = JSON.parse(stdout);
    return Array.isArray(items) ? items : [];
  } catch (e) {
    throw new Error('Invalid JSON from reminders CLI');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const verbose = args.includes('--verbose');

  const all = await loadAllReminders();
  const active = all.filter(r => !r.isCompleted);
  const groups = new Map();

  for (const r of active) {
    const key = normalizeTitle(r.title);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const dupes = [];
  for (const [key, arr] of groups.entries()) {
    if (arr.length > 1) {
      // Keep the first; dedupe the rest
      const keep = arr[0];
      const toRemove = arr.slice(1);
      dupes.push({ title: keep.title, keep, remove: toRemove });
    }
  }

  if (!dupes.length) {
    console.log('No duplicates found.');
    return;
  }

  console.log(`Found ${dupes.length} duplicate title group(s).`);
  for (const d of dupes) {
    console.log(`\nTitle: ${d.title}`);
    console.log(`  Keep: [${d.keep.list}] ${d.keep.title}`);
    for (const r of d.remove) {
      console.log(`  Dupe: [${r.list}] ${r.title}  (id: ${r.externalId || 'n/a'})`);
    }
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to complete duplicates.');
    return;
  }

  let completed = 0;
  for (const d of dupes) {
    for (const r of d.remove) {
      const id = r.externalId;
      if (!id) continue;
      try {
        // Attempt completion starting from the listed list; function will fallback across lists
        const ok = await completeReminder(r.list || 'Inbox', id);
        if (ok) {
          completed++;
          if (verbose) console.log(`Completed duplicate: [${r.list}] ${r.title}`);
        }
      } catch (e) {
        console.error(`Failed to complete duplicate "${r.title}": ${e.message}`);
      }
    }
  }

  console.log(`\nCompleted ${completed} duplicate reminder(s).`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message || String(err));
    process.exit(1);
  });
}


