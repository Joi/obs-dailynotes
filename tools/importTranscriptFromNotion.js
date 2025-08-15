#!/usr/bin/env node
/*
  Import summary and to-dos from Notion pages linked in today's daily note.
  - Keeps full transcript in Notion; only pulls a concise summary and to-do items
  - Inserts under each meeting's "Notes" area
  - Skips if already imported for the same URL
*/
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('@notionhq/client');
const { writeFileAtomic } = require('../lib/fsSafe');
const { normalizeMarkdownSpacing } = require('../lib/formatUtils');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
// CLI overrides
const argv = process.argv.slice(2);
let argDate = null;
let argNotePath = null;
for (const a of argv) {
  if (a.startsWith('--date=')) argDate = a.substring('--date='.length).trim();
  if (a.startsWith('--note=')) argNotePath = a.substring('--note='.length).trim();
  if (a.startsWith('--path=')) argNotePath = a.substring('--path='.length).trim();
}
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';

if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY is not set. Create a Notion internal integration and share pages to it.');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

function getDailyNotePathFromDate(ymd) {
  // ymd: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return path.join(dailyDir, `${ymd}.md`);
}

function resolveTargetNotePath() {
  if (argNotePath) {
    // If relative, resolve within dailyDir
    return path.isAbsolute(argNotePath) ? argNotePath : path.join(dailyDir, argNotePath);
  }
  if (argDate) {
    const p = getDailyNotePathFromDate(argDate);
    if (p) return p;
  }
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
}

function extractNotionUrls(text) {
  const re = /https?:\/\/(?:www\.)?notion\.so\/[\S)]+/g;
  const urls = new Set();
  let m;
  while ((m = re.exec(text)) !== null) urls.add(m[0]);
  return Array.from(urls);
}

function normalizePageIdFromUrl(url) {
  try {
    const u = new URL(url);
    // Prefer ?p= param
    const pParam = u.searchParams.get('p');
    let idRaw = pParam || u.pathname.split('/').pop() || '';
    idRaw = idRaw.replace(/[^a-fA-F0-9]/g, '');
    if (idRaw.length !== 32) return null;
    // Insert dashes 8-4-4-4-12
    return `${idRaw.slice(0, 8)}-${idRaw.slice(8, 12)}-${idRaw.slice(12, 16)}-${idRaw.slice(16, 20)}-${idRaw.slice(20)}`;
  } catch (_) {
    return null;
  }
}

function richTextToPlain(rt = []) {
  return (Array.isArray(rt) ? rt : []).map(t => (t.plain_text || '')).join('');
}

async function fetchAllChildren(blockId) {
  let results = [];
  let cursor = undefined;
  const withRetry = async (op, tries = 3) => {
    let attempt = 0;
    while (true) {
      try { return await op(); }
      catch (e) {
        attempt++;
        const code = (e && (e.code || (e.cause && e.cause.code))) || '';
        const retryable = ['ENOTFOUND','ECONNRESET','ETIMEDOUT','EAI_AGAIN'].includes(String(code));
        if (!retryable || attempt >= tries) throw e;
        await new Promise(r => setTimeout(r, 500 * attempt * attempt));
      }
    }
  };
  do {
    const res = await withRetry(() => notion.blocks.children.list({ block_id: blockId, start_cursor: cursor }));
    results = results.concat(res.results || []);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function fetchBlocksRecursive(rootId, maxDepth = 3) {
  const out = [];
  async function walk(blockId, depth) {
    if (depth > maxDepth) return;
    const kids = await fetchAllChildren(blockId);
    for (const k of kids) {
      out.push(k);
      if (k.has_children) {
        try { await walk(k.id, depth + 1); } catch (_) {}
      }
    }
  }
  await walk(rootId, 1);
  return out;
}

function collectSummary(blocks) {
  // Heuristic: gather content under first heading named like "Summary" or "Key takeaways"
  const isHeading = (b) => b.type && b.type.startsWith('heading_');
  const headingText = (b) => richTextToPlain((b[b.type] || {}).rich_text || []).trim();
  let startIdx = -1;
  let startLevel = 7;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (isHeading(b)) {
      const txt = headingText(b).toLowerCase();
      if (/^(summary|tl;?dr|highlights|recap)\b|\bkey\s*takeaways?\b/.test(txt)) {
        startIdx = i;
        startLevel = Number(b.type.split('_')[1]) || 1;
        break;
      }
    }
  }
  if (startIdx === -1) {
    // Fallback: take first N bullets/paragraphs from the document
    const lines = [];
    for (const b of blocks) {
      if (b.type === 'bulleted_list_item' || b.type === 'numbered_list_item') {
        const t = richTextToPlain(b[b.type].rich_text || []).trim();
        if (t) lines.push(`- ${t}`);
      } else if (b.type === 'paragraph') {
        const t = richTextToPlain(b.paragraph.rich_text || []).trim();
        if (t) lines.push(`- ${t}`);
      }
      if (lines.length >= 12) break;
    }
    return Array.from(new Set(lines));
  }
  const lines = [];
  for (let i = startIdx + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (isHeading(b)) {
      const level = Number(b.type.split('_')[1]) || 1;
      if (level <= startLevel) break; // stop at next section
    }
    if (b.type === 'bulleted_list_item' || b.type === 'numbered_list_item') {
      const t = richTextToPlain(b[b.type].rich_text || []).trim();
      if (t) lines.push(`- ${t}`);
    } else if (b.type === 'paragraph') {
      const t = richTextToPlain(b.paragraph.rich_text || []).trim();
      if (t) lines.push(`- ${t}`);
    }
  }
  // Deduplicate and cap
  const uniq = Array.from(new Set(lines)).slice(0, 12);
  return uniq;
}

function collectTodos(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'to_do' && b.to_do) {
      const t = richTextToPlain(b.to_do.rich_text || []).trim();
      if (t) out.push({ checked: !!b.to_do.checked, title: t });
    }
  }
  return out;
}

