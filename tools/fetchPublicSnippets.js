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
  const abs = path.join('/Users/<Owner>/switchboard', `${personKey}.md`);
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

  const links = extractLinksFromPersonPage(personKey);
  const wikipedia = await fetchWikipediaSummary(personKey);
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



