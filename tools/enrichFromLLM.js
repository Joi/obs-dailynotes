#!/usr/bin/env node
/**
 * Use an LLM (OpenAI GPT-5 by default) to synthesize person page enrichment
 * Inputs: PERSON_KEY or PERSON_FILE, reads cache from data/people_cache,
 * and writes updates to the person page and Private/People/<slug>.md
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function loadCache(personKey) {
  const p = path.join(__dirname, '..', 'data', 'people_cache', slugify(personKey) + '.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function buildPrompt(personName, publicSnippets, cache) {
  return [
    `You are enriching a person page for ${personName}.`,
    `Use the structured context below. Return TWO sections:`,
    `1) Public fields to add to frontmatter (JSON) and a short public bio`,
    `2) Private notes (bulleted) based on my context (gmail/calendar)`,
    `\n--- CONTEXT (JSON) ---\n`,
    JSON.stringify({ publicSnippets, cache }, null, 2)
  ].join('\n');
}

async function callOpenAI(model, apiKey, prompt) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
  });
  if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function updatePersonPage(personFile, additions) {
  let content = fs.readFileSync(personFile, 'utf8');
  if (!content.startsWith('---')) content = `---\nname: ${path.basename(personFile, '.md')}\n---\n\n` + content;
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fmStr = m ? m[1] : '';
  const body = m ? content.slice(m[0].length) : content;
  const fm = {};
  fmStr.split(/\r?\n/).forEach(line => {
    const mm = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (mm) fm[mm[1]] = mm[2];
  });
  // Merge fields
  if (additions.links) fm.links = JSON.stringify(additions.links);
  if (additions.org) fm.org = additions.org;
  if (additions.title) fm.title = additions.title;
  if (Array.isArray(additions.keywords)) fm.keywords = JSON.stringify(additions.keywords);
  if (additions.timezone) fm.timezone = additions.timezone;
  if (Array.isArray(additions.languages)) fm.languages = JSON.stringify(additions.languages);
  fm.enrich = JSON.stringify({ source: 'openai', updated: new Date().toISOString() });

  // Rebuild frontmatter
  let newFm = '---\n';
  Object.entries(fm).forEach(([k, v]) => { newFm += `${k}: ${v}\n`; });
  newFm += '---\n\n';
  let newBody = body;
  if (additions.publicBio) {
    if (!newBody.includes('## Overview')) newBody = '## Overview\n\n' + newBody;
    newBody = newBody.replace('## Overview', '## Overview\n\n' + additions.publicBio);
  }
  fs.writeFileSync(personFile, newFm + newBody);
}

function writePrivate(personKey, text) {
  const pdir = path.join('/Users/<Owner>/switchboard', 'Private', 'People');
  ensureDir(pdir);
  const p = path.join(pdir, slugify(personKey) + '.md');
  fs.writeFileSync(p, text);
  return p;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-5';
  const personFile = process.env.PERSON_FILE; // absolute or vault-relative
  const personKey = process.env.PERSON_KEY || (personFile ? path.basename(personFile, '.md') : '');
  if (!apiKey) { console.error('Missing OPENAI_API_KEY'); process.exit(1); }
  if (!personKey) { console.error('Set PERSON_KEY or PERSON_FILE'); process.exit(1); }

  const cache = loadCache(personKey) || {};
  const publicSnippets = []; // placeholder for future web snippets
  const prompt = buildPrompt(personKey, publicSnippets, cache);
  const output = await callOpenAI(model, apiKey, prompt);

  // Simple parse heuristic: split sections
  const parts = output.split(/\n-{3,}\n|\n\*\*Private\*\*|\n##\s*Private/i);
  const publicJsonMatch = output.match(/\{[\s\S]*\}/);
  let publicFields = {};
  try { if (publicJsonMatch) publicFields = JSON.parse(publicJsonMatch[0]); } catch {}

  const privateText = output; // write full output to private for review

  const fullPath = personFile && path.isAbsolute(personFile)
    ? personFile
    : (personFile ? path.join('/Users/<Owner>/switchboard', personFile) : path.join('/Users/<Owner>/switchboard', `${personKey}.md`));
  if (fs.existsSync(fullPath)) {
    updatePersonPage(fullPath, publicFields);
  } else {
    console.log('Person file not found; creating minimal page.');
    fs.writeFileSync(fullPath, `---\nname: ${personKey}\ntags: [people]\n---\n\n# ${personKey}\n`);
    updatePersonPage(fullPath, publicFields);
  }
  const privPath = writePrivate(personKey, privateText);
  console.log('Wrote private notes:', privPath);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}


