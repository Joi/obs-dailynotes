#!/usr/bin/env node
/**
 * Upsert the canonical person template into a person page.
 *
 * Usage:
 *   PERSON_FILE="/Users/joi/switchboard/Person Name.md" node tools/upsertPersonTemplate.js
 *   PERSON_KEY="Person Name" [PERSON_EMAIL="email@example.com"] node tools/upsertPersonTemplate.js
 *   node tools/upsertPersonTemplate.js "/Users/joi/switchboard/Person Name.md"
 *
 * Behavior:
 * - If file does not exist, create it with the canonical template
 * - If exists with no frontmatter, insert canonical frontmatter
 * - If frontmatter exists, ensure required keys exist; do not overwrite existing values
 * - Try to extract an email from PERSON_EMAIL or the macOS clipboard (pbpaste)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message) {
  try {
    const logsDir = path.join(__dirname, '..', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(path.join(logsDir, 'upsertPersonTemplate.log'), line);
  } catch {}
}

function readClipboard() {
  try { return execSync('pbpaste', { encoding: 'utf8' }); } catch { return ''; }
}

function extractEmail(text) {
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const m = (text || '').match(re);
  return m ? m[0] : null;
}

function resolvePersonFileFromArgs() {
  const sanitize = (raw) => {
    if (!raw) return raw;
    let p = String(raw);
    // Strip surrounding quotes if any
    p = p.replace(/^['"]|['"]$/g, '');
    // Remove backslash-escapes that Shell commands shows (e.g., \/Users\/, \ )
    p = p.replace(/\\(?=[\/.\s])/g, '');
    // Expand ~/
    if (p.startsWith('~/')) p = path.join(process.env.HOME || '', p.slice(2));
    return p;
  };

  const cliArg = sanitize(process.argv[2]);
  const envFile = sanitize(process.env.PERSON_FILE);
  const envKey = process.env.PERSON_KEY;
  const baseDir = '/Users/joi/switchboard';
  // If the value already looks absolute to the vault and accidentally includes the baseDir again, strip the duplicate
  const normalizeVaultPath = (p) => {
    if (!p) return p;
    if (p.startsWith(baseDir + '/' + baseDir)) return p.replace(baseDir + '/', '');
    return p;
  };

  if (envFile) {
    const p = path.isAbsolute(envFile) ? envFile : path.join(baseDir, envFile);
    return normalizeVaultPath(p);
  }
  if (cliArg) {
    const p = path.isAbsolute(cliArg) ? cliArg : path.join(baseDir, cliArg);
    return normalizeVaultPath(p);
  }
  if (envKey) return path.join(baseDir, `${envKey}.md`);
  console.error('Provide PERSON_FILE, PERSON_KEY, or a file path argument.');
  process.exit(1);
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function readFileSafe(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

function writeFileSafe(p, text) {
  ensureDir(path.dirname(p));
  const tmp = p + '.tmp-' + Date.now();
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, p);
}

function getFrontmatterBounds(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const start = m.index;
  const end = m.index + m[0].length;
  return { start, end, bodyStart: end };
}

function parseSimpleList(fm, key) {
  // Inline array: key: [a, b]
  const inline = fm.match(new RegExp(`^${key}:\\s*\\[(.*?)\\]`, 'm'));
  if (inline) {
    return inline[1].split(',').map(s => s.trim().replace(/^\"|\"$/g, '')).filter(Boolean);
  }
  // Block list: key:\n  - a\n  - b
  const block = fm.match(new RegExp(`^${key}:\\s*\n([\\s\\S]*?)(?=^\\w+:|$)`, 'm'));
  if (block) {
    return block[1].split(/\r?\n/).map(l => l.trim()).map(l => l.replace(/^[-\s]+/, '')).filter(Boolean);
  }
  return null;
}

function hasKey(fm, key) { return new RegExp(`^${key}:`, 'm').test(fm); }

function upsertFrontmatter(personFile) {
  const name = path.basename(personFile, '.md');
  const emailFromEnv = process.env.PERSON_EMAIL;
  const emailFromClip = extractEmail(readClipboard());
  const email = emailFromEnv || emailFromClip || null;

  let content = readFileSafe(personFile);
  if (!content) content = '';
  const bounds = getFrontmatterBounds(content);
  let fm = bounds ? content.slice(0, bounds.end) : '';
  let body = bounds ? content.slice(bounds.end).replace(/^\s+/, '') : content.replace(/^\s+/, '');

  if (!bounds) {
    // Create fresh canonical frontmatter
    const emailsBlock = email ? `emails: [${email}]\n` : 'emails: []\n';
    fm = [
      '---',
      `name: ${name}`,
      'tags: [person]',
      'aliases: []',
      emailsBlock.trimEnd(),
      'mail_depth: 1',
      'gmail_deep: false',
      'links:',
      '  website: ""',
      '  twitter: ""',
      '  github: ""',
      '  linkedin: ""',
      'documentation: false',
      '---',
      ''
    ].join('\n');
    const header = `# ${name}\n\n`;
    writeFileSafe(personFile, fm + (body ? body : header));
    console.log('Upserted person template (new frontmatter).');
    return;
  }

  // Update existing: append missing keys conservatively
  let fmText = content.slice(0, bounds.end);
  let fmBody = content.slice(bounds.end);
  let fmInner = fmText.replace(/^---\r?\n|\r?\n---$/g, '');

  // name
  if (!hasKey(fmInner, 'name')) fmInner = `name: ${name}\n` + fmInner;
  // tags include person
  if (hasKey(fmInner, 'tags')) {
    fmInner = fmInner.replace(/^tags:\s*\[(.*?)\]\s*$/m, (m, list) => {
      const arr = list.split(',').map(s => s.trim());
      if (!arr.map(s => s.replace(/\s/g,'')).includes('person')) arr.push(' person');
      return `tags: [${arr.join(', ')}]`;
    });
  } else {
    fmInner = `tags: [person]\n` + fmInner;
  }
  // aliases
  if (!hasKey(fmInner, 'aliases')) fmInner = `aliases: []\n` + fmInner;
  // emails
  if (!hasKey(fmInner, 'emails')) {
    const emailsLine = email ? `emails: [${email}]` : 'emails: []';
    fmInner = emailsLine + '\n' + fmInner;
  }
  // mail_depth, gmail_deep
  if (!hasKey(fmInner, 'mail_depth')) fmInner += `\nmail_depth: 1`;
  if (!hasKey(fmInner, 'gmail_deep')) fmInner += `\ngmail_deep: false`;
  // links block
  if (!/^links:\s*$/m.test(fmInner) && !/^links:\s*\n/m.test(fmInner)) {
    fmInner += `\nlinks:\n  website: ""\n  twitter: ""\n  github: ""\n  linkedin: ""`;
  }
  // documentation
  if (!hasKey(fmInner, 'documentation')) fmInner += `\ndocumentation: false`;

  // Reassemble
  const newFm = `---\n${fmInner.trim()}\n---\n\n`;
  const newText = newFm + fmBody.replace(/^\n+/, '');
  writeFileSafe(personFile, newText);
  console.log('Upserted person template (augmented frontmatter).');
}

function main() {
  try {
    const personFile = resolvePersonFileFromArgs();
    if (/\{\{.+\}\}/.test(personFile)) {
      const msg = 'Obsidian variable not expanded (got placeholder). Ensure Shell commands uses {{file_path:absolute}} and not running from Terminal.';
      log(msg);
      console.error(msg);
      process.exit(2);
    }
    log(`Upserting template for: ${personFile}`);
    upsertFrontmatter(personFile);
    console.log('Wrote:', personFile);
    log('Done');
  } catch (e) {
    log('Error: ' + (e && e.stack || e));
    console.error('upsertPersonTemplate error:', e.message);
    process.exit(1);
  }
}

if (require.main === module) main();


