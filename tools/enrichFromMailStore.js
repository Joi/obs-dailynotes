#!/usr/bin/env node
/**
 * Enrich person using MailStore IMAP
 * Better than Gmail API - it has ALL your archived emails!
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MailStoreSearch } = require('./mailstoreSearch');
const { getMailstorePassword } = require('../lib/keychain');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fetchFromMailStore(personKey, email) {
  console.log(`[enrich] Fetching from MailStore for ${personKey}...`);
  
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};
  
  if (!config.host && !process.env.MAILSTORE_HOST) {
    console.log('[enrich] MailStore not configured, skipping...');
    return null;
  }
  
  // Ensure password is available via Keychain fallback for flows that may pass config without password
  const client = new MailStoreSearch({
    ...config,
    password: config.password || getMailstorePassword({ account: config.user || process.env.MAILSTORE_USER })
  });
  
  try {
    await client.connect();
    console.log('[enrich] Connected to MailStore');
    
    // Search for person
    const results = await client.searchPerson(email, personKey, 50);
    
    if (results.length > 0) {
      console.log(`[enrich] Found ${results.length} emails in MailStore`);
      
      // Save both raw MailStore format AND Gmail-compatible format
      const gmailFormat = results.map((msg, idx) => ({
        id: `mailstore_${Date.now()}_${idx}`,
        threadId: `thread_${Date.now()}_${idx}`,
        internalDate: new Date(msg.date).getTime().toString(),
        headers: {
          From: msg.from || '',
          To: msg.to || '',
          Subject: msg.subject || '',
          Date: msg.date || new Date().toISOString(),
          'Message-ID': `<mailstore-${Date.now()}-${idx}@mailstore.local>`
        },
        source: 'MailStore',
        isOldest: false, // Will be determined by formatPrivateSummary
        isNewest: false
      }));
      
      // Save to cache
      const cacheDir = path.join(__dirname, '..', 'data', 'people_cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      
      const cacheFile = path.join(cacheDir, `${slugify(personKey)}.json`);
      
      // Load existing cache if it exists
      let existingCache = {};
      if (fs.existsSync(cacheFile)) {
        try {
          existingCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        } catch {}
      }
      
      // Merge with existing data
      const cache = {
        timestamp: new Date().toISOString(),
        data: {
          ...(existingCache.data || {}),
          gmailByEmail: {
            ...(existingCache.data?.gmailByEmail || {}),
            [email]: [...(existingCache.data?.gmailByEmail?.[email] || []), ...gmailFormat]
          },
          mailstoreByEmail: { 
            ...(existingCache.data?.mailstoreByEmail || {}),
            [email]: results 
          },
          dataSource: existingCache.data?.gmailByEmail ? 'Mixed' : 'MailStore'
        }
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
      console.log(`[enrich] Cached ${results.length} MailStore emails`);
      
      client.disconnect();
      return cache;
    } else {
      console.log('[enrich] No emails found in MailStore');
      client.disconnect();
      return null;
    }
  } catch (err) {
    console.log(`[enrich] MailStore error: ${err.message}`);
    return null;
  }
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-');
}

// Integration with enrichFromLLM.js
async function enrichWithMailStore() {
  const personKey = process.env.PERSON_KEY || 'Alexander Lourie';
  const personFile = process.env.PERSON_FILE || `/Users/joi/switchboard/${personKey}.md`;
  const email = process.env.PERSON_EMAIL || 'alexander.lourie@bfkn.com';
  
  console.log('Enrichment Using MailStore IMAP Archive');
  console.log('=' + '='.repeat(50));
  console.log(`Person: ${personKey}`);
  console.log(`Email: ${email}`);
  console.log();
  
  // Fetch from MailStore
  const cache = await fetchFromMailStore(personKey, email);
  
  if (cache) {
    console.log('\n✓ Successfully fetched from MailStore!');
    console.log('Now run standard enrichment:');
    console.log(`  SKIP_PREFETCH=1 PERSON_FILE="${personFile}" node tools/enrichFromLLM.js`);
  } else {
    console.log('\n❌ MailStore fetch failed');
    console.log('Falling back to Gmail API:');
    console.log(`  SKIP_LOCAL=1 PERSON_FILE="${personFile}" node tools/enrichFromLLM.js`);
  }
}

// Run if called directly
if (require.main === module) {
  enrichWithMailStore().catch(console.error);
}

module.exports = { fetchFromMailStore };
