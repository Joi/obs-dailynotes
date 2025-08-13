#!/usr/bin/env node
/**
 * Quick Gmail fetch with timeout and better error handling
 * Simpler version that won't hang
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { google } = require('googleapis');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

const { GmailAuth } = require('./gmailAuth');

async function authorizeGmail(deep) {
  const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH || path.join(process.env.HOME, '.gcalendar', 'credentials.json');
  const gmailTokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
  const tokenPath = fs.existsSync(path.join(process.env.HOME, gmailTokenPath.slice(1))) ? gmailTokenPath : 
                    (process.env.GCAL_TOKEN_PATH || gmailTokenPath);
  const SCOPES = [deep ? 'https://www.googleapis.com/auth/gmail.readonly' : 'https://www.googleapis.com/auth/gmail.metadata'];
  
  const auth = new GmailAuth(credsPath, tokenPath, SCOPES);
  
  try {
    return await auth.getAuthClient();
  } catch (err) {
    console.error('Auth error:', err.message);
    throw err;
  }
}

async function quickFetchMessages(gmail, email, limit = 20, deep = false) {
  const userId = 'me';
  const messages = [];
  
  try {
    console.log(`  Fetching up to ${limit} messages for ${email}...`);
    
    // Simple single request - no complex logic
    const res = await gmail.users.messages.list({ 
      userId, 
      q: `from:${email} OR to:${email}`,
      maxResults: limit
    });
    
    const messageIds = res.data.messages || [];
    console.log(`  Found ${messageIds.length} message IDs`);
    
    // Fetch details for each message with timeout
    for (let i = 0; i < Math.min(messageIds.length, limit); i++) {
      const m = messageIds[i];
      console.log(`  Fetching message ${i + 1}/${Math.min(messageIds.length, limit)}...`);
      
      try {
        const msg = await Promise.race([
          gmail.users.messages.get({ 
            userId, 
            id: m.id, 
            format: deep ? 'full' : 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]);
        
        const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
        messages.push({
          id: msg.data.id,
          threadId: msg.data.threadId,
          internalDate: msg.data.internalDate,
          headers,
          snippet: deep ? (msg.data.snippet || '') : ''
        });
        
      } catch (err) {
        console.error(`  Failed to fetch message ${m.id}: ${err.message}`);
      }
    }
    
    console.log(`  Successfully fetched ${messages.length} messages`);
    
  } catch (err) {
    console.error(`  Error fetching messages: ${err.message}`);
  }
  
  return messages;
}

function writeCache(personKey, data) {
  const root = path.join(__dirname, '..', 'data', 'people_cache');
  ensureDir(root);
  const file = slugify(personKey) + '.json';
  const p = path.join(root, file);
  
  let existing = {};
  if (fs.existsSync(p)) {
    try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  
  const merged = { 
    timestamp: new Date().toISOString(), 
    data: { ...(existing.data || {}), ...data }
  };
  
  fs.writeFileSync(p, JSON.stringify(merged, null, 2));
  return p;
}

async function main() {
  const personKey = process.argv[2] || process.env.PERSON_KEY || process.env.PERSON_FILE?.replace(/.*\//, '').replace('.md', '');
  const email = process.argv[3] || process.env.PERSON_EMAIL || 'alexander.lourie@bfkn.com';
  const deep = process.argv.includes('--deep') || process.env.GMAIL_DEEP === '1';
  
  if (!personKey) {
    console.error('Usage: node quickGmailFetch.js "Person Name" [email]');
    process.exit(1);
  }
  
  console.log(`Quick Gmail fetch for ${personKey}`);
  console.log(`Email: ${email}`);
  console.log(`Mode: ${deep ? 'Deep' : 'Metadata only'}`);
  
  try {
    const auth = await authorizeGmail(deep);
    const gmail = google.gmail({ version: 'v1', auth });
    
    const messages = await quickFetchMessages(gmail, email, 20, deep);
    
    if (messages.length > 0) {
      // Sort by date
      messages.sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));
      
      // Get date range
      const dates = messages.map(m => parseInt(m.internalDate));
      const oldest = new Date(Math.min(...dates));
      const newest = new Date(Math.max(...dates));
      
      console.log(`\nDate range: ${oldest.toISOString().slice(0, 10)} to ${newest.toISOString().slice(0, 10)}`);
      
      // Show some subjects
      console.log('\nRecent subjects:');
      messages.slice(0, 5).forEach(m => {
        const date = new Date(parseInt(m.internalDate)).toISOString().slice(0, 10);
        const subject = m.headers?.Subject || '(no subject)';
        console.log(`  ${date} - ${subject}`);
      });
      
      // Write to cache
      const p = writeCache(personKey, {
        gmailByEmail: {
          [email]: messages
        },
        gmailMetadata: {
          [email]: {
            totalFetched: messages.length,
            oldestDate: oldest.toISOString(),
            newestDate: newest.toISOString()
          }
        }
      });
      
      console.log(`\nWrote cache: ${p}`);
    } else {
      console.log('\nNo messages found');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
