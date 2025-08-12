#!/usr/bin/env node
/**
 * Fetch richer public content for a person and cache it under data/people_cache/<slug>.json
 * Sources:
 *  - Wikipedia summary (via REST)
 *  - GitHub profile (if github link present or guessable)
 *  - Twitter link (presence only via person page links)
 *
 * Usage:
 *   PERSON_KEY="Full Name" node tools/fetchPublicSnippets.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function cachePathFor(personKey) { const root = path.join(__dirname, '..', 'data', 'people_cache'); ensureDir(root); return path.join(root, slugify(personKey) + '.json'); }
function readCache(personKey) { const p = cachePathFor(personKey); if (!fs.existsSync(p)) return null; try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function writeCache(personKey, merge) { const p = cachePathFor(personKey); const existing = readCache(personKey) || {}; const data = existing.data || {}; const merged = { timestamp: new Date().toISOString(), data: { ...data, ...merge } }; fs.writeFileSync(p, JSON.stringify(merged, null, 2)); return merged; }

function httpJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'obs-dailynotes/1.0' } }, (res) => {
      let buf = '';
      res.on('data', (d) => (buf += d));
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function extractLinksFromPersonPage(personKey) {
  const abs = path.join('/Users/joi/switchboard', `${personKey}.md`);
  const links = {};
  if (!fs.existsSync(abs)) return links;
  try {
    const txt = fs.readFileSync(abs, 'utf8');
    const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (m) {
      const fm = m[1];
      const re = /^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/m;
      const mm = fm.match(re);
      if (mm) {
        const block = mm[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (const line of block) {
          const kv = line.match(/^([a-zA-Z0-9_-]+):\s*"?([^\"]+)"?\s*$/);
          if (kv) links[kv[1]] = kv[2];
        }
      }
    }
    // Also parse body Public Links section (more likely to have Twitter/GitHub)
    const body = txt.slice(m ? m[0].length : 0);
    const sec = body.match(/^##\s*Public Links[\s\S]*?(?=^##\s|\Z)/m);
    if (sec) {
      const re2 = /^-\s*([\w\s\/]+):\s*(\S+)/gm;
      let mm2;
      while ((mm2 = re2.exec(sec[0])) !== null) {
        const key = mm2[1].toLowerCase().trim();
        const url = mm2[2].trim();
        if (key.includes('wikipedia')) links.wikipedia = url;
        else if (key.includes('twitter')) links.twitter = url;
        else if (key.includes('github')) links.github = url;
        else if (key.includes('linkedin')) links.linkedin = url;
        else if (key.includes('homepage')) links.homepage = url;
        else if (key.includes('blockstream')) links.homepage = url;
      }
    }
  } catch {}
  return links;
}

async function fetchWikipediaSummary(name) {
  const title = encodeURIComponent(name.replace(/\s+/g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
  const data = await httpJson(url);
  if (!data || !data.extract) return null;
  return { url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`, summary: data.extract };
}

async function fetchGitHubProfile(username) {
  if (!username) return null;
  const data = await httpJson(`https://api.github.com/users/${encodeURIComponent(username)}`);
  if (!data || data.message === 'Not Found') return null;
  return { username, html_url: data.html_url, name: data.name, bio: data.bio, company: data.company, blog: data.blog, twitter_username: data.twitter_username };
}

function guessGitHubUsernameFromLinks(links) {
  const gh = links.github || '';
  const m = gh.match(/github\.com\/(.+)$/i);
  return m ? m[1].replace(/\/$/, '') : null;
}

async function main() {
  const personKey = process.env.PERSON_KEY;
  if (!personKey) { console.error('Set PERSON_KEY'); process.exit(1); }

  // Optional hints from config/people.json (backwards-compatible: value can be array or object)
  let peopleConfig = {};
  try {
    const cfgPath = path.join(__dirname, '..', 'config', 'people.json');
    if (fs.existsSync(cfgPath)) {
      peopleConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    }
  } catch { /* ignore */ }

  const links = extractLinksFromPersonPage(personKey);

  // Extract qualifier from personKey if present, supporting both "Name (Qualifier)" and "Name - Qualifier"
  const qualifierInfo = (() => {
    const original = String(personKey);
    let base = original;
    let qual = '';
    let m = original.match(/^(.+?)\s*\(([^)]+)\)\s*$/); // Parentheses form
    if (m) { base = m[1].trim(); qual = m[2].trim(); return { base, qualifier: qual }; }
    m = original.match(/^(.+?)\s*-\s*(.+)$/); // Hyphen form
    if (m) { base = m[1].trim(); qual = m[2].trim(); return { base, qualifier: qual }; }
    return { base, qualifier: '' };
  })();

  // Helper: Wikipedia search to resolve disambiguation
  async function searchWikipedia(query) {
    const api = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&utf8=1`;
    const res = await httpJson(api);
    try {
      const hits = res?.query?.search || [];
      if (!hits.length) return null;
      // Prefer exact title match if present; otherwise take the first
      const exact = hits.find(h => h?.title?.toLowerCase() === query.toLowerCase());
      const pick = exact || hits[0];
      return pick?.title || null;
    } catch { return null; }
  }

  function normalizeTokens(name) {
    const base = String(name || '')
      .replace(/\([^)]*\)/g, ' ') // drop qualifiers in parens
      .replace(/[-_]/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return base.split(' ').filter(Boolean);
  }

  function likelyMatchesTitle(candidateTitle, personName) {
    const strict = (process.env.STRICT_WIKI_MATCH || '1') !== '0';
    if (!strict) return true;
    const title = String(candidateTitle || '').replace(/_/g, ' ');
    const titleMain = title.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase();
    const nameTokens = normalizeTokens(personName);
    if (nameTokens.length < 2) return false;
    const [first, ...rest] = nameTokens;
    const last = rest[rest.length - 1];
    // Require both first and last name tokens to appear in the title main
    if (!titleMain.includes(first) || !titleMain.includes(last)) return false;
    return true;
  }

  // Determine target Wikipedia page
  async function resolveWikipedia() {
    // 1) If frontmatter/body links already contain a specific Wikipedia URL, trust it
    if (links.wikipedia && /^https?:\/\//i.test(links.wikipedia)) {
      const t = links.wikipedia.replace(/^https?:\/\/[^/]+\/wiki\//i, '').replace(/_/g, ' ');
      const byLink = await fetchWikipediaSummary(t);
      if (byLink) return byLink;
    }

    // 2) Config hint: allow object config like { "Michelle Lee (USPTO)": { wikipedia: "https://en.wikipedia.org/wiki/Michelle_K._Lee", qualifier: "USPTO" } }
    const cfgVal = peopleConfig[personKey];
    if (cfgVal && typeof cfgVal === 'object' && !Array.isArray(cfgVal)) {
      if (cfgVal.wikipedia) {
        const t = String(cfgVal.wikipedia).replace(/^https?:\/\/[^/]+\/wiki\//i, '').replace(/_/g, ' ');
        const byCfg = await fetchWikipediaSummary(t);
        if (byCfg) return byCfg;
      }
      if (cfgVal.wikipedia_title) {
        const byTitle = await fetchWikipediaSummary(String(cfgVal.wikipedia_title));
        if (byTitle) return byTitle;
      }
    }

    // 3) Try the personKey as-is
    let w = await fetchWikipediaSummary(personKey);
    const looksDisambig = (sum) => {
      const s = (sum?.summary || '').toLowerCase();
      return /may refer to:/.test(s) || /disambiguation/.test(s);
    };
    if (w && !looksDisambig(w) && likelyMatchesTitle(w.url?.split('/wiki/')[1] || '', personKey)) return w;

    // 4) If disambiguation and we have a qualifier, search with qualifier
    if (qualifierInfo.qualifier) {
      // Special-case: common agency/org qualifiers can imply middle initial names
      const queries = [
        `${qualifierInfo.base} ${qualifierInfo.qualifier}`,
        // Heuristic: if qualifier mentions USPTO or patent, try adding probable middle initial name variant
        (/uspto|patent/i.test(qualifierInfo.qualifier) ? `${qualifierInfo.base} K. Lee` : null)
      ].filter(Boolean);
      for (const q of queries) {
        const title = await searchWikipedia(q);
        if (title && likelyMatchesTitle(title, qualifierInfo.base)) {
          const bySearch = await fetchWikipediaSummary(title);
          if (bySearch && !looksDisambig(bySearch) && likelyMatchesTitle(title, qualifierInfo.base)) return bySearch;
        }
      }
    }

    // 5) Final fallback: if we can find any non-disambig via search on base name
    const t2 = await searchWikipedia(qualifierInfo.base);
    if (t2 && likelyMatchesTitle(t2, qualifierInfo.base)) {
      const byBase = await fetchWikipediaSummary(t2);
      if (byBase && !looksDisambig(byBase) && likelyMatchesTitle(t2, qualifierInfo.base)) return byBase;
    }
    return w; // return whatever we had (possibly disambig) so the rest of pipeline still runs
  }

  const wikipedia = await resolveWikipedia();
  const ghUser = guessGitHubUsernameFromLinks(links);
  const github = await fetchGitHubProfile(ghUser);

  const linksDetected = {};
  if (github) {
    if (github.blog && /^https?:\/\//i.test(github.blog)) linksDetected.homepage = github.blog;
    if (github.twitter_username) linksDetected.twitter = `https://twitter.com/${github.twitter_username}`;
    linksDetected.github = github.html_url;
  }
  if (wikipedia?.url) linksDetected.wikipedia = wikipedia.url;

  const publicRicher = { wikipedia, github, linksPresent: Object.keys(links).length ? links : undefined, linksDetected };
  writeCache(personKey, { publicRicher });
  console.log('Cached publicRicher for', personKey);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}



