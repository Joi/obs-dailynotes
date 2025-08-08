#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH;
if (!dailyDir) {
  console.error('DAILY_NOTE_PATH not set');
  process.exit(1);
}

const vaultRoot = path.resolve(dailyDir, '..');
const peopleDir = vaultRoot; // scan root-level for person pages
const indexPath = path.join(vaultRoot, 'people.index.json');

function parseFrontmatter(content) {
  const fm = content.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  if (!fm) return {};
  const yaml = fm[1];
  const obj = {};
  // very small YAML parser for key: value pairs and arrays
  yaml.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2];
    if (val.startsWith('[') && val.endsWith(']')) {
      try { obj[key] = JSON.parse(val.replace(/([A-Za-z0-9_.@\-\s]+)/g, '"$1"')); } catch { obj[key] = []; }
    } else if (val === 'true' || val === 'false') {
      obj[key] = val === 'true';
    } else {
      obj[key] = val.replace(/^"|"$/g, '');
    }
  });
  return obj;
}

const index = {};
if (fs.existsSync(peopleDir)) {
  const dailyDirName = path.basename(dailyDir);
  const files = fs.readdirSync(peopleDir)
    .filter(f => f.endsWith('.md'))
    .filter(f => f !== `${new Date().toISOString().slice(0,10)}.md`)
    .filter(f => f !== 'reminders.md' && f !== 'people.index.json')
    .filter(f => f !== dailyDirName && f !== path.basename(indexPath));
  for (const f of files) {
    const filePath = path.join(peopleDir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    const name = fm.name || path.basename(f, '.md');
    const aliases = Array.isArray(fm.aliases) ? fm.aliases : [];
    const personId = fm.personId || '';
    const pagePath = `${path.basename(f)}`;
    index[personId || name] = {
      name,
      pagePath,
      aliases,
      reminders: {
        listName: fm.reminders && fm.reminders.listName ? fm.reminders.listName : name
      }
    };
  }
}

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`Wrote ${indexPath}`);


