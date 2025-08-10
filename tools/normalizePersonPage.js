#!/usr/bin/env node
/**
 * Normalize a person page:
 * - Preserve existing frontmatter keys like emails
 * - Ensure only one links: block (keep first, remove duplicates)
 * - Collapse multiple blank lines to a single blank line
 * Usage:
 *   PERSON_FILE="Adam Back.md" node tools/normalizePersonPage.js
 *   or PERSON_KEY and it will look up ~/switchboard/<key>.md
 */
const fs = require('fs');
const path = require('path');

function collapseBlankLines(text) {
  return text.replace(/\n[ \t]*(?:\n[ \t]*)+/g, '\n\n').trimEnd() + '\n';
}

function dedupeLinksInFrontmatter(fm) {
  // Keep only the first links: block
  const re = /^links:\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/gm;
  const blocks = [...fm.matchAll(re)];
  if (blocks.length <= 1) return fm;
  const first = blocks[0][0];
  // Remove all occurrences, then insert the first at the end for stability
  fm = fm.replace(re, '');
  // Trim trailing whitespace and ensure newline
  fm = fm.replace(/[\s\r\n]+$/,'');
  fm += '\n' + first + '\n';
  return fm;
}

function normalizePersonFile(absPath) {
  if (!fs.existsSync(absPath)) {
    console.error('Not found:', absPath);
    process.exit(1);
  }
  const original = fs.readFileSync(absPath, 'utf8');
  const m = original.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    // No frontmatter: just collapse blank lines
    const cleaned = collapseBlankLines(original);
    if (cleaned !== original) fs.writeFileSync(absPath, cleaned);
    return { changed: cleaned !== original };
  }
  const fm = m[1];
  const body = original.slice(m[0].length);
  const fmClean = dedupeLinksInFrontmatter(fm).replace(/[\s\r\n]+$/,'');
  const bodyClean = collapseBlankLines(body);
  const rebuilt = `---\n${fmClean}\n---\n\n${bodyClean}`;
  if (rebuilt !== original) fs.writeFileSync(absPath, rebuilt);
  return { changed: rebuilt !== original };
}

function main() {
  const personFile = process.env.PERSON_FILE;
  const personKey = process.env.PERSON_KEY;
  const abs = personFile
    ? (path.isAbsolute(personFile) ? personFile : path.join('/Users/joi/switchboard', personFile))
    : (personKey ? path.join('/Users/joi/switchboard', `${personKey}.md`) : null);
  if (!abs) {
    console.error('Set PERSON_FILE or PERSON_KEY');
    process.exit(1);
  }
  const res = normalizePersonFile(abs);
  console.log(res.changed ? `Normalized: ${abs}` : `No changes: ${abs}`);
}

if (require.main === module) {
  main();
}


