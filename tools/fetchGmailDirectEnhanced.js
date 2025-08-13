#!/usr/bin/env node
/**
 * Enhanced Gmail fetcher that gets both oldest and newest messages
 * This gives better context about the relationship history
 * Usage examples:
 *   node tools/fetchGmailDirectEnhanced.js "Person Name" --email email@example.com --limit 20 --deep
 *   PERSON_KEY="Person Name" node tools/fetchGmailDirectEnhanced.js
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
  const args = { 
    name: process.env.PERSON_KEY || '', 
    email: process.env.PERSON_EMAIL || '', 
    limit: 20, 
    deep: false,
    oldestFirst: true, // Include oldest messages
    newestFirst: true, // Include newest messages
    splitRatio: 0.5 // How to split between old/new (0.5 = 50/50)
  };
  const rest = [];
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === '--email' || a === '-e') && argv[i + 1]) { args.email = argv[++i]; continue; }
    if ((a === '--limit' || a === '-l') && argv[i + 1]) { args.limit = Math.max(1, Math.min(100, parseInt(argv[++i], 10) || 20)); continue; }
    if (a === '--deep' || a === '-d') { args.deep = true; continue; }
    if (a === '--oldest-only') { args.oldestFirst = true; args.newestFirst = false; continue; }
    if (a === '--newest-only') { args.oldestFirst = false; args.newestFirst = true; continue; }
    if (a === '--split-ratio' && argv[i + 1]) { args.splitRatio = parseFloat(argv[++i]) || 0.5; continue; }
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
  
  const auth = new GmailAuth(credsPath, tokenPath, SCOPES);
  
  try {
    return await auth.getAuthClient();
  } catch (err) {
    console.error('Auth error, using fallback:', err.message);
    const content = JSON.parse(fs.readFileSync(resolveHome(credsPath), 'utf8'));
    const { client_secret, client_id, redirect_uris } = content.installed || content.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const token = JSON.parse(fs.readFileSync(resolveHome(tokenPath), 'utf8'));
    oAuth2Client.setCredentials(token);
    oAuth2Client.scopes = SCOPES;
    return oAuth2Client;
  }
}

/**
 * Fetch oldest messages for an email
 */
async function fetchOldestMessagesForEmail(gmail, email, limit, deep) {
  const userId = 'me';
  const out = [];
  const q = `from:${email} OR to:${email}`;
  
  console.log(`    Getting oldest ${limit} messages for ${email}...`);
  
  // Fetch message list (IDs only)
  const allMessageIds = [];
  let pageToken;
  let fetchedPages = 0;
  const maxPages = 5; // Limit to avoid fetching too much
  
  while (fetchedPages < maxPages && allMessageIds.length < limit * 3) {
    const res = await gmail.users.messages.list({ 
      userId, 
      q, 
      maxResults: Math.min(100, limit * 3),
      pageToken 
    });
    
    const msgs = res.data.messages || [];
    if (!msgs.length) break;
    
    // Just collect IDs with basic info
    for (const m of msgs) {
      allMessageIds.push(m);
    }
    
    fetchedPages++;
    pageToken = res.data.nextPageToken;
    if (!pageToken) break;
  }
  
  console.log(`    Found ${allMessageIds.length} message IDs, fetching details for oldest ${limit}...`);
  
  // Get details for just a subset to find dates
  const samples = [];
  const sampleSize = Math.min(allMessageIds.length, limit * 2);
  const step = Math.max(1, Math.floor(allMessageIds.length / sampleSize));
  
  for (let i = 0; i < allMessageIds.length && samples.length < sampleSize; i += step) {
    const msg = await gmail.users.messages.get({ 
      userId, 
      id: allMessageIds[i].id, 
      format: 'minimal'
    });
    samples.push({
      id: msg.data.id,
      threadId: msg.data.threadId,
      internalDate: parseInt(msg.data.internalDate)
    });
  }
  
  // Sort by date and take oldest
  samples.sort((a, b) => a.internalDate - b.internalDate);
  const oldestIds = samples.slice(0, limit);
  
  // Now fetch full details for the oldest messages
  console.log(`    Fetching full details for ${oldestIds.length} oldest messages...`);
  for (const msgInfo of oldestIds) {
    const msg = await gmail.users.messages.get({ 
      userId, 
      id: msgInfo.id, 
      format: deep ? 'full' : 'metadata', 
      metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Cc'] 
    });
    
    const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
    const item = { 
      id: msg.data.id, 
      threadId: msg.data.threadId, 
      internalDate: msg.data.internalDate, 
      headers,
      isOldest: true
    };
    if (deep) item.snippet = msg.data.snippet || '';
    out.push(item);
  }
  
  return out;
}

/**
 * Fetch newest messages for an email (existing behavior)
 */
async function fetchNewestMessagesForEmail(gmail, email, limit, deep) {
  const userId = 'me';
  const out = [];
  const q = `from:${email} OR to:${email}`;
  
  console.log(`    Getting newest ${limit} messages for ${email}...`);
  
  let pageToken;
  let fetched = 0;
  while (out.length < limit && fetched < limit * 2) {
    const res = await gmail.users.messages.list({ 
      userId, 
      q, 
      maxResults: Math.min(50, limit - out.length), 
      pageToken 
    });
    
    const msgs = res.data.messages || [];
    console.log(`    Processing batch of ${msgs.length} messages...`);
    
    for (const m of msgs) {
      if (out.length >= limit) break;
      
      const msg = await gmail.users.messages.get({ 
        userId, 
        id: m.id, 
        format: deep ? 'full' : 'metadata', 
        metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Cc'] 
      });
      
      const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
      const item = { 
        id: msg.data.id, 
        threadId: msg.data.threadId, 
        internalDate: msg.data.internalDate, 
        headers,
        isNewest: true // Mark as newest for identification
      };
      if (deep) item.snippet = msg.data.snippet || '';
      out.push(item);
      fetched++;
    }
    
    pageToken = res.data.nextPageToken;
    if (!pageToken || !msgs.length) break;
  }
  
  console.log(`    Got ${out.length} newest messages`);
  return out;
}

