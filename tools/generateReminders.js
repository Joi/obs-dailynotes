#!/usr/bin/env node
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env beside project, fallback silently
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const outputPath = path.join(dailyDir, 'reminders.md');

execFile('reminders', ['show-all', '--format', 'json'], (err, stdout, stderr) => {
  if (err) {
    console.error('Failed to read reminders:', stderr || err.message);
    process.exit(1);
  }
  let items = [];
  try {
    items = JSON.parse(stdout);
  } catch (e) {
    console.error('Invalid JSON from reminders CLI');
    process.exit(1);
  }

  const lines = ['# Reminders', ''];
  for (const it of items) {
    const title = it.title || '';
    const list = it.list || '';
    const id = it.externalId || '';
    // Embed ID as an HTML comment for later syncing
    lines.push(`- [ ] ${title} (${list}) <!--reminders-id:${id}-->`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
});


