#!/usr/bin/env node
/**
 * Add a recommended PDF for a person:
 * - Downloads (or copies) the PDF into ~/switchboard/Resources/PDFs/
 * - Creates a sibling .md note for annotations/metadata
 * - Adds a reminder task to Apple Reminders (person's list if present, else Reading)
 * - Upserts a link under "## Recommended PDFs" on the person's page
 *
 * Usage examples:
 *   node tools/addPdfNote.js --person "Danah Boyd" --url "https://example.com/file.pdf" --title "Great Paper" --due 2025-08-20
 *   node tools/addPdfNote.js --person "Danah Boyd" --file "/path/to/local.pdf" --title "Local PDF"
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, ''); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--person') out.person = args[++i];
    else if (a === '--url') out.url = args[++i];
    else if (a === '--file') out.file = args[++i];
    else if (a === '--title') out.title = args[++i];
    else if (a === '--due') out.due = args[++i];
  }
  if (!out.person) { console.error('Missing --person'); process.exit(1); }
  if (!out.url && !out.file) { console.error('Provide --url or --file'); process.exit(1); }
  return out;
}

function httpDownload(url, destPath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow one redirect
        return httpDownload(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(() => resolve()));
    }).on('error', (e) => reject(e));
  });
}

function readPeopleIndex() {
  try {
    // DAILY_NOTE_PATH must be set; derive vault root from it
    const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/joi/switchboard/dailynote';
    const vaultRoot = path.resolve(dailyDir, '..');
    const idxPath = path.join(vaultRoot, 'people.index.json');
    if (fs.existsSync(idxPath)) return JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  } catch {}
  return {};
}

function readPersonFrontmatterReminders(person) {
  try {
    const vaultRoot = path.join('/Users/joi/switchboard');
    const personFile = path.join(vaultRoot, `${person}.md`);
    if (!fs.existsSync(personFile)) return null;
    const txt = fs.readFileSync(personFile, 'utf8');
    const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return null;
    const fm = m[1];
    const block = fm.match(/^reminders:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
    if (block) {
      const mm = block[1].match(/\blistName:\s*"?([^"]+)"?/);
      if (mm && mm[1] && !/\{\{/.test(mm[1])) return { listName: mm[1].trim() };
    }
    return null;
  } catch { return null; }
}

function ensureRemindersList(listName) {
  try {
    const lists = execFileSync('reminders', ['show-lists'], { encoding: 'utf8' });
    if (!new RegExp(`(^|\n)${listName}(\n|$)`).test(lists)) {
      execFileSync('reminders', ['new-list', listName], { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function upsertRecommendedPdfsSection(personFilePath, pdfNoteRelPath, title) {
  let txt = fs.readFileSync(personFilePath, 'utf8');
  const entry = `- [[${pdfNoteRelPath}|${title}]]`;
  if (/^##\s*Recommended PDFs/m.test(txt)) {
    // Insert if not already present
    const sectionRe = /^##\s*Recommended PDFs\s*\n([\s\S]*?)(?=^##\s|\Z)/m;
    const m = txt.match(sectionRe);
    if (m && !m[1].includes(entry)) {
      txt = txt.replace(sectionRe, (whole, body) => {
        const bodyTrim = body.trimEnd();
        const newBody = bodyTrim.length ? `${bodyTrim}\n${entry}\n` : `${entry}\n`;
        return whole.replace(body, newBody);
      });
    }
  } else {
    // Create section after Bio or at end
    const block = `## Recommended PDFs\n${entry}\n`;
    if (/^##\s*Bio/m.test(txt)) {
      txt = txt.replace(/(^##\s*Bio[\s\S]*?)(?=^##\s|\Z)/m, (m0) => m0 + '\n' + block + '\n');
    } else {
      txt = txt.replace(/\n{3,}/g, '\n\n');
      txt = txt.trimEnd() + '\n\n' + block + '\n';
    }
  }
  // Normalize spacing
  txt = txt.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(personFilePath, txt);
}

async function main() {
  const { person, url, file, title: titleArg, due } = parseArgs();
  const title = titleArg || (url ? url.split('/').pop() : path.basename(file));
  const slug = slugify(title.replace(/\.pdf$/i, ''));
  const vaultRoot = path.join('/Users/joi/switchboard');
  const pdfDir = path.join(vaultRoot, 'Resources', 'PDFs');
  ensureDir(pdfDir);
  const pdfPath = path.join(pdfDir, `${slug}.pdf`);
  const notePath = path.join(pdfDir, `${slug}.md`);
  const noteRel = path.relative(vaultRoot, notePath);

  // Download or copy PDF
  if (url) {
    console.log('Downloading PDF:', url);
    await httpDownload(url, pdfPath);
  } else {
    const abs = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
    fs.copyFileSync(abs, pdfPath);
  }

  // Create note markdown
  const nowIso = new Date().toISOString();
  const md = [
    '---',
    `title: ${title}`,
    `added: ${nowIso}`,
    `recommended_by: ${person}`,
    `pdf_path: ${path.relative(vaultRoot, pdfPath)}`,
    url ? `pdf_url: ${url}` : null,
    'tags: [pdf, reading]',
    '---',
    '',
    `# ${title}`,
    '',
    '## Notes',
    '',
    '## Highlights',
    ''
  ].filter(Boolean).join('\n');
  fs.writeFileSync(notePath, md);
  console.log('Wrote note:', notePath);

  // Add reminder
  try {
    const idx = readPeopleIndex();
    const rec = idx[person];
    let listName = 'Reading';
    if (rec && rec.reminders && rec.reminders.listName && !/\{\{/.test(rec.reminders.listName)) {
      listName = rec.reminders.listName;
    } else {
      const fmRem = readPersonFrontmatterReminders(person);
      if (fmRem && fmRem.listName) listName = fmRem.listName;
    }
    const taskTitle = `Read PDF: ${title}`;
    const args = ['add', listName, taskTitle];
    // Attempt due if user provided; ignore errors if unsupported
    if (due) args.push(`due:${due}`);
    // Ensure list exists (best-effort)
    ensureRemindersList(listName);
    execFileSync('reminders', args, { stdio: 'ignore' });
    console.log('Added reminder task to list:', listName);
  } catch (e) {
    console.log('Note: Failed to add reminder task (install reminders-cli?):', e.message);
  }

  // Upsert link in person page
  const personFile = path.join(vaultRoot, `${person}.md`);
  if (fs.existsSync(personFile)) {
    upsertRecommendedPdfsSection(personFile, noteRel, title);
    console.log('Updated person page:', personFile);
  } else {
    console.log('Person page not found; skip linking. Path:', personFile);
  }
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });


