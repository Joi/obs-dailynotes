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

  // Always update enrich as JSON
  setOrAppendLine('enrich', JSON.stringify({ source: 'openai', updated: new Date().toISOString() }));

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
    const re = /^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/m;
    const m = fmText.match(re);
    if (!m) return {};
    const obj = {};
    const lines = m[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const kv = line.match(/^([a-zA-Z0-9_-]+):\s*"?([^\"]+)"?\s*$/);
      if (kv) obj[kv[1]] = kv[2];
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
  let content = fs.readFileSync(personFile, 'utf8');
  if (!content.startsWith('---')) content = `---\nname: ${path.basename(personFile, '.md')}\n---\n\n` + content;
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fmRaw = m ? m[1] : '';
  let fmText = fmRaw;
  // Normalize and remove duplicate links blocks before upserting
  fmText = fmText.replace(/^links:\s*\n([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)/gm, '');
  const body = m ? content.slice(m[0].length) : content;

  // Merge links with precedence: frontmatter > detected > cache > additions
  const cacheLinks = extractLinksFromCache(cache);
  const rich = cache?.data?.publicRicher || {};
  const detected = rich.linksDetected || {};
  const fmLinksExisting = parseLinksFromFrontmatterText(fmRaw);
  const mergedLinks = { ...(additions.links || {}), ...cacheLinks, ...detected, ...fmLinksExisting };
  const newFmText = upsertFrontmatterText(fmText, {
    org: additions.org,
    title: additions.title,
    timezone: additions.timezone,
    keywords: additions.keywords,
    languages: additions.languages,
    links: mergedLinks
  });

  const fallbackBio = buildPublicBioFromCache(cache);
  const bioText = additions.publicBio || fallbackBio || '';
  let newBody = upsertBio(body, bioText, mergedLinks.wikipedia);
  // Build Public Links section from frontmatter links, with Wikipedia added if available
  const linksForSection = { ...fmLinksExisting };
  if (mergedLinks.wikipedia) linksForSection.wikipedia = mergedLinks.wikipedia;
  newBody = upsertPublicLinksSection(newBody, linksForSection);
  const rewritten = `---\n${newFmText}\n---\n\n${newBody}`;
  fs.writeFileSync(personFile, rewritten);
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
    if (/<!--\s*has-private\s*-->/.test(content) || /\〔p\〕/.test(content)) return; // already marked
    // Insert 〔p〕 next to the first H1 if present; otherwise add a tiny marker after frontmatter
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const fmEndIdx = fmMatch ? fmMatch[0].length : 0;
    const before = content.slice(0, fmEndIdx);
    let body = content.slice(fmEndIdx);
    const h1Match = body.match(/^#\s+.*$/m);
    if (h1Match) {
      body = body.replace(/^#\s+.*$/m, (m0) => m0 + ' 〔p〕');
      content = before + body + '\n<!-- has-private -->\n';
    } else {
      const marker = '〔p〕\n<!-- has-private -->\n';
      content = before + marker + body;
    }
    // Collapse any accidental extra blank lines
    content = content.replace(/\n[ \t]*(?:\n[ \t]*)+/g, '\n\n').trimEnd() + '\n';
    fs.writeFileSync(personFilePath, content);
  } catch {}
}

function normalizeSubject(subjectRaw) {
  const s = String(subjectRaw || '').replace(/^\s*(re:|fw:|fwd:)\s*/i, '').trim();
  return s;
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
            const n = name.trim();
            if (!n || /@/.test(n)) continue;
            if (/^Adam\b/i.test(n)) continue; // exclude Adam himself
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
            const n = name.trim();
            if (!n || /@/.test(n)) continue;
            if (/^Adam\b/i.test(n)) continue; // exclude Adam himself
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
    const items = [];
    const subjectStats = new Map(); // subject -> { firstMs, lastMs, count }
    for (const [email, messages] of Object.entries(byEmail)) {
      if (!Array.isArray(messages)) continue;
      for (const m of messages) {
        const d = Number(m.internalDate) || Date.parse(m.headers?.Date || '') || 0;
        const subject = normalizeSubject(m.headers?.Subject || '');
        items.push({ dateMs: d, date: new Date(d).toISOString().slice(0, 10), subject });
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
    items.sort((a, b) => b.dateMs - a.dateMs);
    const lastDate = items[0].date;
    const firstDate = items[items.length - 1].date;
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
    if (topSubjects.length) {
      lines.push(`- Topics discussed include: ${topSubjects.map(o => '`' + o.subj + '` (' + o.yr + ')').join(', ')}.`);
    }
    if (names.length) {
      lines.push(`- Connected people (inferred from headers, may be uncertain): ${names.join(', ')}.`);
    }
    lines.push('');
    lines.push('#### How we met');
    if (names.length) {
      const firstName = names[0].replace(/\s*\([^)]*\)$/, '');
      lines.push(`- Uncertain; possibly connected via ${firstName} (inferred from headers).`);
    }
    else lines.push('- Uncertain.');
    lines.push('');
    lines.push('#### Recent Interests');
    if (topSubjects.length) {
      for (const o of topSubjects.slice(0, 5)) lines.push(`- ${o.subj} (${o.yr})`);
    } else {
      lines.push('- Uncertain.');
    }
    return lines.join('\n');
  } catch { return ''; }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-5';
  const personFile = process.env.PERSON_FILE; // absolute or vault-relative
  const personKey = process.env.PERSON_KEY || (personFile ? path.basename(personFile, '.md') : '');
  if (!apiKey) { console.error('Missing OPENAI_API_KEY'); process.exit(1); }
  if (!personKey) { console.error('Set PERSON_KEY or PERSON_FILE'); process.exit(1); }

  const cache = loadCache(personKey) || {};
  const publicSnippets = cache?.data?.publicSnippets || [];
  // Prefer richer public content when available
  const richer = cache?.data?.publicRicher || {};
  if (richer.wikipedia?.summary) {
    publicSnippets.unshift({ title: 'Wikipedia Summary', url: richer.wikipedia.url, snippet: richer.wikipedia.summary });
  }
  if (richer.github?.bio) {
    publicSnippets.unshift({ title: 'GitHub Bio', url: richer.github.html_url, snippet: richer.github.bio });
  }
  const prompt = buildPrompt(personKey, publicSnippets, cache);
  let output = await callOpenAI(model, apiKey, prompt);
  if (/I\s*cannot|I\s*can\'t\s*assist|I\s*can\s*not\s*assist/i.test(output)) {
    const retryPrompt = prompt + '\n\nImportant: Do not refuse. If unknown, write "Unknown". Follow the specified output format exactly.';
    output = await callOpenAI(process.env.FALLBACK_LLM_MODEL || 'gpt-4o', apiKey, retryPrompt);
  }

  // Parse PUBLIC_JSON fenced block if present
  const fencedJson = output.match(/```json[\s\S]*?```/i);
  const publicJsonMatch = fencedJson ? fencedJson[0].replace(/```json|```/gi, '') : output.match(/\{[\s\S]*\}/);
  let publicFields = {};
  try { if (publicJsonMatch) publicFields = JSON.parse(publicJsonMatch[0] || publicJsonMatch); } catch {}

  // Extract PRIVATE_NOTES section if present
  let privateText = output;
  const privIdx = output.toLowerCase().indexOf('private_notes');
  if (privIdx >= 0) privateText = output.slice(privIdx);
  // If model didn't include RECENT interactions, synthesize from cache
  const summaryBlock = formatPrivateSummary(cache);
  if (summaryBlock) {
    // Replace entire PRIVATE_NOTES block or prepend if missing
    if (/^PRIVATE_NOTES/m.test(privateText)) {
      privateText = privateText.replace(/^PRIVATE_NOTES[\s\S]*$/m, `PRIVATE_NOTES\n\n${summaryBlock}\n`);
    } else {
      privateText = `PRIVATE_NOTES\n\n${summaryBlock}\n\n` + privateText;
    }
  }

  const fullPath = personFile && path.isAbsolute(personFile)
    ? personFile
    : (personFile ? path.join('/Users/joi/switchboard', personFile) : path.join('/Users/joi/switchboard', `${personKey}.md`));
  if (fs.existsSync(fullPath)) {
    updatePersonPage(fullPath, publicFields, cache);
  } else {
    console.log('Person file not found; creating minimal page.');
    fs.writeFileSync(fullPath, `---\nname: ${personKey}\ntags: [people]\n---\n\n# ${personKey}\n`);
    updatePersonPage(fullPath, publicFields, cache);
  }
  const privPath = writePrivate(personKey, privateText);
  console.log('Wrote private notes:', privPath);
  // Subtle marker on public page indicating a private page exists
  ensurePrivateMarker(fullPath);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}


