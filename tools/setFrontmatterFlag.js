#!/usr/bin/env node
/**
 * Set or update a YAML frontmatter flag on a person page in the vault.
 * Usage:
 *   node tools/setFrontmatterFlag.js --file "Adam Back.md" --key gmail_deep --value true
 *   or
 *   PERSON_FILE="Adam Back.md" FLAG_KEY=gmail_deep FLAG_VALUE=true node tools/setFrontmatterFlag.js
 */
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--file') out.file = args[++i];
    else if (a === '--key') out.key = args[++i];
    else if (a === '--value') out.value = args[++i];
  }
  out.file = out.file || process.env.PERSON_FILE;
  out.key = out.key || process.env.FLAG_KEY;
  out.value = out.value ?? process.env.FLAG_VALUE;
  if (!out.file || !out.key) {
    console.error('Usage: --file <person.md> --key <flag> [--value <value>]');
    process.exit(1);
  }
  return out;
}

function ensureFrontmatter(text, personName) {
  if (text.startsWith('---')) return text;
  const name = personName || 'Unknown';
  return `---\nname: ${name}\n---\n\n${text}`;
}

function setFlagInFrontmatter(text, key, value) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return text;
  let fm = m[1];
  const body = text.slice(m[0].length);
  const re = new RegExp(`^${key}:.*$`, 'm');
  const val = String(value);
  if (re.test(fm)) {
    fm = fm.replace(re, `${key}: ${val}`);
  } else {
    fm = fm.replace(/[\s\r\n]+$/, '');
    fm += `\n${key}: ${val}\n`;
  }
  return `---\n${fm}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`;
}

function main() {
  const { file, key, value } = parseArgs();
  const abs = path.isAbsolute(file) ? file : path.join('/Users/<Owner>/switchboard', file);
  if (!fs.existsSync(abs)) {
    console.error('Not found:', abs);
    process.exit(1);
  }
  let text = fs.readFileSync(abs, 'utf8');
  const personName = path.basename(abs, '.md');
  text = ensureFrontmatter(text, personName);
  text = setFlagInFrontmatter(text, key, value);
  fs.writeFileSync(abs, text);
  console.log(`Set ${key}: ${value} in ${abs}`);
}

if (require.main === module) {
  main();
}


