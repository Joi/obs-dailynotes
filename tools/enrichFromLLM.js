#!/usr/bin/env node
/**
 * Use an LLM (OpenAI GPT-5 by default) to synthesize person page enrichment
 * Inputs: PERSON_KEY or PERSON_FILE, reads cache from data/people_cache,
 * and writes updates to the person page and Private/People/<slug>.md
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');
const { spawnSync } = require('child_process');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function loadCache(personKey) {
  const p = path.join(__dirname, '..', 'data', 'people_cache', slugify(personKey) + '.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function readFrontmatterInfo(personFilePath) {
  try {
    if (!personFilePath || !fs.existsSync(personFilePath)) return { emails: [], gmail_deep: false };
    const txt = fs.readFileSync(personFilePath, 'utf8');
    const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return { emails: [], gmail_deep: false };
    const fm = m[1];
    const out = { emails: [], gmail_deep: false };
    // emails: inline
    const emailsInline = fm.match(/^emails:\s*\[(.*?)\]/m);
    if (emailsInline) {
      out.emails = emailsInline[1]
        .split(',')
        .map(s => s.replace(/^[\s"\']+|[\s"\']+$/g, ''))
        .filter(Boolean);
    } else {
      const mm = fm.match(/^emails:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
      if (mm) {
        out.emails = mm[1]
          .split(/\r?\n/)
          .map(l => l.trim().replace(/^[-\s]+/, ''))
          .filter(l => /@/.test(l));
      }
    }
    const deep = fm.match(/^gmail_deep:\s*(true|false)/mi);
    if (deep) out.gmail_deep = /true/i.test(deep[1]);
    const depth = fm.match(/^mail_depth:\s*(\d+)/mi);
    if (depth) {
      const n = parseInt(depth[1], 10);
      if (!Number.isNaN(n)) out.mail_depth = n;
    }
    return out;
  } catch {
    return { emails: [], gmail_deep: false };
  }
}

function loadPeopleConfigEmails(personKey) {
  try {
    const cfgPath = path.join(__dirname, '..', 'config', 'people.json');
    if (!fs.existsSync(cfgPath)) return [];
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    const val = cfg[personKey];
    if (!val) return [];
    if (Array.isArray(val)) return val.filter((e) => /@/.test(e));
    if (val && typeof val === 'object' && Array.isArray(val.emails)) return val.emails.filter((e) => /@/.test(e));
    return [];
  } catch { return []; }
}

function summarizeGmailHeaders(cache, limit = 8) {
  try {
    const byEmail = cache?.data?.gmailByEmail || {};
    const items = [];
    for (const [email, messages] of Object.entries(byEmail)) {
      if (!Array.isArray(messages)) continue;
      for (const m of messages) {
        const d = Number(m.internalDate) || Date.parse(m.headers?.Date || '') || 0;
        const subject = (m.headers?.Subject || '').trim();
        // Extract simple names from From/To headers
        const from = (m.headers?.From || '').replace(/\s*<[^>]*>/g, '').trim();
        const to = (m.headers?.To || '').replace(/\s*<[^>]*>/g, '').trim();
        items.push({
          email,
          date: new Date(d).toISOString(),
          subject,
          from,
          to
        });
      }
    }
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    return items.slice(0, limit);
  } catch {
    return [];
  }
}

function summarizeCalendar(cache) {
  try {
    const byEmail = cache?.data?.calendarDirectByEmail || {};
    const emails = Object.keys(byEmail);
    return { emails, note: 'Calendar data available; not expanded here.' };
  } catch {
    return { emails: [] };
  }
}

function buildPrompt(personName, publicSnippets, cache) {
  const gmailRecent = summarizeGmailHeaders(cache, 8);
  const calendarNote = summarizeCalendar(cache);
  const names = Array.from(new Set(gmailRecent.flatMap(it => [it.from, it.to])
    .join(',')
    .split(/,|;/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !/@/.test(s)))).slice(0, 8);
  const inferred = { connectedPeopleCandidates: names };
  const safeContext = { publicSnippets, gmailRecent, calendar: calendarNote, inferred };
  const context = JSON.stringify(safeContext, null, 2);
  return (
    `Enrich the person page for ${personName}.
Only use safe, high-level, non-sensitive information. If something is unknown, write "Unknown" instead of refusing.
Do NOT include any private or personal data beyond what's in the provided context.

Output exactly these sections:
### PUBLIC_JSON
Return a compact JSON object with optional fields: { org, title, links, keywords, timezone, languages, last_contact, last_meeting, mutual_contacts, publicBio }
Use null or empty arrays where unknown. Example:
\n\n\`\`\`json
{ "org": null, "title": null, "links": {"homepage": null}, "keywords": [], "publicBio": "..." }
\`\`\`

### PRIVATE_NOTES
- Start with a heading: Recent Interactions (Gmail)
- Bullet a short list of the gmailRecent items: "YYYY-MM-DD — Subject". Do not include email addresses or any message content.
- Add sections if possible:
  - How we met: a one-line guess based only on the provided context
  - Connected People: list names inferred from subjects/headers only if clearly present
  - Recent Interests: 3-5 bullets inferred from subjects/wiki/github bio
- If none, write "- None".

### CONTEXT
\n${context}\n`
  );
}

async function callOpenAI(model, apiKey, prompt) {
  // Try chat.completions first
  let resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
  });
  if (resp.ok) {
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }
  // If model requires the Responses API (e.g., gpt-5), try responses endpoint
  const useResponses = resp.status === 400 || resp.status === 404;
  if (useResponses) {
    resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, input: prompt, temperature: 0.2 })
    });
    if (resp.ok) {
      const data = await resp.json();
      // Responses API returns text in data.output_text or aggregated output
      const text = data.output_text || data.choices?.[0]?.message?.content || '';
      if (text) return text;
    }
  }
  // Fallback to a broadly available chat model
  const fallback = process.env.FALLBACK_LLM_MODEL || 'gpt-4o';
  const resp2 = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: fallback, messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
  });
  if (!resp2.ok) throw new Error(`OpenAI error: ${resp.status}`);
  const data2 = await resp2.json();
  return data2.choices?.[0]?.message?.content || '';
}

function upsertFrontmatterText(fmText, { org, title, timezone, keywords, languages, links }) {
  // SAFELY modify only the targeted keys; preserve existing arrays like emails
  let text = fmText.replace(/[\s\r\n]+$/,'');

  const setOrAppendLine = (key, value) => {
    if (!value) return;
    const re = new RegExp(`^${key}:.*$`, 'm');
    if (re.test(text)) text = text.replace(re, `${key}: ${value}`);
    else text += `\n${key}: ${value}`;
  };
  const toInlineArray = (arr) => `[${arr.map((s) => JSON.stringify(String(s))).join(', ')}]`;

  if (Array.isArray(keywords) && keywords.length) setOrAppendLine('keywords', toInlineArray(keywords));
  if (Array.isArray(languages) && languages.length) setOrAppendLine('languages', toInlineArray(languages));
  if (org) setOrAppendLine('org', org);
  if (title) setOrAppendLine('title', title);
  if (timezone) setOrAppendLine('timezone', timezone);

  // Upsert links block without disturbing other keys
  if (links && typeof links === 'object') {
    const lines = ['links:'];
    for (const [k, v] of Object.entries(links)) {
      if (v) lines.push(`  ${k}: "${v}"`);
    }
    if (lines.length > 1) {
      const linksRe = /^links:\n([\s\S]*?)(?=^\w+:|\Z)/m;
      if (linksRe.test(text)) text = text.replace(linksRe, lines.join('\n'));
      else text += `\n${lines.join('\n')}`;
    }
  }

  // Remove any prior enrich block/scalar and stray root source/updated keys
  text = text
    // remove enrich block
    .replace(/^enrich:\s*\n([\s\S]*?)(?=^[A-Za-z0-9_\-]+:|\Z)/gm, '')
    // remove enrich inline scalar
    .replace(/^enrich:\s*\S.*$/gm, '')
    // remove accidental root keys written previously
    .replace(/^\s*source:\s*.*$/gm, '')
    .replace(/^\s*updated:\s*.*$/gm, '')
    .replace(/\n{2,}/g, '\n');

  // Write enrich as a YAML mapping for readability
  const enrichBlock = `enrich:\n  source: openai\n  updated: ${new Date().toISOString()}`;
  if (/^enrich:/m.test(text)) {
    text = text.replace(/^enrich:\s*\n([\s\S]*?)(?=^[A-Za-z0-9_\-]+:|\Z)/m, enrichBlock + '\n');
  } else {
    text += `\n${enrichBlock}`;
  }

  return text;
}

function extractLinksFromCache(cache) {
  const links = {};
  try {
    const snips = cache?.data?.publicSnippets || [];
    for (const s of snips) {
      const u = (s.url || '').toLowerCase();
      if (u.includes('wikipedia.org/wiki') && !links.wikipedia) links.wikipedia = s.url;
      if (u.includes('github.com/') && !links.github) links.github = s.url;
      if ((u.includes('twitter.com/') || u.includes('x.com/')) && !links.twitter) links.twitter = s.url;
    }
    const richer = cache?.data?.publicRicher || {};
    if (richer.wikipedia?.url) links.wikipedia = richer.wikipedia.url;
    if (richer.github?.html_url) links.github = richer.github.html_url;
    if (richer.linksPresent && typeof richer.linksPresent === 'object') {
      if (richer.linksPresent.twitter && !links.twitter) links.twitter = richer.linksPresent.twitter;
      if (richer.linksPresent.homepage && !links.homepage) links.homepage = richer.linksPresent.homepage;
      if (richer.linksPresent.linkedin && !links.linkedin) links.linkedin = richer.linksPresent.linkedin;
    }
    if (richer.linksDetected && typeof richer.linksDetected === 'object') {
      if (richer.linksDetected.wikipedia) links.wikipedia = richer.linksDetected.wikipedia;
      if (richer.linksDetected.github) links.github = richer.linksDetected.github;
      if (richer.linksDetected.homepage && !links.homepage) links.homepage = richer.linksDetected.homepage;
      if (richer.linksDetected.twitter && !links.twitter) links.twitter = richer.linksDetected.twitter;
    }
  } catch {}
  return links;
}

function parseLinksFromFrontmatterText(fmText) {
  try {
    const obj = {};
    const classify = (url) => {
      const u = String(url || '').trim();
      if (!/^https?:\/\//i.test(u)) return ['other', u];
      if (/wikipedia\.org\/wiki\//i.test(u)) return ['wikipedia', u];
      if (/github\.com\//i.test(u)) return ['github', u];
      if (/(x\.com|twitter\.com)\//i.test(u)) return ['twitter', u];
      if (/linkedin\.com\//i.test(u)) return ['linkedin', u];
      if (/mozilla\.vc\//i.test(u)) return ['homepage', u];
      return ['homepage', u];
    };

    // Block form with key: value pairs
    const re = /^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/m;
    const m = fmText.match(re);
    if (m) {
      const lines = m[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        // key: url
        const kv = line.match(/^([a-zA-Z0-9_-]+):\s*"?([^\"]+)"?\s*$/);
        if (kv) { obj[kv[1]] = kv[2]; continue; }
        // bullet list item: - https://...
        const bullet = line.match(/^[-*]\s*(\S+)\s*$/);
        if (bullet) {
          const [key, val] = classify(bullet[1]);
          if (!obj[key]) obj[key] = val;
        }
      }
    }
    // Inline scalar form (single URL)
    const inline = fmText.match(/^links:\s*(\S.*?)\s*$/m);
    if (inline && /^https?:\/\//i.test(inline[1])) {
      const [key, val] = classify(inline[1]);
      if (!obj[key]) obj[key] = val;
    }
    // Inline array form: links: ["url1", "url2"]
    const arrayInline = fmText.match(/^links:\s*\[(.*?)\]/m);
    if (arrayInline) {
      const raw = arrayInline[1];
      const parts = raw.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      for (const p of parts) {
        if (!p) continue;
        const [key, val] = classify(p);
        if (!obj[key]) obj[key] = val;
      }
    }
    return obj;
  } catch { return {}; }
}

// Fallback: parse links from the body “## Public Links” section
function parseLinksFromBody(bodyText) {
  try {
    const obj = {};
    // Find a Public Links section (any heading level, case-insensitive)
    const secMatch = bodyText.match(/^#{1,6}\s*public\s+links\b\s*\n([\s\S]*?)(?=^#{1,6}\s|\Z)/mi);
    const section = secMatch ? secMatch[1] : bodyText; // if not found, scan whole body as fallback
    const lines = section.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const classify = (label, url) => {
      const key = String(label || '').toLowerCase();
      if (/wikipedia/.test(key)) return ['wikipedia', url];
      if (/github/.test(key)) return ['github', url];
      if (/(twitter|x\/?)/.test(key)) return ['twitter', url];
      if (/linkedin/.test(key)) return ['linkedin', url];
      if (/mozilla/.test(key)) return ['homepage', url];
      return ['homepage', url];
    };
    for (const line of lines) {
      // Pattern: - Label: URL
      let m = line.match(/^[-*]\s*([^:]+):\s*(\S+)/);
      if (m && /^https?:\/\//i.test(m[2])) {
        const [k, v] = classify(m[1].trim(), m[2].trim());
        if (!obj[k]) obj[k] = v;
        continue;
      }
      // Pattern: - URL (no label)
      m = line.match(/^[-*]\s*(https?:\/\/\S+)/i);
      if (m) {
        const url = m[1].trim();
        // Guess label by domain
        const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
        let label = 'homepage';
        if (host.includes('wikipedia.org')) label = 'wikipedia';
        else if (host.includes('github.com')) label = 'github';
        else if (host.includes('twitter.com') || host.includes('x.com')) label = 'twitter';
        else if (host.includes('linkedin.com')) label = 'linkedin';
        else if (host.includes('mozilla.vc')) label = 'homepage';
        if (!obj[label]) obj[label] = url;
        continue;
      }
      // Fallback: any URL anywhere on the line
      const any = line.match(/https?:\/\/\S+/i);
      if (any) {
        const url = any[0].trim();
        const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
        let label = 'homepage';
        if (host.includes('wikipedia.org')) label = 'wikipedia';
        else if (host.includes('github.com')) label = 'github';
        else if (host.includes('twitter.com') || host.includes('x.com')) label = 'twitter';
        else if (host.includes('linkedin.com')) label = 'linkedin';
        else if (host.includes('mozilla.vc')) label = 'homepage';
        if (!obj[label]) obj[label] = url;
      }
    }
    return obj;
  } catch { return {}; }
}

function upsertBio(body, bio, wikiUrl) {
  if (!bio && !wikiUrl) return body;
  const wikiLine = wikiUrl ? `- Wikipedia: ${wikiUrl}\n` : '';
  const bioBlock = `## Bio\n${wikiLine}${bio || ''}\n`;
  if (/^##\s*Bio/m.test(body)) {
    return body.replace(/##\s*Bio[\s\S]*?(?=^##\s|\Z)/m, bioBlock + '\n');
  }
  return bioBlock + '\n' + body;
}

function buildPublicBioFromCache(cache) {
  try {
    const rich = cache?.data?.publicRicher || {};
    const parts = [];
    if (rich.wikipedia?.summary) {
        // Take first ~5 sentences for a richer public bio
        const text = rich.wikipedia.summary.trim();
        const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 5).join(' ');
        parts.push(sentences);
    }
    if (rich.github?.bio) {
      const text = rich.github.bio.trim();
      const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      parts.push(sentences);
    }
    return parts.join('\n\n');
  } catch { return ''; }
}

function upsertPublicLinksSection(body, links) {
  // Rebuild section purely from provided links; do not keep stale entries
  const finalMap = {};
  if (links.wikipedia) finalMap['wikipedia'] = links.wikipedia;
  if (links.homepage) finalMap['homepage'] = links.homepage;
  if (links.twitter) finalMap['twitter/x'] = links.twitter;
  if (links.github) finalMap['github'] = links.github;
  if (links.linkedin) finalMap['linkedin'] = links.linkedin;
  const order = ['wikipedia', 'homepage', 'twitter/x', 'github', 'linkedin'];
  const lines = [];
  for (const k of order) if (finalMap[k]) lines.push(`- ${k[0].toUpperCase()}${k.slice(1)}: ${finalMap[k]}`);
  if (!lines.length) return body;
  const block = `## Public Links\n${lines.join('\n')}\n`;
  if (/^##\s*Public Links/m.test(body)) {
    return body.replace(/##\s*Public Links[\s\S]*?(?=^##\s|\Z)/m, block + '\n');
  }
  // Insert after Bio or at end
  if (/^##\s*Bio/m.test(body)) {
    return body.replace(/(^##\s*Bio[\s\S]*?)(?=^##\s|\Z)/m, (m0) => m0 + '\n' + block + '\n');
  }
  return body + '\n' + block + '\n';
}

function updatePersonPage(personFile, additions, cache) {
  const DEBUG = process.env.DEBUG_LINKS === '1' || process.env.ENRICH_DEBUG === '1';
  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, 'enrich-links.log');
  const debug = (...args) => {
    if (!DEBUG) return;
    try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
    try { fs.appendFileSync(logFile, args.join(' ') + os.EOL); } catch {}
  };
  let content = fs.readFileSync(personFile, 'utf8');
  if (!content.startsWith('---')) content = `---\nname: ${path.basename(personFile, '.md')}\n---\n\n` + content;
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fmRaw = m ? m[1] : '';
  let fmText = fmRaw;
  debug('PERSON_FILE =', personFile);
  debug('FM_RAW_START');
  debug(fmRaw);
  debug('FM_RAW_END');
  // Normalize and remove any existing links definitions (we'll rewrite from mergedLinks)
  // Remove block form
  fmText = fmText.replace(/^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/gm, '');
  // Remove inline scalar or empty array forms
  fmText = fmText.replace(/^links:\s*\S.*$/gm, '');
  fmText = fmText.replace(/^links:\s*\[\s*\]\s*$/gm, '');
  const body = m ? content.slice(m[0].length) : content;

  // Merge links with precedence: frontmatter > detected > cache > additions > body (fallback)
  const cacheLinks = extractLinksFromCache(cache);
  const rich = cache?.data?.publicRicher || {};
  const detected = rich.linksDetected || {};
  const fmLinksExisting = parseLinksFromFrontmatterText(fmRaw);
  const bodyLinks = parseLinksFromBody(body);
  const mergedLinks = { ...(additions.links || {}), ...cacheLinks, ...detected, ...fmLinksExisting };
  for (const [k, v] of Object.entries(bodyLinks)) {
    if (!mergedLinks[k]) mergedLinks[k] = v;
  }
  debug('fmLinksExisting =', JSON.stringify(fmLinksExisting));
  debug('cacheLinks =', JSON.stringify(cacheLinks));
  debug('detected =', JSON.stringify(detected));
  debug('bodyLinks =', JSON.stringify(bodyLinks));
  debug('mergedLinks =', JSON.stringify(mergedLinks));
  let newFmText = upsertFrontmatterText(fmText, {
    org: additions.org,
    title: additions.title,
    timezone: additions.timezone,
    keywords: additions.keywords,
    languages: additions.languages,
    links: mergedLinks
  });
  // Strip stray single-letter lines (e.g., accidental 'Z') from frontmatter
  newFmText = newFmText.replace(/^\s*[A-Za-z]\s*$/gm, '').replace(/\n{2,}/g, '\n');
  // Force-write a normalized links block from mergedLinks (guarantee presence)
  if (Object.keys(mergedLinks || {}).length) {
    let nf = newFmText
      .replace(/^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/gm, '')
      .replace(/^links:\s*\S.*$/gm, '')
      .replace(/^links:\s*\[\s*\]\s*$/gm, '');
    let linksBlock = 'links:\n';
    for (const [k, v] of Object.entries(mergedLinks)) {
      if (v) linksBlock += `  ${k}: "${v}"\n`;
    }
    if (!/\n$/.test(nf)) nf += '\n';
    newFmText = nf + linksBlock;
  }

  const fallbackBio = buildPublicBioFromCache(cache);
  const bioText = additions.publicBio || fallbackBio || '';
  // Remove any existing sections we fully control to avoid duplicates
  let cleanedBody = body
    // Connected People
    .replace(/^##\s*Connected People \(from email headers\)[\s\S]*?(?=^##\s|\Z)/gmi, '')
    // Bio
    .replace(/^##\s*Bio[\s\S]*?(?=^##\s|\Z)/gmi, '')
    // Public Links
    .replace(/^##\s*Public\s+Links[\s\S]*?(?=^##\s|\Z)/gmi, '')
    // Stray '---' separators and Created footers pasted into body
    .replace(/^---\s*$[\r\n]+\*Created:[^\n]*\n?/gmi, '')
    .replace(/^---\s*$/gmi, '');
  // Remove stray '---' separators and Created footers in body (keep frontmatter only)
  cleanedBody = cleanedBody.replace(/^---\s*$[\r\n]+\*Created:[^\n]*\n?/gmi, '');
  cleanedBody = cleanedBody.replace(/^---\s*$/gmi, '');
  let newBody = upsertBio(cleanedBody, bioText, mergedLinks.wikipedia);
  // Build Public Links section from merged links so inline or detected links appear
  const linksForSection = { ...mergedLinks };
  if (mergedLinks.wikipedia) linksForSection.wikipedia = mergedLinks.wikipedia;
  newBody = upsertPublicLinksSection(newBody, linksForSection);
  const rewritten = `---\n${newFmText}\n---\n\n${newBody}`;
  // Normalize spacing: at most one blank line between sections and after frontmatter
  const normalizeSpacing = (text) => {
    let t = String(text).replace(/\r\n/g, '\n');
    // Trim trailing spaces
    t = t.replace(/[ \t]+$/gm, '');
    // Ensure exactly one blank line after frontmatter block
    t = t.replace(/^(---[\s\S]*?---)\n+/m, '$1\n\n');
    // Collapse 2+ consecutive blank lines to a single blank line
    t = t.replace(/\n[ \t]*(?:\n[ \t]*){1,}/g, '\n\n');
    // Ensure single trailing newline
    t = t.replace(/\s+$/m, '').trimEnd() + '\n';
    return t;
  };
  fs.writeFileSync(personFile, normalizeSpacing(rewritten));
  debug('FM_AFTER_START');
  debug(newFmText);
  debug('FM_AFTER_END');
}

function writePrivate(personKey, text) {
  const pdir = path.join('/Users/joi/switchboard', 'Private', 'People');
  ensureDir(pdir);
  const p = path.join(pdir, slugify(personKey) + '.md');
  fs.writeFileSync(p, text);
  return p;
}

function ensurePrivateMarker(personFilePath) {
  try {
    let content = fs.readFileSync(personFilePath, 'utf8');
    // Ensure has-private comment exists; remove the 〔p〕 marker if present
    const hasPrivate = /<!--\s*has-private\s*-->/.test(content);
    // Remove 〔p〕 from any H1 line
    content = content.replace(/^(#\s+.*)\s*〔p〕\s*$/gm, '$1');
    // Also remove trailing (p) after H1 if present
    content = content.replace(/^(#\s+.*)\s*\(p\)\s*$/gm, '$1');
    if (!hasPrivate) {
      // Append has-private comment after body to avoid frontmatter interference
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      const fmEndIdx = fmMatch ? fmMatch[0].length : 0;
      const before = content.slice(0, fmEndIdx);
      let body = content.slice(fmEndIdx);
      // Ensure a trailing newline
      if (!/\n$/.test(body)) body += '\n';
      body += '<!-- has-private -->\n';
      content = before + body;
    }
    // Normalize spacing
    content = content
      .replace(/[ \t]+$/gm, '')
      .replace(/^(---[\s\S]*?---)\n+/m, '$1\n\n')
      .replace(/\n[ \t]*(?:\n[ \t]*){1,}/g, '\n\n')
      .trimEnd() + '\n';
    fs.writeFileSync(personFilePath, content);
  } catch {}
}

function normalizeSubject(subjectRaw) {
  const s = String(subjectRaw || '').replace(/^\s*(re:|fw:|fwd:)\s*/i, '').trim();
  return s;
}

