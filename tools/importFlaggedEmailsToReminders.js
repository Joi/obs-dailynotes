#!/usr/bin/env node
/**
 * Import all flagged Gmail messages as reminders (dedup by Message-ID), then unstar in Gmail.
 * - Writes to Apple Reminders via 'reminders' CLI (Inbox list by default)
 * - Adds '#email' tag in the title; priority 0
 */
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const path = require('path');
const { fetchFlaggedMessages, authorizeGmail } = require('../lib/services/gmailService');
const fs = require('fs');

function parseArgs(argv) {
  const args = { list: 'Inbox', dryRun: false, limit: 200, deep: false, unstar: true };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === '--list' || a === '-l') && argv[i + 1]) { args.list = argv[++i]; continue; }
    if (a === '--dry-run') { args.dryRun = true; continue; }
    if (a === '--no-unstar') { args.unstar = false; continue; }
    if ((a === '--limit') && argv[i + 1]) { args.limit = Math.max(1, Math.min(1000, parseInt(argv[++i], 10) || 200)); continue; }
    if (a === '--deep') { args.deep = true; continue; }
  }
  return args;
}

async function listAllReminders() {
  const { stdout } = await execFileAsync('reminders', ['show-all', '--format', 'json']);
  return JSON.parse(stdout);
}

function normalizeMessageId(s) {
  if (!s) return '';
  return String(s).trim().replace(/^<|>$/g, '');
}

async function addReminder(list, title, notes) {
  await execFileAsync('reminders', ['add', list, title, '--notes', notes]);
}

async function main() {
  const args = parseArgs(process.argv);
  const auth = await authorizeGmail({ deep: Boolean(args.deep) });
  const items = await fetchFlaggedMessages({ limit: args.limit, deep: Boolean(args.deep) });
  const all = await listAllReminders();
  const existingIds = new Set();
  for (const r of all) {
    // Try to find Message-ID in notes
    if (r.notes) {
      const m = r.notes.match(/Message-ID:\s*<([^>]+)>/i);
      if (m) existingIds.add(normalizeMessageId(m[1]));
      const m2 = r.notes.match(/message:\/\/\%3C([^%>]+)\%3E/i);
      if (m2) existingIds.add(normalizeMessageId(m2[1]));
    }
  }

  let imported = 0;
  for (const it of items) {
    const msgId = normalizeMessageId(it.messageId);
    if (!msgId) continue; // require Message-ID to dedupe
    if (existingIds.has(msgId)) continue;
    const messageUrl = `message://%3C${encodeURIComponent(msgId)}%3E`;
    const title = `Email From: ${it.from} — ${it.subject}  ${messageUrl} #email`;
    const notes = `From: ${it.from}\nDate: ${it.date}\nMessage-ID: <${msgId}>\nLink: ${messageUrl}`;
    if (!args.dryRun) {
      await addReminder(args.list, title, notes);
    }
    imported += 1;
  }
  console.log(`Imported ${imported} new email reminders${args.dryRun ? ' (dry-run)' : ''}.`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
}


