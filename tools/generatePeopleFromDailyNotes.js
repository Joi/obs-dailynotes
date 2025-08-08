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
const peopleIndexPath = path.join(vaultRoot, 'people.index.json');
const args = process.argv.slice(2);
const shouldWrite = args.includes('--write') || process.env.WRITE === 'true';

function listDailyNoteFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^(\d{4}-\d{2}-\d{2})\.md$/.test(f))
    .map((f) => ({ name: f, full: path.join(dir, f) }))
    .sort((a, b) => (a.name < b.name ? 1 : -1)); // newest first
}

function extractAttendeeLinks(content) {
  const results = [];
  const linkRegex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g; // [[target|display]]
  let m;
  while ((m = linkRegex.exec(content)) !== null) {
    const target = m[1];
    const display = m[2];
    results.push({ target, display });
  }
  return results;
}

function loadPeopleIndex() {
  try {
    return JSON.parse(fs.readFileSync(peopleIndexPath, 'utf8'));
  } catch {
    return {};
  }
}

function buildKnownSets(index) {
  const knownNames = new Set();
  const knownEmails = new Set();
  for (const [key, info] of Object.entries(index)) {
    if (info && info.name) knownNames.add(info.name);
    if (Array.isArray(info.aliases)) for (const a of info.aliases) knownNames.add(a);
    if (Array.isArray(info.emails)) for (const e of info.emails) knownEmails.add(e);
  }
  return { knownNames, knownEmails };
}

function titleCaseFromEmail(email) {
  const local = email.split('@')[0];
  const parts = local.replace(/[._-]+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) return email;
  const cased = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  return cased.join(' ');
}

function main() {
  const files = listDailyNoteFiles(dailyDir);
  const peopleIndex = loadPeopleIndex();
  const { knownNames, knownEmails } = buildKnownSets(peopleIndex);

  const candidateMap = new Map(); // key: email or display name
  for (const f of files) {
    const content = fs.readFileSync(f.full, 'utf8');
    const links = extractAttendeeLinks(content);
    for (const { target, display } of links) {
      // Heuristics: prefer email if either side looks like an email
      const isEmail = (s) => /@/.test(s);
      const email = isEmail(display) ? display : isEmail(target) ? target : null;
      const name = !isEmail(display) ? display : email ? titleCaseFromEmail(email) : display;

      // Skip obviously non-person placeholders
      if (/no attendees listed/i.test(name)) continue;

      const key = email || name;
      if (!candidateMap.has(key)) {
        candidateMap.set(key, { name, emails: new Set(), aliases: new Set() });
      }
      const c = candidateMap.get(key);
      c.aliases.add(name);
      if (email) c.emails.add(email);
    }
  }

  const toCreate = [];
  for (const [key, c] of candidateMap) {
    // Skip if known by email or name
    const hasKnownEmail = Array.from(c.emails).some((e) => knownEmails.has(e));
    if (hasKnownEmail || knownNames.has(c.name)) continue;
    // Skip if a file already exists with this name
    const fileName = `${c.name}.md`;
    if (fs.existsSync(path.join(vaultRoot, fileName))) continue;
    toCreate.push({
      name: c.name,
      emails: Array.from(c.emails),
      aliases: Array.from(c.aliases),
      fileName,
    });
  }

  if (!shouldWrite) {
    console.log(`Candidates (dry-run): ${toCreate.length}`);
    for (const x of toCreate.slice(0, 50)) {
      console.log(`- ${x.name}  emails=[${x.emails.join(', ')}]  file=${x.fileName}`);
    }
    if (toCreate.length > 50) console.log('...');
    console.log('Run with --write to create pages.');
    return;
  }

  let created = 0;
  for (const x of toCreate) {
    const fp = path.join(vaultRoot, x.fileName);
    const fm = [
      '---',
      `name: ${x.name}`,
      x.emails.length ? `emails: [${x.emails.map((e) => (e.includes(' ') ? `"${e}"` : e)).join(', ')}]` : 'emails: []',
      x.aliases.length ? `aliases: [${x.aliases.map((n) => (n.includes(' ') ? `"${n}"` : n)).join(', ')}]` : 'aliases: []',
      'reminders:',
      `  listName: "${x.name}"`,
      '---',
      `# ${x.name}`,
      '',
    ].join('\n');
    try {
      fs.writeFileSync(fp, fm + '\n', 'utf8');
      created++;
    } catch (_) {}
  }
  console.log(`Created ${created} people pages`);
}

main();