function normalizeDisplayName(nameRaw) {
  let n = String(nameRaw || '').trim();
  // Strip surrounding ASCII or typographic quotes
  n = n.replace(/^['"“”‘’]+/, '').replace(/['"“”‘’]+$/, '');
  // Collapse repeated inner quotes
  n = n.replace(/^[\s'"“”‘’]+|[\s'"“”‘’]+$/g, '').trim();
  // Remove leading punctuation/dots
  n = n.replace(/^[^\p{L}\p{N}]+/u, '');
  // Collapse multiple whitespace
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

// Build a set of owner name variants from environment configuration
function buildOwnerVariantsFromEnv() {
  const variants = new Set();
  const add = (s) => {
    const t = normalizeToTokens(s).join(' ');
    if (t) variants.add(t);
  };
  const ownerNames = String(process.env.OWNER_NAMES || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const n of ownerNames) add(n);
  if (process.env.OWNER_PRIMARY_NAME) add(process.env.OWNER_PRIMARY_NAME);
  if (variants.size === 0) {
    ['Joichi Ito', 'Joi Ito', 'Joi Ito Mailstore'].forEach(add);
  }
  return variants;
}

function isLikelyOwner(candidateName) {
  const ownerVariants = buildOwnerVariantsFromEnv();
  const candTokens = normalizeToTokens(candidateName);
  if (!candTokens.length) return false;
  const candKey = candTokens.join(' ');
  if (ownerVariants.has(candKey)) return true;
  for (const ov of ownerVariants) {
    const oTokens = ov.split(' ');
    if (oTokens.length >= 2 && candTokens.length >= 2) {
      const cf = candTokens[0], cl = candTokens[candTokens.length - 1];
      const of = oTokens[0], ol = oTokens[oTokens.length - 1];
      if (levenshtein(cf, of) <= 1 && levenshtein(cl, ol) <= 1) return true;
    } else {
      for (const ct of candTokens) if (levenshtein(ct, oTokens[0]) <= 1) return true;
    }
  }
  return false;
}

// Helpers to detect "self" variants (handles dot prefixes and minor typos)
function normalizeToTokens(nameRaw) {
  const s = String(nameRaw || '')
    .toLowerCase()
    .replace(/[\.\-_]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s ? s.split(' ') : [];
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n; if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function buildSelfVariantsFromGlobals() {
  const variants = new Set();
  const personKey = globalThis.__personKey || '';
  const personFile = globalThis.__personFile || '';
  const add = (s) => { const t = normalizeToTokens(s).join(' '); if (t) variants.add(t); };
  add(personKey);
  try {
    if (personFile && fs.existsSync(personFile)) {
      const txt = fs.readFileSync(personFile, 'utf8');
      const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (m) {
        const fm = m[1];
        // aliases block form
        const aliasBlock = fm.match(/^aliases:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
        if (aliasBlock) {
          const lines = aliasBlock[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          for (const l of lines) add(l.replace(/^[-\s]+/, ''));
        }
        // aliases inline array form
        const aliasInline = fm.match(/^aliases:\s*\[(.*?)\]/m);
        if (aliasInline) {
          const parts = aliasInline[1].split(',').map(s => s.replace(/^\s*["']?|["']?\s*$/g, ''));
          for (const p of parts) add(p);
        }
      }
    }
  } catch {}
  return variants;
}

function isLikelySelf(candidateName) {
  const selfVariants = buildSelfVariantsFromGlobals();
  const candTokens = normalizeToTokens(candidateName);
  if (!candTokens.length) return true;
  const candKey = candTokens.join(' ');
  if (selfVariants.has(candKey)) return true;
  // Fuzzy: first and last tokens within edit distance <= 1
  for (const sv of selfVariants) {
    const sTokens = sv.split(' ');
    if (sTokens.length >= 2 && candTokens.length >= 2) {
      const cf = candTokens[0], cl = candTokens[candTokens.length - 1];
      const sf = sTokens[0], sl = sTokens[sTokens.length - 1];
      if (levenshtein(cf, sf) <= 1 && levenshtein(cl, sl) <= 1) return true;
    }
  }
  return false;
}

function extractConnectedNames(cache) {
  try {
    const byEmail = cache?.data?.gmailByEmail || {};
    const set = new Set();
    for (const messages of Object.values(byEmail)) {
      if (!Array.isArray(messages)) continue;
      for (const m of messages) {
        const from = (m.headers?.From || '').replace(/\s*<[^>]*>/g, '').trim();
        const to = (m.headers?.To || '').replace(/\s*<[^>]*>/g, '').trim();
        for (const field of [from, to]) {
          for (const name of field.split(/,|;/)) {
            const raw = name.trim();
            if (!raw || /@/.test(raw)) continue;
            const n = normalizeDisplayName(raw);
            if (!n) continue;
            // Exclude self and owner variants
            if (isLikelySelf(n)) continue;
            if (isLikelyOwner(n)) continue;
            set.add(n);
          }
        }
      }
    }
    return Array.from(set).slice(0, 10);
  } catch { return []; }
}

function extractConnectedNameStats(cache) {
  try {
    const byEmail = cache?.data?.gmailByEmail || {};
    const stats = new Map(); // name -> { firstMs, lastMs }
    for (const messages of Object.values(byEmail)) {
      if (!Array.isArray(messages)) continue;
      for (const m of messages) {
        const t = Number(m.internalDate) || Date.parse(m.headers?.Date || '') || 0;
        const from = (m.headers?.From || '').replace(/\s*<[^>]*>/g, '').trim();
        const to = (m.headers?.To || '').replace(/\s*<[^>]*>/g, '').trim();
        for (const field of [from, to]) {
          for (const name of field.split(/,|;/)) {
            const raw = name.trim();
            if (!raw || /@/.test(raw)) continue;
            const n = normalizeDisplayName(raw);
            if (!n) continue;
            if (isLikelySelf(n)) continue;
            if (isLikelyOwner(n)) continue;
            const prev = stats.get(n) || { firstMs: t, lastMs: t };
            prev.firstMs = Math.min(prev.firstMs, t);
            prev.lastMs = Math.max(prev.lastMs, t);
            stats.set(n, prev);
          }
        }
      }
    }
    return stats;
  } catch { return new Map(); }
}

function formatYearRange(msStart, msEnd) {
  const y1 = new Date(msStart).getFullYear();
  const y2 = new Date(msEnd).getFullYear();
  return y1 === y2 ? String(y1) : `${y1}–${y2}`;
}

function formatPrivateSummary(cache) {
  try {
    const byEmail = cache?.data?.gmailByEmail || {};
    const metadata = cache?.data?.gmailMetadata || {};
    const mailstoreByEmail = cache?.data?.mailstoreByEmail || {};
    const dataSource = cache?.data?.dataSource || 'Mixed';
    const items = [];
    const subjectStats = new Map(); // subject -> { firstMs, lastMs, count }
    
    // Process Gmail messages
    for (const [email, messages] of Object.entries(byEmail)) {
      if (!Array.isArray(messages)) continue;
      for (const m of messages) {
        const d = Number(m.internalDate) || Date.parse(m.headers?.Date || '') || 0;
        const subject = normalizeSubject(m.headers?.Subject || '');
        const msgIdRaw = m.headers?.['Message-ID'] || m.headers?.['Message-Id'] || '';
        const msgId = msgIdRaw.replace(/[<>]/g, '');
        
        // Links for Gmail messages
        let mailLink = '';
        let gmailLink = '';
        
        if (m.source === 'MailStore') {
          // MailStore messages don't have Gmail links
          mailLink = '';
          gmailLink = '';
        } else if (msgId) {
          mailLink = `message:%3C${encodeURIComponent(msgId)}%3E`;
          gmailLink = `https://mail.google.com/mail/u/0/#search/rfc822msgid%3A${encodeURIComponent(msgId)}`;
        }
        
        items.push({ 
          dateMs: d, 
          date: new Date(d).toISOString().slice(0, 10), 
          subject, 
          mailLink, 
          gmailLink,
          isOldest: m.isOldest === true,
          isNewest: m.isNewest === true,
          source: m.source || 'Gmail'
        });
        if (subject) {
          const prev = subjectStats.get(subject) || { firstMs: d, lastMs: d, count: 0 };
          prev.firstMs = Math.min(prev.firstMs, d);
          prev.lastMs = Math.max(prev.lastMs, d);
          prev.count += 1;
          subjectStats.set(subject, prev);
        }
      }
    }
    
    // Process MailStore messages separately if they exist
    for (const [email, messages] of Object.entries(mailstoreByEmail)) {
      if (!Array.isArray(messages)) continue;
      for (const m of messages) {
        const d = new Date(m.date).getTime();
        const subject = normalizeSubject(m.subject || '');
        
        items.push({ 
          dateMs: d, 
          date: new Date(d).toISOString().slice(0, 10), 
          subject, 
          mailLink: '', 
          gmailLink: '',
          isOldest: false, // Will be determined after sorting
          isNewest: false,
          source: 'MailStore'
        });
        if (subject) {
          const prev = subjectStats.get(subject) || { firstMs: d, lastMs: d, count: 0 };
          prev.firstMs = Math.min(prev.firstMs, d);
          prev.lastMs = Math.max(prev.lastMs, d);
          prev.count += 1;
          subjectStats.set(subject, prev);
        }
      }
    }
    
    if (!items.length) return '';
    
    // Sort all items by date
    items.sort((a, b) => b.dateMs - a.dateMs);
    
    // Mark the actual oldest and newest if not already marked
    if (items.length > 0) {
      // Find the 10 oldest and 10 newest
      const sortedByDate = [...items].sort((a, b) => a.dateMs - b.dateMs);
      const oldestN = 10;
      const newestN = 10;
      
      // Mark oldest
      for (let i = 0; i < Math.min(oldestN, sortedByDate.length); i++) {
        sortedByDate[i].isOldest = true;
      }
      
      // Mark newest (from the end)
      for (let i = Math.max(0, sortedByDate.length - newestN); i < sortedByDate.length; i++) {
        sortedByDate[i].isNewest = true;
      }
    }
    
    const lastDate = items[0].date;
    const firstDate = items[items.length - 1].date;
    
    // Get oldest and newest items - ENSURE we get both sets
    const oldestItems = items.filter(i => i.isOldest).sort((a, b) => a.dateMs - b.dateMs).slice(0, 10);
    const newestItems = items.filter(i => i.isNewest).sort((a, b) => b.dateMs - a.dateMs).slice(0, 10);
    
    // Pick top subjects by count, then recency
    const topSubjects = Array.from(subjectStats.entries())
      .sort((a, b) => (b[1].count - a[1].count) || (b[1].lastMs - a[1].lastMs))
      .slice(0, 8)
      .map(([subj, stat]) => ({ subj, yr: formatYearRange(stat.firstMs, stat.lastMs) }));
    
    const nameStats = extractConnectedNameStats(cache);
    const names = Array.from(nameStats.entries()).slice(0, 8)
      .map(([name, stat]) => `${name} (${formatYearRange(stat.firstMs, stat.lastMs)})`);

    const lines = [];
    lines.push('#### Relationship Summary');
    lines.push(`- Email history spans ${firstDate} to ${lastDate} (${items.length} messages indexed).`);
    
    // Show data sources
    const sources = new Set(items.map(i => i.source));
    if (sources.size > 1) {
      lines.push(`- Sources: ${Array.from(sources).join(', ')}`);
    } else if (sources.size === 1) {
      lines.push(`- Source: ${Array.from(sources)[0]}`);
    }
    
    // Add metadata if available
    for (const [email, meta] of Object.entries(metadata)) {
      if (meta && meta.oldestDate && meta.newestDate) {
        const oldYear = new Date(meta.oldestDate).getFullYear();
        const newYear = new Date(meta.newestDate).getFullYear();
        if (oldYear !== newYear) {
          lines.push(`- Relationship with ${email}: ${oldYear}–${newYear}`);
        }
      }
    }
    
    if (topSubjects.length) {
      lines.push('- Topics discussed include:');
      for (const o of topSubjects) lines.push(`  - ${o.subj} (${o.yr})`);
    }
    
    // Show BOTH oldest and newest interactions
    if (oldestItems.length > 0) {
      lines.push('');
      lines.push('#### First Interactions (Oldest Emails)');
      lines.push(`_From ${oldestItems[0].source}_`);
      for (const it of oldestItems.slice(0, 10)) {
        const label = it.subject || '(no subject)';
        const sourceTag = it.source === 'MailStore' ? ' [MailStore]' : '';
        lines.push(`- ${it.date} — ${label}${sourceTag}`);
      }
    }
    
    if (newestItems.length > 0) {
      lines.push('');
      lines.push('#### Recent Interactions (Newest Emails)');
      const gmailItems = newestItems.filter(i => i.source === 'Gmail');
      if (gmailItems.length > 0) {
        lines.push('_Gmail messages with links:_');
      }
      for (const it of newestItems.slice(0, 10)) {
        const label = it.subject || '(no subject)';
        const links = [];
        if (it.mailLink) links.push(`[Mail](${it.mailLink})`);
        if (it.gmailLink) links.push(`[Gmail](${it.gmailLink})`);
        const linkStr = links.length > 0 ? ` ${links.join(' ')}` : '';
        const sourceTag = it.source === 'MailStore' ? ' [MailStore]' : '';
        lines.push(`- ${it.date} — ${label}${linkStr}${sourceTag}`);
      }
    }
    
    lines.push('');
    lines.push('#### How we met');
    if (oldestItems.length > 0 && oldestItems[0].subject) {
      const firstSubject = oldestItems[0].subject;
      const firstYear = new Date(oldestItems[0].dateMs).getFullYear();
      lines.push(`- First email in ${firstYear} about: ${firstSubject}`);
    } else if (names.length) {
      const firstName = names[0].replace(/\s*\([^)]*\)$/, '');
      lines.push(`- Possibly connected via ${firstName} (inferred from headers).`);
    } else {
      lines.push('- Uncertain.');
    }
    
    lines.push('');
    lines.push('#### Recent Interests');
    if (topSubjects.length) {
      for (const o of topSubjects.slice(0, 5)) lines.push(`- ${o.subj} (${o.yr})`);
    } else lines.push('- Uncertain.');
    
    return lines.join('\n');
  } catch { 
    return ''; 
  }
}

// Utilities to help debug Gmail token scope issues
function resolveHome(p) {
  return p && p.startsWith('~') ? path.join(process.env.HOME || '', p.slice(1)) : p;
}

function logGmailScopeDebug(personKey, emailsTried) {
  try {
    const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH || '(unset)';
    const tokenPathRaw = process.env.GMAIL_TOKEN_PATH || process.env.GCAL_TOKEN_PATH || '(unset)';
    const tokenPath = resolveHome(tokenPathRaw);
    let scope = '(unknown)';
    try {
      const tokenTxt = fs.readFileSync(tokenPath, 'utf8');
      const obj = JSON.parse(tokenTxt);
      if (obj && obj.scope) scope = obj.scope;
    } catch {}
    const emailsList = Array.from(new Set((emailsTried || []).filter(Boolean))).join(', ');
    console.warn('[enrich] Gmail cache empty/null for:', personKey);
    console.warn('[enrich] Using creds:', credsPath);
    console.warn('[enrich] Using token:', tokenPathRaw);
    console.warn('[enrich] Token scope:', scope);
    if (emailsList) console.warn('[enrich] Emails tried:', emailsList);
    console.warn('[enrich] If scope is not gmail.readonly, run:');
    console.warn('  GMAIL_DEEP=1 node tools/mcpServers/bootstrapGmailAuth.js');
    console.warn('  GMAIL_DEEP=1 GMAIL_OAUTH_CODE="<code>" node tools/mcpServers/bootstrapGmailAuth.js');
    if (emailsList) {
      console.warn('[enrich] Populate cache directly then re-enrich:');
      const first = emailsTried && emailsTried[0];
      if (first) {
        console.warn(`  node tools/fetchGmailDirect.js "${personKey}" --email ${first} --deep`);
        console.warn(`  SKIP_PREFETCH=1 PERSON_FILE="/Users/joi/switchboard/${personKey}.md" node tools/enrichFromLLM.js`);
      }
    }
  } catch {}
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-5';
  const personFile = process.env.PERSON_FILE; // absolute or vault-relative
  // Prefer PERSON_FILE when present to avoid stale PERSON_KEY overriding
  const personKey = personFile
    ? path.basename(personFile, '.md')
    : (process.env.PERSON_KEY || '');
  if (!personKey) { console.error('Set PERSON_KEY or PERSON_FILE'); process.exit(1); }
  const CACHE_ONLY = !apiKey;

  // Resolve person page full path
  const fullPath = personFile && path.isAbsolute(personFile)
    ? personFile
    : (personFile ? path.join('/Users/joi/switchboard', personFile) : path.join('/Users/joi/switchboard', `${personKey}.md`));
  // Expose current person for self-detection utilities used later
  globalThis.__personKey = personKey;
  globalThis.__personFile = fullPath;

  // Load cache first to check if we need to fetch
  let cache = loadCache(personKey) || {};
  
  // Check if cache has valid Gmail data
  const hasValidGmail = () => {
    const gmailByEmail = cache?.data?.gmailByEmail || {};
    for (const messages of Object.values(gmailByEmail)) {
      if (Array.isArray(messages) && messages.length > 0) return true;
    }
    return false;
  };
  
  // Optional prefetch: public snippets and email data
  // Force fetch if cache is empty/invalid
  const forceRefetch = process.env.FORCE_REFETCH === '1' || !hasValidGmail();
  
  if (process.env.SKIP_PREFETCH !== '1') {
    // Public snippets (Wikipedia, GitHub)
    try {
      spawnSync('node', ['tools/fetchPublicSnippets.js'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, PERSON_KEY: personKey }
      });
    } catch {}
    
    // Email fetching strategy: Try MailStore for oldest, Gmail for newest
    const fm = readFrontmatterInfo(fullPath);
    const confEmails = loadPeopleConfigEmails(personKey);
    const fmEmails = Array.isArray(fm.emails) ? fm.emails : [];
    const allEmails = Array.from(new Set([process.env.PERSON_EMAIL, ...fmEmails, ...confEmails].filter(Boolean)));
    const wantDeep = (process.env.GMAIL_DEEP === '1') || fm.gmail_deep;
    const hasMailDepth = typeof fm.mail_depth === 'number';
    const doMailstore = hasMailDepth ? (fm.mail_depth >= 2) : (process.env.SKIP_MAILSTORE !== '1');
    const doGmail = hasMailDepth ? (fm.mail_depth >= 1) : (process.env.SKIP_GMAIL !== '1');
    
    // Only fetch email data if we don't have valid data or force refetch is requested
    if (forceRefetch || !hasValidGmail()) {
      console.log(`[enrich] ${forceRefetch ? 'Force fetching' : 'Cache empty, fetching'} email data for ${personKey}...`);
      
      let mailstoreHasData = false;
      let gmailHasData = false;
      
      // STEP 1: Try MailStore for oldest emails (20+ years of archives)
      if (doMailstore) {
        console.log(`[enrich] Fetching from MailStore archive (oldest emails)...`);
        
        const { fetchFromMailStore } = require('./enrichFromMailStore');
        
        // Search with ALL emails to get complete history
        for (const email of allEmails) {
          try {
            console.log(`[enrich] Searching MailStore for ${email}...`);
            const mailstoreCache = await fetchFromMailStore(personKey, email);
            
            if (mailstoreCache && mailstoreCache.data && mailstoreCache.data.mailstoreByEmail) {
              const messages = mailstoreCache.data.mailstoreByEmail[email] || [];
              if (messages.length > 0) {
                console.log(`[enrich] ✓ Found ${messages.length} messages in MailStore for ${email}`);
                
                // Merge MailStore data into existing cache
                const cachePath = path.join(__dirname, '..', 'data', 'people_cache', slugify(personKey) + '.json');
                let existing = {};
                if (fs.existsSync(cachePath)) {
                  try { existing = JSON.parse(fs.readFileSync(cachePath, 'utf8')); } catch {}
                }
                
                const merged = {
                  timestamp: new Date().toISOString(),
                  data: { 
                    ...(existing.data || {}), 
                    ...mailstoreCache.data,
                    dataSource: 'Mixed' // Indicate we have multiple sources
                  }
                };
                
                fs.writeFileSync(cachePath, JSON.stringify(merged, null, 2));
                mailstoreHasData = true;
              }
            }
          } catch (err) {
            console.log(`[enrich] MailStore search failed for ${email}: ${err.message}`);
          }
        }
      }
      
      // STEP 2: Try Gmail for newest emails depending on depth
      if (doGmail) {
        console.log(`[enrich] Fetching from Gmail API (newest emails)...`);
        
        const gmailCmd = process.env.MCP_GMAIL_CMD || 'node';
        const gmailArgs = process.env.MCP_GMAIL_ARGS || 'tools/mcpServers/gmailServer.js';
        
        // Search Gmail with all emails too
        for (const email of allEmails) {
          try {
            const env = { ...process.env, PERSON_KEY: personKey, PERSON_EMAIL: email, MCP_GMAIL_CMD: gmailCmd, MCP_GMAIL_ARGS: gmailArgs };
            if (wantDeep) env.GMAIL_DEEP = '1';
            
            // Use enhanced Gmail fetch that gets both oldest and newest
            const args = ['tools/fetchGmailDirectEnhanced.js', personKey, '--email', email, '--limit', '20'];
            if (wantDeep) args.push('--deep');
            const result = spawnSync('node', args, { cwd: path.join(__dirname, '..'), stdio: 'inherit', env });
            
            if (result.status === 0) {
              console.log(`[enrich] ✓ Fetched Gmail with history for ${email}`);
              gmailHasData = true;
            } else {
              console.error(`[enrich] ✗ Failed to fetch Gmail for ${email}`);
            }
          } catch (err) {
            console.error(`[enrich] Error fetching Gmail for ${email}:`, err.message);
          }
        }
      }
      
      if (mailstoreHasData && gmailHasData) {
        console.log(`[enrich] ✓ Successfully fetched from both MailStore (oldest) and Gmail (newest)`);
      } else if (mailstoreHasData) {
        console.log(`[enrich] ✓ Using MailStore data only`);
      } else if (gmailHasData) {
        console.log(`[enrich] ✓ Using Gmail data only`);
      } else {
        console.log(`[enrich] ⚠ No email data found from either source`);
      }
    } else {
      console.log(`[enrich] Using existing email cache for ${personKey}`);
    }
  }

  // Reload cache after prefetch to get fresh data
  cache = loadCache(personKey) || {};
  // If Gmail cache is empty/null for all tried emails, log a helpful debug block
  try {
    const gmailByEmail = cache?.data?.gmailByEmail || {};
    const fmInfo = readFrontmatterInfo(fullPath);
    const confEmails = loadPeopleConfigEmails(personKey);
    const emailsTried = Array.from(new Set([process.env.PERSON_EMAIL, ...(fmInfo.emails || []), ...confEmails].filter(Boolean)));
    const hasAny = Object.keys(gmailByEmail).length > 0;
    let allNull = true;
    if (hasAny) {
      for (const e of Object.keys(gmailByEmail)) {
        const val = gmailByEmail[e];
        if (Array.isArray(val) ? val.length > 0 : Boolean(val)) { allNull = false; break; }
      }
    }
    if (!hasAny || allNull) {
      logGmailScopeDebug(personKey, emailsTried);
    }
  } catch {}
  const publicSnippets = cache?.data?.publicSnippets || [];
  // Prefer richer public content when available
  const richer = cache?.data?.publicRicher || {};
  if (richer.wikipedia?.summary) {
    publicSnippets.unshift({ title: 'Wikipedia Summary', url: richer.wikipedia.url, snippet: richer.wikipedia.summary });
  }
  if (richer.github?.bio) {
    publicSnippets.unshift({ title: 'GitHub Bio', url: richer.github.html_url, snippet: richer.github.bio });
  }
  let output = '';
  if (!CACHE_ONLY) {
  const prompt = buildPrompt(personKey, publicSnippets, cache);
    output = await callOpenAI(model, apiKey, prompt);
    if (/I\s*cannot|I\s*can\'t\s*assist|I\s*can\s*not\s*assist/i.test(output)) {
      const retryPrompt = prompt + '\n\nImportant: Do not refuse. If unknown, write "Unknown". Follow the specified output format exactly.';
      output = await callOpenAI(process.env.FALLBACK_LLM_MODEL || 'gpt-4o', apiKey, retryPrompt);
    }
  }

  // Parse PUBLIC_JSON fenced block if present
  const fencedJson = output.match(/```json[\s\S]*?```/i);
  const publicJsonMatch = fencedJson ? fencedJson[0].replace(/```json|```/gi, '') : output.match(/\{[\s\S]*\}/);
  let publicFields = {};
  try { if (publicJsonMatch) publicFields = JSON.parse(publicJsonMatch[0] || publicJsonMatch); } catch {}

  // Build deterministic PRIVATE_NOTES from cache when possible.
  // If we have any Gmail items, prefer our structured summary over the model's text.
  const summaryBlock = formatPrivateSummary(cache);
  let privateText = '';
  if (summaryBlock && summaryBlock.trim().length) {
    privateText = `PRIVATE_NOTES\n\n${summaryBlock}\n`;
  } else if (!CACHE_ONLY && output) {
    // Fallback to model output if our cache has no usable Gmail context
    privateText = output;
    const privIdx = output.toLowerCase().indexOf('private_notes');
    if (privIdx >= 0) privateText = output.slice(privIdx);
  } else {
    privateText = 'PRIVATE_NOTES\n\n- None.\n';
  }

  // Strip any trailing CONTEXT section from the private notes (keep private notes clean)
  privateText = String(privateText).replace(/\n+###\s*CONTEXT[\s\S]*$/i, '\n');
  // Normalize spacing in private notes
  privateText = privateText.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  if (fs.existsSync(fullPath)) {
    updatePersonPage(fullPath, publicFields, cache);
  } else {
    console.log('Person file not found; creating minimal page.');
    fs.writeFileSync(fullPath, `---\nname: ${personKey}\ntags: [person]\n---\n\n# ${personKey}\n`);
    updatePersonPage(fullPath, publicFields, cache);
  }
  const privPath = writePrivate(personKey, privateText);
  console.log('Wrote private notes:', privPath);

  // Optionally inject a concise public summary into the public page.
  // Controlled by env INJECT_PUBLIC_SUMMARY=1 (default on), disable with INJECT_PUBLIC_SUMMARY=0
  const injectPublic = (process.env.INJECT_PUBLIC_SUMMARY || '1') !== '0';
  if (injectPublic) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const m2 = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      const fmPart = m2 ? m2[0] : '';
      const bodyPart = m2 ? content.slice(m2[0].length) : content;
      const summary = formatPrivateSummary(cache);
      if (summary && summary.trim().length) {
        // Build a public-safe block that excludes private-only markers
        const lines = summary
          .split(/\r?\n/)
          .filter(l => !/\b\[MailStore\]\b/i.test(l))
          .map(l => l.replace(/\s*\[Mail\]\([^)]*\)\s*/g, '').replace(/\s*\[Gmail\]\([^)]*\)\s*/g, ''));
        const publicBlock = '## Recent Interactions (summary)\n' + lines.join('\n') + '\n';
        let bodyOut = bodyPart
          .replace(/^##\s*Recent Interactions \(summary\)[\s\S]*?(?=^##\s|\Z)/gmi, '');
        // Insert above Notes if present; otherwise append
        if (/^##\s*Notes/m.test(bodyOut)) {
          bodyOut = bodyOut.replace(/(^##\s*Notes[\s\S]*?$)/m, (m0) => publicBlock + '\n' + m0);
        } else {
          bodyOut = bodyOut.replace(/\s*\Z/, '\n\n' + publicBlock);
        }
        // Normalize spacing
        const normalize = (text) => String(text)
          .replace(/[ \t]+$/gm, '')
          .replace(/\n[ \t]*(?:\n[ \t]*){1,}/g, '\n\n')
          .trimEnd() + '\n';
        const finalText = (fmPart ? fmPart : '') + normalize(bodyOut);
        fs.writeFileSync(fullPath, finalText);
      }
    } catch (e) {
      console.warn('[enrich] Public summary inject failed:', e.message);
    }
  }
  // Subtle marker on public page indicating a private page exists
  ensurePrivateMarker(fullPath);
  // Also add Connected People to the public page body (canonicalized and de-duplicated)
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    // Load people index to canonicalize names
    const vaultRoot = path.resolve(path.join('/Users/joi/switchboard', 'dailynote'), '..');
    let aliasToCanon = new Map();
    try {
      const idxPath = path.join(vaultRoot, 'people.index.json');
      if (fs.existsSync(idxPath)) {
        const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8')) || {};
        for (const [canon, rec] of Object.entries(idx)) {
          const aliases = Array.isArray(rec.aliases) ? rec.aliases : [];
          aliasToCanon.set(canon.toLowerCase(), canon);
          for (const a of aliases) aliasToCanon.set(String(a).toLowerCase(), canon);
        }
      }
    } catch {}
    const namesRaw = extractConnectedNames(cache);
    let names = [];
    if (namesRaw && namesRaw.length) {
      const seen = new Set();
      for (const n of namesRaw) {
        const canon = aliasToCanon.get(String(n).toLowerCase()) || n;
        const key = String(canon).toLowerCase();
        if (!seen.has(key)) { seen.add(key); names.push(canon); }
      }
      const block = '## Connected People (from email headers)\n' + names.map(n => `- ${n}`).join('\n') + '\n';
      let out = content;
      // Remove any existing sections first, then insert above Notes if present
      out = out.replace(/^##\s*Connected People \(from email headers\)[\s\S]*?(?=^##\s|\Z)/gmi, '');
      if (/^##\s*Notes/m.test(out)) {
        out = out.replace(/(^##\s*Notes[\s\S]*?$)/m, (m0) => block + '\n' + m0);
      } else if (/^##\s*Notes/m.test(content)) {
        out = content.replace(/(^##\s*Notes[\s\S]*?$)/m, (m0) => block + '\n' + m0);
      } else {
        out = content + '\n' + block + '\n';
      }
      fs.writeFileSync(fullPath, out.replace(/\n{3,}/g, '\n\n'));
    }
  } catch {}
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}


