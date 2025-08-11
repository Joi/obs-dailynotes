#!/usr/bin/env node
/**
 * Recursively scan the vault for markdown files tagged as people in YAML frontmatter.
 * Prints one name per line (filename without extension).
 * Env:
 *  - ROOT (default: /Users/joi/switchboard)
 *  - EXCLUDE (comma-separated names to exclude)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.ROOT || '/Users/joi/switchboard';
const excludeSet = new Set(String(process.env.EXCLUDE || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean));

function listFilesRec(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^Private$/.test(e.name)) continue;
      out.push(...listFilesRec(p));
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

function hasPeopleTag(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return false;
    const fm = m[1];
    // Inline: tags: [people, ...] OR tags: people
    if (/^tags:\s*\[[^\]]*\bpeople\b[^\]]*\]\s*$/mi.test(fm)) return true;
    if (/^tags:\s*people\s*$/mi.test(fm)) return true;
    // Multiline block
    const mm = fm.match(/^tags:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
    if (mm) {
      const block = mm[1];
      if (/^\s*-\s*people\s*$/mi.test(block)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function main() {
  const files = listFilesRec(ROOT);
  const people = [];
  for (const f of files) {
    if (hasPeopleTag(f)) {
      const name = path.basename(f, '.md');
      if (!excludeSet.has(name)) people.push(name);
    }
  }
  // Stable sort
  people.sort((a, b) => a.localeCompare(b));
  for (const n of people) console.log(n);
}

main();


