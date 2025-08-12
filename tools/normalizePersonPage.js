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
  return text
    .replace(/\n[ \t]*(?:\n[ \t]*)+/g, '\n\n')
    .replace(/^\s+/, '')
    .trimEnd() + '\n';
}

function dedupeLinksInFrontmatter(fm) {
  // Parse line-by-line and keep only the first links: block
  const lines = fm.split(/\r?\n/);
  const out = [];
  let seenLinks = false;
  let skipping = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const isKeyLine = /^[A-Za-z0-9_-]+:\s*(?:.|$)/.test(line) && !/^\s/.test(line);
    if (!seenLinks && /^links:\s*$/.test(line)) {
      seenLinks = true;
      skipping = false;
      out.push(line);
      // copy following indented lines that belong to this block
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const ln = lines[j];
        if (/^\s/.test(ln) && !/^[A-Za-z0-9_-]+:\s*(?:.|$)/.test(ln)) {
          out.push(ln);
        } else {
          break;
        }
      }
      i = j - 1;
      continue;
    }
    if (!seenLinks && isKeyLine) {
      out.push(line);
      continue;
    }
    if (seenLinks) {
      // If new links block appears, skip it and its indented children
      if (/^links:\s*$/.test(line)) {
        skipping = true;
        // skip children
        let j = i + 1;
        for (; j < lines.length; j += 1) {
          const ln = lines[j];
          if (/^\s/.test(ln) && !/^[A-Za-z0-9_-]+:\s*(?:.|$)/.test(ln)) {
            // skip
          } else {
            break;
          }
        }
        i = j - 1;
        continue;
      }
      skipping = false;
      out.push(line);
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function ensurePeopleTagInFrontmatter(fm) {
  // Ensure tags includes 'people'
  const lines = fm.split(/\r?\n/);
  let foundTags = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^tags:\s*$/i.test(line)) {
      lines[i] = 'tags: [person]';
      foundTags = true;
      break;
    }
    const m = line.match(/^tags:\s*\[(.*)\]\s*$/i);
    if (m) {
      foundTags = true;
      const inside = m[1].trim();
      const items = inside ? inside.split(',').map(s => s.trim()) : [];
      const hasPeople = items.some(s => /^['"]?people['"]?$/.test(s));
      if (!hasPeople) {
        items.push('people');
        lines[i] = `tags: [${items.join(', ')}]`;
      }
      break;
    }
  }
  if (!foundTags) {
    // Append tags at the end of frontmatter
    lines.push('tags: [person]');
  }
  return lines.join('\n');
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
  const fmClean = ensurePeopleTagInFrontmatter(dedupeLinksInFrontmatter(fm)).replace(/[\s\r\n]+$/,'');
  // Remove deprecated public section '## Connection'
  let bodyWork = body.replace(/(^##\s*Connection[\s\S]*?)(?=^##\s|\Z)/m, '').trimStart();
  // Rebuild Public Links from frontmatter links if present
  const linksMatch = fm.match(/^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/m);
  if (linksMatch) {
    const lines = linksMatch[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const map = {};
    for (const line of lines) {
      const kv = line.match(/^([a-zA-Z0-9_-]+):\s*"?([^\"]+)"?\s*$/);
      if (kv) map[kv[1]] = kv[2];
    }
    // Remove any existing Public Links sections
    bodyWork = bodyWork.replace(/^##\s*Public Links[\s\S]*?(?=^##\s|\Z)/m, '').trimStart();
    const order = ['wikipedia', 'homepage', 'twitter', 'github', 'linkedin'];
    const outLines = [];
    for (const k of order) {
      const v = map[k];
      if (v) {
        const label = k === 'twitter' ? 'Twitter/X' : (k[0].toUpperCase() + k.slice(1));
        outLines.push(`- ${label}: ${v}`);
      }
    }
    if (outLines.length) {
      const block = `## Public Links\n${outLines.join('\n')}\n`;
      if (/^##\s*Bio/m.test(bodyWork)) {
        bodyWork = bodyWork.replace(/(^##\s*Bio[\s\S]*?)(?=^##\s|\Z)/m, (m0) => m0 + '\n' + block + '\n');
      } else {
        bodyWork = bodyWork + '\n' + block + '\n';
      }
    }
  }
  const bodyClean = collapseBlankLines(bodyWork);
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