/**
 * Fetch both oldest and newest messages, providing full relationship context
 */
async function fetchMessagesWithHistory(gmail, email, limit, deep, args) {
  const messages = [];
  
  if (args.oldestFirst && args.newestFirst) {
    // Split the limit between oldest and newest
    const oldestCount = Math.floor(limit * args.splitRatio);
    const newestCount = limit - oldestCount;
    
    console.log(`Fetching ${oldestCount} oldest and ${newestCount} newest messages...`);
    
    // Fetch sequentially to avoid hanging
    console.log(`  Fetching oldest messages first...`);
    const oldest = await fetchOldestMessagesForEmail(gmail, email, oldestCount, deep);
    messages.push(...oldest);
    
    console.log(`  Fetching newest messages...`);
    const newest = await fetchNewestMessagesForEmail(gmail, email, newestCount, deep);
    messages.push(...newest);
  } else if (args.oldestFirst) {
    const oldest = await fetchOldestMessagesForEmail(gmail, email, limit, deep);
    messages.push(...oldest);
  } else {
    const newest = await fetchNewestMessagesForEmail(gmail, email, limit, deep);
    messages.push(...newest);
  }
  
  // Sort by date for consistent ordering
  messages.sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));
  
  // Add metadata about the range
  if (messages.length > 0) {
    const dates = messages.map(m => parseInt(m.internalDate));
    const metadata = {
      totalFetched: messages.length,
      oldestDate: new Date(Math.min(...dates)).toISOString(),
      newestDate: new Date(Math.max(...dates)).toISOString(),
      hasOldest: messages.some(m => m.isOldest),
      hasNewest: messages.some(m => m.isNewest)
    };
    
    console.log(`  Date range: ${metadata.oldestDate.slice(0,10)} to ${metadata.newestDate.slice(0,10)}`);
    
    // Store metadata separately
    return { messages, metadata };
  }
  
  return { messages: [], metadata: null };
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
  const merged = { 
    timestamp: new Date().toISOString(), 
    data: { ...data, ...merge } 
  };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2));
  return p;
}

async function main() {
  const args = parseArgs(process.argv);
  const personKey = args.name || (process.env.PERSON_FILE ? path.basename(process.env.PERSON_FILE, '.md') : 'unknown');
  
  if (!personKey) { 
    console.error('Provide person name or set PERSON_KEY'); 
    process.exit(1); 
  }
  
  let emails = [];
  if (args.email) emails.push(args.email);
  if (!emails.length) emails = readEmailsFromFrontmatter(personKey);
  if (!emails.length) { 
    console.error('No emails found. Provide --email or add emails: to frontmatter.'); 
    process.exit(2); 
  }

  console.log(`Fetching Gmail for ${personKey} (${emails.length} email(s))`);
  console.log(`Mode: ${args.deep ? 'Deep' : 'Metadata only'}`);
  console.log(`Strategy: ${args.oldestFirst && args.newestFirst ? 'Both oldest and newest' : args.oldestFirst ? 'Oldest only' : 'Newest only'}`);

  const auth = await authorizeGmail(Boolean(args.deep));
  const gmail = google.gmail({ version: 'v1', auth });
  
  const byEmail = {};
  const metadataByEmail = {};
  
  for (const email of emails) {
    try {
      const result = await fetchMessagesWithHistory(gmail, email, args.limit, Boolean(args.deep), args);
      byEmail[email] = result.messages;
      if (result.metadata) {
        metadataByEmail[email] = result.metadata;
      }
      
      console.log(`✓ Fetched ${result.messages.length} messages for ${email}`);
    } catch (e) {
      const msg = e && (e.response && e.response.data ? JSON.stringify(e.response.data) : (e.message || String(e)));
      console.error(`✗ Gmail fetch error for ${email}:`, msg);
      byEmail[email] = null;
    }
  }
  
  // Write both messages and metadata to cache
  const p = writeCache(personKey, { 
    gmailByEmail: byEmail,
    gmailMetadata: metadataByEmail,
    fetchStrategy: {
      includesOldest: args.oldestFirst,
      includesNewest: args.newestFirst,
      splitRatio: args.splitRatio,
      timestamp: new Date().toISOString()
    }
  });
  
  console.log('Wrote cache:', p);
  
  // Print summary
  const totalMessages = Object.values(byEmail).filter(v => v).reduce((sum, msgs) => sum + msgs.length, 0);
  console.log(`\nSummary: ${totalMessages} total messages cached`);
  
  for (const [email, metadata] of Object.entries(metadataByEmail)) {
    if (metadata) {
      console.log(`  ${email}: ${metadata.oldestDate.slice(0,10)} to ${metadata.newestDate.slice(0,10)}`);
    }
  }
}

if (require.main === module) {
  main().catch((e) => { 
    console.error('Error:', e.message); 
    process.exit(1); 
  });
}
