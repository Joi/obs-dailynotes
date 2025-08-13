#!/usr/bin/env node
/**
 * Check cache and force refresh if empty/failed
 * Returns true if cache has valid data, false if empty/needs refresh
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function slugify(s) { 
  return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); 
}

function loadCache(personKey) {
  const p = path.join(__dirname, '..', 'data', 'people_cache', slugify(personKey) + '.json');
  if (!fs.existsSync(p)) return null;
  try { 
    return JSON.parse(fs.readFileSync(p, 'utf8')); 
  } catch { 
    return null; 
  }
}

function hasValidGmailData(cache) {
  if (!cache || !cache.data) return false;
  
  const gmailByEmail = cache.data.gmailByEmail || {};
  
  // Check if we have any email keys
  const emailKeys = Object.keys(gmailByEmail);
  if (emailKeys.length === 0) return false;
  
  // Check if any email has actual messages (not null or empty array)
  for (const email of emailKeys) {
    const messages = gmailByEmail[email];
    if (Array.isArray(messages) && messages.length > 0) {
      return true; // Found valid data
    }
  }
  
  return false; // All entries are null or empty
}

function checkTokenValid() {
  try {
    const result = spawnSync('node', ['tools/gmailPreflightCheck.js'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Check if token is valid (exit code 0 means ready)
    return result.status === 0;
  } catch {
    return false;
  }
}

function forceFetchGmail(personKey, emails, deep = false) {
  console.log(`[cache-refresh] Force fetching Gmail for ${personKey}...`);
  
  for (const email of emails) {
    console.log(`[cache-refresh] Fetching for email: ${email}`);
    
    const args = ['tools/fetchGmailDirect.js', personKey, '--email', email, '--limit', '20'];
    if (deep) args.push('--deep');
    
    const result = spawnSync('node', args, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env
    });
    
    if (result.status !== 0) {
      console.error(`[cache-refresh] Failed to fetch for ${email}`);
    }
  }
}

function getEmails(personFile) {
  try {
    if (!fs.existsSync(personFile)) return [];
    
    const content = fs.readFileSync(personFile, 'utf8');
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return [];
    
    const fm = m[1];
    const emails = [];
    
    // Check inline array format
    const inline = fm.match(/^emails:\s*\[(.*?)\]/m);
    if (inline) {
      emails.push(...inline[1].split(',').map(s => s.replace(/^[\s"']+|[\s"']+$/g, '')).filter(Boolean));
    } else {
      // Check block format
      const block = fm.match(/^emails:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
      if (block) {
        emails.push(...block[1].split(/\r?\n/).map(l => l.trim().replace(/^[-\s]+/, '')).filter(l => /@/.test(l)));
      }
    }
    
    // Check if deep mode is requested
    const deepMatch = fm.match(/^gmail_deep:\s*(true|false)/mi);
    const deep = deepMatch ? /true/i.test(deepMatch[1]) : false;
    
    return { emails: Array.from(new Set(emails)), deep };
  } catch {
    return { emails: [], deep: false };
  }
}

async function main() {
  const personKey = process.env.PERSON_KEY || process.argv[2];
  const personFile = process.env.PERSON_FILE || path.join('/Users/joi/switchboard', `${personKey}.md`);
  
  if (!personKey) {
    console.error('Usage: node checkAndRefreshEmptyCache.js <person-key>');
    console.error('   or: PERSON_KEY=name node checkAndRefreshEmptyCache.js');
    process.exit(1);
  }
  
  console.log(`[cache-refresh] Checking cache for ${personKey}...`);
  
  // Load current cache
  const cache = loadCache(personKey);
  const hasData = hasValidGmailData(cache);
  
  if (hasData) {
    console.log(`[cache-refresh] ✓ Cache has valid Gmail data`);
    process.exit(0);
  }
  
  console.log(`[cache-refresh] ✗ Cache is empty or invalid`);
  
  // Check if token is valid
  const tokenValid = checkTokenValid();
  if (!tokenValid) {
    console.error(`[cache-refresh] ✗ Gmail token is not valid. Run: npm run gmail:refresh`);
    process.exit(1);
  }
  
  console.log(`[cache-refresh] ✓ Gmail token is valid`);
  
  // Get emails from person file
  const { emails, deep } = getEmails(personFile);
  
  if (emails.length === 0) {
    console.error(`[cache-refresh] ✗ No emails found in person file`);
    process.exit(1);
  }
  
  console.log(`[cache-refresh] Found ${emails.length} email(s) to fetch`);
  
  // Force fetch Gmail data
  forceFetchGmail(personKey, emails, deep);
  
  // Verify the cache was updated
  const newCache = loadCache(personKey);
  const nowHasData = hasValidGmailData(newCache);
  
  if (nowHasData) {
    console.log(`[cache-refresh] ✓ Successfully refreshed cache with Gmail data`);
    process.exit(0);
  } else {
    console.error(`[cache-refresh] ✗ Failed to populate cache with Gmail data`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[cache-refresh] Error:', e.message);
    process.exit(1);
  });
}

module.exports = { loadCache, hasValidGmailData, checkTokenValid };
