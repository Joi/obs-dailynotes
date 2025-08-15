#!/usr/bin/env node
/**
 * DEPRECATED: Prefer `npm run gmail:flagged` and `npm run gmail:import-flagged` via lib/services/gmailService.
 * Directly fetch Gmail messages for a person by email and write into cache.
 * Usage examples:
 *   node tools/fetchGmailDirect.js "Adrianna Ma" --email adrianna.ma@gmail.com --limit 20 --deep
 *   PERSON_KEY="Adrianna Ma" node tools/fetchGmailDirect.js
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { google } = require('googleapis');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function resolveHome(p) { return p && p.startsWith('~') ? path.join(process.env.HOME, p.slice(1)) : p; }

function parseArgs(argv) {
  const args = { name: process.env.PERSON_KEY || '', email: process.env.PERSON_EMAIL || '', limit: 20, deep: false, fallbackScan: false, scanMax: 300 };
  const rest = [];
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === '--email' || a === '-e') && argv[i + 1]) { args.email = argv[++i]; continue; }
    if ((a === '--limit' || a === '-l') && argv[i + 1]) { args.limit = Math.max(1, Math.min(100, parseInt(argv[++i], 10) || 20)); continue; }
    if (a === '--deep' || a === '-d') { args.deep = true; continue; }
    if (a === '--fallback-scan') { args.fallbackScan = true; continue; }
    if (a === '--scan-max' && argv[i + 1]) { args.scanMax = Math.max(50, Math.min(1000, parseInt(argv[++i], 10) || 300)); continue; }
    rest.push(a);
  }
  if (!args.name && rest.length) args.name = rest.join(' ');
  return args;
}

function readEmailsFromFrontmatter(personName) {
  try {
    const abs = path.join('/Users/<Owner>/switchboard', `${personName}.md`);
    if (!fs.existsSync(abs)) return [];
    const txt = fs.readFileSync(abs, 'utf8');
    const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return [];
    const fm = m[1];
    const out = [];
    const inline = fm.match(/^emails:\s*\[(.*?)\]/m);
    if (inline) {
      out.push(...inline[1].split(',').map(s => s.replace(/^[\s"']+|[\s"']+$/g, '')).filter(Boolean));
    } else {
      const block = fm.match(/^emails:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
      if (block) out.push(...block[1].split(/\r?\n/).map(l => l.trim().replace(/^[\-\s]+/, '')).filter(l => /@/.test(l)));
    }
    return Array.from(new Set(out));
  } catch { return []; }
}

const { GmailAuth } = require('./gmailAuth');

async function authorizeGmail(deep) {
  const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH || path.join(process.env.HOME, '.gcalendar', 'credentials.json');
  const gmailTokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
  const tokenPath = fs.existsSync(resolveHome(gmailTokenPath)) ? gmailTokenPath : 
                    (process.env.GCAL_TOKEN_PATH || gmailTokenPath);
  const SCOPES = [deep ? 'https://www.googleapis.com/auth/gmail.readonly' : 'https://www.googleapis.com/auth/gmail.metadata'];
  
  // Use the new auth module with auto-refresh
  const auth = new GmailAuth(credsPath, tokenPath, SCOPES);
  
  try {
    // This will automatically refresh if needed
    return await auth.getAuthClient();
  } catch (err) {
    // Fallback to old method if new auth fails
    console.error('New auth failed, using fallback:', err.message);
    const content = JSON.parse(fs.readFileSync(resolveHome(credsPath), 'utf8'));
    const { client_secret, client_id, redirect_uris } = content.installed || content.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const token = JSON.parse(fs.readFileSync(resolveHome(tokenPath), 'utf8'));
    oAuth2Client.setCredentials(token);
    oAuth2Client.scopes = SCOPES;
    return oAuth2Client;
  }
}

async function fetchMessagesForEmail(gmail, email, limit, deep) {
  const userId = 'me';
  const out = [];
  const q = `from:${email} OR to:${email}`;
  let pageToken;
  while (out.length < limit) {
    const res = await gmail.users.messages.list({ userId, q, maxResults: Math.min(50, limit - out.length), pageToken });
    const msgs = res.data.messages || [];
    for (const m of msgs) {
      const msg = await gmail.users.messages.get({ userId, id: m.id, format: deep ? 'full' : 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] });
      const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
      const item = { id: msg.data.id, threadId: msg.data.threadId, internalDate: msg.data.internalDate, headers };
      if (deep) item.snippet = msg.data.snippet || '';
      out.push(item);
      if (out.length >= limit) break;
    }
    pageToken = res.data.nextPageToken;
    if (!pageToken || !msgs.length) break;
  }
  return out;
}

function headerFieldIncludesEmail(headers, email) {
  const fields = [headers?.From || '', headers?.To || '', headers?.Cc || '', headers?.Bcc || ''];
  const needle = String(email || '').toLowerCase();
  return fields.some(f => String(f).toLowerCase().includes(needle));
}

async function scanRecentMessagesForEmail(gmail, email, maxToScan, deep) {
  const userId = 'me';
  const out = [];
  let scanned = 0;
  let pageToken;
  while (scanned < maxToScan) {
    const res = await gmail.users.messages.list({ userId, maxResults: Math.min(100, maxToScan - scanned), pageToken });
    const msgs = res.data.messages || [];
    if (!msgs.length) break;
    for (const m of msgs) {
      const msg = await gmail.users.messages.get({ userId, id: m.id, format: deep ? 'full' : 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date'] });
      const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
      scanned += 1;
      if (headerFieldIncludesEmail(headers, email)) {
        const item = { id: msg.data.id, threadId: msg.data.threadId, internalDate: msg.data.internalDate, headers };
        if (deep) item.snippet = msg.data.snippet || '';
        out.push(item);
      }
      if (scanned >= maxToScan) break;
    }
    pageToken = res.data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

function cachePathFor(personKey) {
  const root = path.join(__dirname, '..', 'data', 'people_cache');
  ensureDir(root);
  const file = slugify(personKey) + '.json';
  return path.join(root, file);
}

function writeCache(personKey, merge) {
  const p = cachePathFor(personKey);
  let existing = {};
  if (fs.existsSync(p)) {
    try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  const data = existing.data || {};
  const merged = { timestamp: new Date().toISOString(), data: { ...data, ...merge } };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2));
  return p;
}

async function main() {
  const args = parseArgs(process.argv);
  const personKey = args.name || (process.env.PERSON_FILE ? path.basename(process.env.PERSON_FILE, '.md') : 'unknown');
  if (!personKey) { console.error('Provide person name or set PERSON_KEY'); process.exit(1); }
  let emails = [];
  if (args.email) emails.push(args.email);
  if (!emails.length) emails = readEmailsFromFrontmatter(personKey);
  if (!emails.length) { console.error('No emails found. Provide --email or add emails: to frontmatter.'); process.exit(2); }

  const auth = await authorizeGmail(Boolean(args.deep));
  const gmail = google.gmail({ version: 'v1', auth });
  const byEmail = {};
  for (const email of emails) {
    try {
      byEmail[email] = await fetchMessagesForEmail(gmail, email, args.limit, Boolean(args.deep));
    } catch (e) {
      const msg = e && (e.response && e.response.data ? JSON.stringify(e.response.data) : (e.message || String(e)));
      console.error(`Gmail fetch error for ${email}:`, msg);
      // If insufficient scope, and fallback-scan enabled or deep requested, try scanning recent messages without q
      const insufficient = /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient/i.test(String(msg));
      if (insufficient || args.fallbackScan) {
        try {
          const scanned = await scanRecentMessagesForEmail(gmail, email, args.scanMax, Boolean(args.deep));
          byEmail[email] = scanned && scanned.length ? scanned.slice(0, args.limit) : null;
          if (!byEmail[email] || !byEmail[email].length) {
            console.error(`Fallback scan found no messages for ${email} in last ~${args.scanMax}.`);
          }
        } catch (e2) {
          console.error(`Fallback scan error for ${email}:`, e2.response?.data || e2.message || String(e2));
          byEmail[email] = null;
        }
      } else {
        byEmail[email] = null;
      }
    }
  }
  const p = writeCache(personKey, { gmailByEmail: byEmail });
  console.log('Wrote cache:', p);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}


