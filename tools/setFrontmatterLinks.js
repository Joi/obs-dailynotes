#!/usr/bin/env node
/**
 * Upsert links in YAML frontmatter: links:
 * Usage:
 *   node tools/setFrontmatterLinks.js --file "Adam Back.md" github=https://github.com/adam3us twitter=https://twitter.com/adam3us homepage=https://blockstream.com/
 */
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { kv: {} };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--file') out.file = args[++i];
    else if (/^[a-zA-Z0-9_-]+=/.test(a)) {
      const [k, v] = a.split('=');
      out.kv[k] = v;
    }
  }
  if (!out.file) out.file = process.env.PERSON_FILE;
  if (!out.file || !Object.keys(out.kv).length) {
    console.error('Usage: --file <person.md> key=url [key=url] ...');
    process.exit(1);
  }
  return out;
}

function ensureFrontmatter(text, name) {
  if (text.startsWith('---')) return text;
  return `---\nname: ${name}\n---\n\n${text}`;
}

function upsertLinks(fm, kv) {
  // Remove existing links block; we'll rebuild
  fm = fm.replace(/^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/gm, '');
  fm = fm.replace(/[\s\r\n]+$/, '');
  const lines = ['links:'];
  for (const [k, v] of Object.entries(kv)) {
    if (!v) continue;
    lines.push(`  ${k}: "${v}"`);
  }
  return `${fm}\n${lines.join('\n')}\n`;
}

function main() {
  const { file, kv } = parseArgs();
  const abs = path.isAbsolute(file) ? file : path.join('/Users/joi/switchboard', file);
  if (!fs.existsSync(abs)) { console.error('Not found:', abs); process.exit(1); }
  let text = fs.readFileSync(abs, 'utf8');
  const name = path.basename(abs, '.md');
  text = ensureFrontmatter(text, name);
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = m ? m[1] : '';
  const body = m ? text.slice(m[0].length) : text;
  const fm2 = upsertLinks(fm, kv);
  const out = `---\n${fm2}---\n${body.startsWith('\n') ? '' : '\n'}${body}`;
  fs.writeFileSync(abs, out);
  console.log('Updated links in', abs);
}

if (require.main === module) main();