function buildImportSnippet(url, summaryLines, todos) {
  const parts = [];
  parts.push(`- Notion: ${url}`);
  parts.push('<details>');
  parts.push('<summary>Summary & To-Dos</summary>');
  parts.push('');
  if (summaryLines.length) {
    parts.push('#### Summary');
    parts.push(...summaryLines);
    parts.push('');
  }
  if (todos.length) {
    parts.push('#### To-Dos');
    for (const t of todos) parts.push(`- [${t.checked ? 'x' : ' '}] ${t.title}`);
    parts.push('');
  }
  parts.push('</details>');
  parts.push('');
  return parts.join('\n');
}

function insertIntoMeetingBlock(noteText, url, snippet) {
  // Find the meeting block that contains the URL
  const blockRegex = /(<!--\s*BEGIN MEETING\s+.+?\s*-->)([\s\S]*?)(<!--\s*END MEETING\s+.+?\s*-->)/g;
  let changed = false;
  const replaced = noteText.replace(blockRegex, (m, begin, inner, end) => {
    if (!inner.includes(url)) return m;
    // Consider it already imported only if the URL exists and we've already added a Summary & To-Dos block
    if (inner.includes(url) && /<summary>Summary & To-Dos<\/summary>/.test(inner)) return m;
    // Try to insert after "Notes" anchor if present
    const notesAnchor = /(^|\n)Notes\s*\n/;
    if (notesAnchor.test(inner)) {
      const newInner = inner.replace(notesAnchor, (mm) => mm + snippet + '\n');
      changed = true;
      return begin + newInner + end;
    }
    // Else, insert before end
    const newInner = inner + (inner.endsWith('\n') ? '' : '\n') + snippet + '\n';
    changed = true;
    return begin + newInner + end;
  });
  return { text: changed ? replaced : noteText, changed };
}

async function main() {
  const targetPath = resolveTargetNotePath();
  if (!fs.existsSync(targetPath)) {
    console.error(`Daily note not found: ${targetPath}`);
    process.exit(1);
  }
  const original = fs.readFileSync(targetPath, 'utf8');
  const urls = extractNotionUrls(original).filter(u => !/#no-import\b/i.test(u));
  if (urls.length === 0) {
    console.log('No Notion URLs found to import.');
    return;
  }

  let txt = original;
  for (const url of urls) {
    const pageId = normalizePageIdFromUrl(url);
    if (!pageId) {
      console.warn(`Could not extract page ID from: ${url}`);
      continue;
    }
    try {
      // Fetch children (page content is under the root block as children of the page)
      const blocks = await fetchBlocksRecursive(pageId);
      const summary = collectSummary(blocks);
      const todos = collectTodos(blocks);
      if (summary.length === 0 && todos.length === 0) {
        console.log(`No summary/todos detected for ${url}; skipping.`);
        continue;
      }
      const snippet = buildImportSnippet(url, summary, todos);
      const res = insertIntoMeetingBlock(txt, url, snippet);
      txt = res.text;
    } catch (e) {
      console.error(`Failed to import from Notion for ${url}:`, e.message);
    }
  }

  const out = normalizeMarkdownSpacing(txt);
  if (out !== original) {
    await writeFileAtomic(targetPath, out, 'utf8');
    console.log(`Imported Notion summary/todos into ${path.basename(targetPath)}.`);
  } else {
    console.log('No changes made.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


