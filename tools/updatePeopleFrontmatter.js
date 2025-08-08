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

// Removed filename heuristics to avoid false positives

function extractFrontmatter(content) {
  const m = content.match(/^---[\r\n]([\s\S]*?)[\r\n]---[\r\n]?/);
  if (!m) return { frontmatter: null, body: content };
  return { frontmatter: m[1], body: content.slice(m[0].length) };
}

function parseInlineArray(val) {
  const t = val.trim();
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }
  return [];
}

function toInlineArray(values) {
  const uniq = Array.from(new Set(values.filter(Boolean)));
  return `[${uniq.map(v => (v.includes(' ') ? `"${v}"` : v)).join(', ')}]`;
}

function updateFrontmatter(fmStr, fileBaseName) {
  // Collect existing keys and preserve unknown lines
  const lines = fmStr.split(/\r?\n/);
  const preserved = [];
  let i = 0;
  let existing = { personId: undefined, name: undefined, aliases: undefined, tags: undefined, remindersListName: undefined };
  while (i < lines.length) {
    const line = lines[i];
    if (/^personId:/.test(line)) { existing.personId = line.split(':').slice(1).join(':').trim(); i++; continue; }
    if (/^name:/.test(line)) { existing.name = line.split(':').slice(1).join(':').trim(); i++; continue; }
    if (/^aliases:/.test(line)) {
      existing.aliases = parseInlineArray(line.split(':').slice(1).join(':'));
      i++; continue;
    }
    if (/^tags:/.test(line)) {
      existing.tags = parseInlineArray(line.split(':').slice(1).join(':'));
      i++; continue;
    }
    if (/^reminders:\s*$/.test(line)) {
      // consume block
      i++;
      while (i < lines.length && (/^\s/.test(lines[i]) || lines[i] === '')) {
        const sub = lines[i];
        const mList = sub.match(/^\s*listName:\s*(.*)$/);
        if (mList) existing.remindersListName = mList[1].replace(/^"|"$/g, '');
        i++;
      }
      continue;
    }
    preserved.push(line);
    i++;
  }

  const name = (existing.name && existing.name.replace(/^"|"$/g, '')) || fileBaseName;
  const personId = existing.personId || '';
  const aliases = Array.isArray(existing.aliases) ? existing.aliases.slice() : [];
  if (!aliases.includes(name)) aliases.push(name);
  const tags = Array.isArray(existing.tags) ? existing.tags.slice() : [];
  if (!tags.includes('people')) tags.push('people');
  const listName = existing.remindersListName || name;

  const newFm = [
    `personId: ${personId}`,
    `name: ${name}`,
    `aliases: ${toInlineArray(aliases)}`,
    `tags: ${toInlineArray(tags)}`,
    'reminders:',
    `  listName: "${listName}"`
  ];

  // append any preserved unknown lines
  for (const pl of preserved) {
    if (pl.trim() === '') continue;
    newFm.push(pl);
  }

  return newFm.join('\n');
}

function processFile(filePath) {
  const base = path.basename(filePath, '.md');
  const raw = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = extractFrontmatter(raw);

  // Identify person pages ONLY if frontmatter exists and explicitly marks as people or has person signals
  if (!frontmatter) return false;
  const tagsMatch = frontmatter.match(/\btags:\s*\[([^\]]*)\]/);
  const hasPeopleTag = !!(tagsMatch && parseInlineArray(tagsMatch[0].split(':')[1]).includes('people'));
  const hasPersonId = /\bpersonId:\s*\S+/.test(frontmatter);
  const hasRemindersList = /\breminders:\s*[\s\S]*?\blistName:\s*\S+/.test(frontmatter);
  const isPerson = hasPeopleTag || hasPersonId || hasRemindersList;
  if (!isPerson) return false;

  let newContent;
  if (frontmatter) {
    const updated = updateFrontmatter(frontmatter, base);
    newContent = `---\n${updated}\n---\n${body}`;
  } else {
    const updated = updateFrontmatter('', base);
    newContent = `---\n${updated}\n---\n${raw}`;
  }
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

function main() {
  const entries = fs.readdirSync(vaultRoot, { withFileTypes: true });
  const ignoreNames = new Set(['dailynote', 'reminders', 'Attachments', 'attachments', 'templates', '.git']);
  let updatedCount = 0;
  for (const e of entries) {
    if (e.isDirectory()) continue;
    if (!e.name.endsWith('.md')) continue;
    if (ignoreNames.has(e.name)) continue;
    if (/^\d{4}[-_]/.test(e.name)) continue; // ignore date-like files
    const full = path.join(vaultRoot, e.name);
    try {
      if (processFile(full)) updatedCount++;
    } catch (err) {
      // skip errors per file
    }
  }
  console.log(`Updated ${updatedCount} person pages`);
}

main();


