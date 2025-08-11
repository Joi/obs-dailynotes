#!/usr/bin/env node
/**
 * Scan the vault for frontmatter patterns like:
 *   tags: [people]
 *     - people
 *     - something
 * and fix them to a single inline array: tags: [people, something]
 * Also removes duplicate keys inside the YAML block when obvious duplicates occur
 * with the same scalar type/structure.
 */
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/joi/switchboard';

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

function fixTagsInFrontmatter(fm) {
  let changed = false;
  // Detect inline tags followed by a YAML list block
  const lines = fm.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^tags:\s*\[[^\]]*\]\s*$/.test(line)) {
      // Capture any following list items indented
      const listItems = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s*\S/.test(lines[j])) {
        const item = lines[j].replace(/^\s*-\s*/, '').trim();
        listItems.push(item);
        j += 1;
      }
      if (listItems.length) {
        // Merge into inline array
        const inline = line.match(/^tags:\s*\[(.*?)\]\s*$/)[1]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const merged = Array.from(new Set([...inline, ...listItems]));
        out.push(`tags: [${merged.join(', ')}]`);
        i = j - 1; // skip consumed list lines
        changed = true;
        continue;
      }
    }
    out.push(line);
  }
  return { text: out.join('\n'), changed };
}

function fixFile(abs) {
  const original = fs.readFileSync(abs, 'utf8');
  const m = original.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return false;
  const fm = m[1];
  const body = original.slice(m[0].length);
  const { text: fmFixed, changed } = fixTagsInFrontmatter(fm);
  if (!changed) return false;
  const rebuilt = `---\n${fmFixed}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`;
  fs.writeFileSync(abs, rebuilt);
  return true;
}

function main() {
  const files = listFilesRec(ROOT);
  let fixed = 0;
  for (const f of files) {
    try { if (fixFile(f)) { console.log('Fixed:', f); fixed += 1; } } catch {}
  }
  console.log(`Done. Fixed ${fixed} files.`);
}

if (require.main === module) main();


