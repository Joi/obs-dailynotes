#!/usr/bin/env node
/**
 * Fetch public web snippets about a person and cache them for enrichment.
 * Priority: Tavily API (TAVILY_API_KEY) → Wikipedia summary → empty.
 * Usage:
 *   PERSON_KEY="Full Name" node tools/fetchPublicSnippets.js
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function cachePathFor(personKey) {
  const root = path.join(__dirname, '..', 'data', 'people_cache');
  ensureDir(root);
  return path.join(root, slugify(personKey) + '.json');
}

function mergeCache(filePath, merge) {
  let existing = {};
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch {}
  }
  const data = existing.data || {};
  const merged = { timestamp: new Date().toISOString(), data: { ...data, ...merge } };
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  return merged;
}

async function fetchTavilySnippets(query, apiKey, maxResults = 3) {
  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ query, search_depth: 'basic', max_results: maxResults, include_answer: false, include_raw_content: false })
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results.map(r => ({ title: r.title || '', url: r.url || '', snippet: r.snippet || r.content || '' })).filter(r => r.url);
  } catch { return []; }
}

async function fetchWikipediaSummary(name) {
  try {
    const title = encodeURIComponent(name.replace(/\s+/g, '_'));
    const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data.extract) return [{ title: data.title || name, url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`, snippet: data.extract }];
    return [];
  } catch { return []; }
}

async function main() {
  const personKey = process.env.PERSON_KEY;
  if (!personKey) { console.error('Set PERSON_KEY'); process.exit(1); }
  const tavilyKey = process.env.TAVILY_API_KEY;
  let snippets = [];
  const query = `${personKey} bio profile`;
  if (tavilyKey) snippets = await fetchTavilySnippets(query, tavilyKey, 3);
  if (snippets.length === 0) snippets = await fetchWikipediaSummary(personKey);
  const cacheFile = cachePathFor(personKey);
  mergeCache(cacheFile, { publicSnippets: snippets });
  console.log(`Cached ${snippets.length} public snippets for ${personKey} at ${cacheFile}`);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}

module.exports = { fetchTavilySnippets, fetchWikipediaSummary };


