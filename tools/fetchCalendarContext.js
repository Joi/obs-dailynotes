#!/usr/bin/env node
/**
 * Fetch calendar context for a person using existing Google OAuth token
 * Usage:
 *   PERSON_EMAIL="user@example.com" node tools/fetchCalendarContext.js [--days-back 365] [--days-forward 30]
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { authorize, resolveHome } = require('../lib/auth');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); }

function getWindow(daysBack, daysForward) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - daysBack);
  const end = new Date(now);
  end.setDate(end.getDate() + daysForward);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

async function fetchEventsByAttendee(auth, calendarId, email, timeMin, timeMax) {
  const calendar = google.calendar({ version: 'v3', auth });
  const out = [];
  let pageToken = undefined;
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
      pageToken,
    });
    const items = res.data.items || [];
    for (const ev of items) {
      const attendees = (ev.attendees || []).map(a => (a.email || '').toLowerCase());
      if (attendees.includes((email || '').toLowerCase())) {
        out.push({
          id: ev.id,
          summary: ev.summary || '',
          description: ev.description || '',
          location: ev.location || '',
          start: ev.start || {},
          end: ev.end || {},
          attendees: ev.attendees || [],
          htmlLink: ev.htmlLink || '',
        });
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

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

async function main() {
  let email = process.env.PERSON_EMAIL || '';
  const personKey = process.env.PERSON_KEY || email || 'unknown';
  const daysBackIdx = process.argv.indexOf('--days-back');
  const daysForwardIdx = process.argv.indexOf('--days-forward');
  const daysBack = daysBackIdx >= 0 ? parseInt(process.argv[daysBackIdx + 1] || '365', 10) : 365;
  const daysForward = daysForwardIdx >= 0 ? parseInt(process.argv[daysForwardIdx + 1] || '30', 10) : 30;

  // If email not provided, try to read from person page frontmatter
  if (!email) {
    const personFile = process.env.PERSON_FILE
      ? (path.isAbsolute(process.env.PERSON_FILE) ? process.env.PERSON_FILE : path.join('/Users/joi/switchboard', process.env.PERSON_FILE))
      : path.join('/Users/joi/switchboard', `${personKey}.md`);
    if (fs.existsSync(personFile)) {
      try {
        const txt = fs.readFileSync(personFile, 'utf8');
        const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (m) {
          const lines = m[1].split(/\r?\n/);
          let inEmails = false;
          const emailsFound = [];
          for (const line of lines) {
            if (/^emails:\s*$/.test(line)) { inEmails = true; continue; }
            if (inEmails) {
              if (/^\s*-\s*[^\s]+@[^\s]+$/.test(line)) {
                emailsFound.push(line.replace(/^\s*-\s*/, '').trim());
              } else if (/^\s*[a-zA-Z0-9_-]+:/.test(line)) {
                break; // next key
              }
            }
          }
          if (emailsFound.length) email = emailsFound[0];
        }
      } catch {}
    }
  }

  if (!email) {
    console.error('No PERSON_EMAIL and no email found in person page. Set PERSON_EMAIL or PERSON_FILE/PERSON_KEY.');
    process.exit(1);
  }

  const CREDS_PATH = process.env.GCAL_CREDS_PATH;
  const TOKEN_PATH = process.env.GCAL_TOKEN_PATH;
  if (!CREDS_PATH || !TOKEN_PATH) {
    console.error('Missing GCAL_CREDS_PATH or GCAL_TOKEN_PATH in .env');
    process.exit(1);
  }

  const content = fs.readFileSync(resolveHome(CREDS_PATH), 'utf8');
  const credentials = JSON.parse(content);
  const auth = await authorize(credentials, TOKEN_PATH);

  const { timeMin, timeMax } = getWindow(daysBack, daysForward);
  const events = await fetchEventsByAttendee(auth, 'primary', email, timeMin, timeMax);
  const cacheFile = cachePathFor(personKey);
  mergeCache(cacheFile, { calendarDirect: { email, timeMin, timeMax, count: events.length, events } });
  console.log(`Cached ${events.length} events for ${email} at ${cacheFile}`);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}

module.exports = { fetchEventsByAttendee };


