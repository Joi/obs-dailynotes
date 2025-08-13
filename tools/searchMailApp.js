#!/usr/bin/env node
/**
 * Search Mail.app locally using Spotlight metadata - IMPROVED VERSION
 * This searches your local email archive without needing Gmail API
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function slugify(s) { 
  return String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi, '-'); 
}

function searchMailApp(email, personName, limit = 20) {
  console.log(`Searching Mail.app for ${email || personName}...`);
  
  const queries = [];
  const allResults = new Set();
  
  // More aggressive search patterns
  if (email) {
    // Clean email for searching
    const cleanEmail = email.toLowerCase().trim();
    const localPart = cleanEmail.split('@')[0];
    const domain = cleanEmail.split('@')[1];
    
    // Try multiple query formats
    queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${cleanEmail}*'`);
    queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${localPart}*'`);
    queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${domain}*'`);
    
    // Try with different field combinations
    queries.push(`kMDItemKind == 'Mail Message' && (kMDItemAuthors == '*${cleanEmail}*' || kMDItemRecipients == '*${cleanEmail}*')`);
    queries.push(`kMDItemKind == 'Mail Message' && (kMDItemAuthors == '*${localPart}*' || kMDItemRecipients == '*${localPart}*')`);
    
    // Try case variations
    queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${cleanEmail.toUpperCase()}*'`);
  }
  
  if (personName) {
    // Try various name formats
    const names = personName.split(/\s+/);
    
    // Full name
    queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${personName}*'`);
    
    // Individual name parts
    names.forEach(name => {
      if (name.length > 2) {  // Skip short words
        queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${name}*'`);
        queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${name.toLowerCase()}*'`);
        queries.push(`kMDItemKind == 'Mail Message' && (kMDItemAuthors == '*${name}*' || kMDItemRecipients == '*${name}*')`);
      }
    });
    
    // Try "Last, First" format
    if (names.length >= 2) {
      const lastFirst = `${names[names.length - 1]}, ${names[0]}`;
      queries.push(`kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${lastFirst}*'`);
    }
  }
  
  console.log(`  Trying ${queries.length} different search patterns...`);
  
  // Execute all queries
  for (const query of queries) {
    try {
      const cmd = `mdfind "${query}" 2>/dev/null | head -${limit * 3}`;
      const result = execSync(cmd, { 
        encoding: 'utf8', 
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'ignore']  // Suppress stderr
      });
      const files = result.trim().split('\n').filter(Boolean);
      
      if (files.length > 0) {
        console.log(`  ✓ Pattern found ${files.length} results`);
        files.forEach(f => allResults.add(f));
      }
    } catch (err) {
      // Silently continue to next query
    }
  }
  
  // If no results from mdfind, try a more aggressive grep search
  if (allResults.size === 0 && (email || personName)) {
    console.log('  Trying deep grep search in Mail folder...');
    const searchTerm = email ? email.split('@')[0] : personName.split(' ')[0];
    
    try {
      const grepCmd = `find ~/Library/Mail -name "*.emlx" -type f 2>/dev/null | head -100 | xargs grep -l -i "${searchTerm}" 2>/dev/null | head -${limit}`;
      const grepResult = execSync(grepCmd, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'ignore']
      });
      const grepFiles = grepResult.trim().split('\n').filter(Boolean);
      
      if (grepFiles.length > 0) {
        console.log(`  ✓ Grep found ${grepFiles.length} results`);
        grepFiles.forEach(f => allResults.add(f));
      }
    } catch (err) {
      console.log('  Grep search failed (this is normal if no matches)');
    }
  }
  
  console.log(`  Total unique files found: ${allResults.size}`);
  
  // Parse email files to extract metadata
  const emails = [];
  for (const filepath of Array.from(allResults).slice(0, limit)) {
    try {
      // Get metadata using mdls
      const mdls = execSync(`mdls -name kMDItemSubject -name kMDItemAuthors -name kMDItemRecipients -name kMDItemContentCreationDate "${filepath}" 2>/dev/null`, 
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      
      const subject = (mdls.match(/kMDItemSubject\s+=\s+"([^"]*)"/) || [,''])[1] || 
                     (mdls.match(/kMDItemSubject\s+=\s+(.+)/) || [,''])[1] || '';
      const authors = (mdls.match(/kMDItemAuthors\s+=\s+\(([\s\S]*?)\)/) || [,''])[1] || '';
      const recipients = (mdls.match(/kMDItemRecipients\s+=\s+\(([\s\S]*?)\)/) || [,''])[1] || '';
      const dateStr = (mdls.match(/kMDItemContentCreationDate\s+=\s+(.+)/) || [,''])[1] || '';
      
      // Clean up authors and recipients
      const from = authors.replace(/[\n\s"]+/g, ' ').replace(/,\s*$/, '').trim();
      const to = recipients.replace(/[\n\s"]+/g, ' ').replace(/,\s*$/, '').trim();
      
      // Parse date
      let date = null;
      if (dateStr && dateStr !== '(null)') {
        const d = new Date(dateStr.trim());
        if (!isNaN(d)) {
          date = d.toISOString();
        }
      }
      
      // Try to get a snippet
      let snippet = '';
      try {
        // Use textutil to extract text from emlx if possible
        const textCmd = `cat "${filepath}" 2>/dev/null | strings | head -10 | tr '\n' ' '`;
        const preview = execSync(textCmd, { 
          encoding: 'utf8', 
          maxBuffer: 1024 * 1024,
          stdio: ['pipe', 'pipe', 'ignore']
        });
        snippet = preview.substring(0, 200).trim();
      } catch {}
      
      if (subject || from || to) {  // Only add if we got some metadata
        emails.push({
          filepath,
          subject: subject || '(no subject)',
          from: from || '(unknown sender)',
          to: to || '(unknown recipient)',
          date,
          snippet,
          source: 'Mail.app'
        });
      }
    } catch (err) {
      // Skip this file if we can't parse it
    }
  }
  
  // Sort by date (newest first)
  emails.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  
  // Mark oldest and newest
  if (emails.length > 0) {
    // Get all emails with valid dates
    const withDates = emails.filter(e => e.date);
    if (withDates.length > 0) {
      // Sort by date to find true oldest/newest
      const sorted = [...withDates].sort((a, b) => new Date(a.date) - new Date(b.date));
      sorted[0].isOldest = true;
      sorted[sorted.length - 1].isNewest = true;
    }
  }
  
  return emails;
}

function writeCache(personKey, data) {
  const root = path.join(__dirname, '..', 'data', 'people_cache');
  fs.mkdirSync(root, { recursive: true });
  
  const cachePath = path.join(root, slugify(personKey) + '.json');
  
  let existing = {};
  if (fs.existsSync(cachePath)) {
    try { 
      existing = JSON.parse(fs.readFileSync(cachePath, 'utf8')); 
    } catch {}
  }
  
  const merged = {
    timestamp: new Date().toISOString(),
    data: {
      ...(existing.data || {}),
      ...data
    }
  };
  
  fs.writeFileSync(cachePath, JSON.stringify(merged, null, 2));
  console.log(`Wrote cache: ${cachePath}`);
  
  return cachePath;
}

async function main() {
  const personName = process.argv[2] || process.env.PERSON_KEY;
  const email = process.argv[3] || process.env.PERSON_EMAIL;
  
  if (!personName && !email) {
    console.log('Usage: node searchMailApp.js "Person Name" [email@example.com]');
    console.log('   or: PERSON_KEY="Person Name" node searchMailApp.js');
    process.exit(1);
  }
  
  console.log(`\nSearching local Mail.app for: ${personName || email}`);
  console.log('=' + '='.repeat(50));
  
  const results = searchMailApp(email, personName, 30);
  
  if (results.length === 0) {
    console.log('\nNo emails found in Mail.app');
    console.log('Troubleshooting tips:');
    console.log('1. Check if Spotlight is enabled for Mail');
    console.log('2. Run: node tools/debugMailSearch.js');
    console.log('3. Try searching with just the domain or last name');
    return;
  }
  
  console.log(`\nFound ${results.length} emails:\n`);
  
  // Show summary
  const byYear = {};
  results.forEach(email => {
    const year = email.date ? new Date(email.date).getFullYear() : 'Unknown';
    byYear[year] = (byYear[year] || 0) + 1;
  });
  
  console.log('Distribution by year:');
  Object.entries(byYear).sort().forEach(([year, count]) => {
    console.log(`  ${year}: ${count} emails`);
  });
  
  console.log('\nRecent emails:');
  results.slice(0, 10).forEach(email => {
    const date = email.date ? new Date(email.date).toISOString().slice(0, 10) : 'Unknown date';
    console.log(`  ${date} - ${email.subject}`);
    if (email.from) console.log(`    From: ${email.from.substring(0, 50)}`);
  });
  
  // Find oldest emails
  const oldest = results.filter(e => e.date).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  ).slice(0, 3);
  
  if (oldest.length > 0) {
    console.log('\nOldest emails (first contact):');
    oldest.forEach(email => {
      const date = new Date(email.date).toISOString().slice(0, 10);
      console.log(`  ${date} - ${email.subject}`);
    });
  }
  
  // Write to cache if person name provided
  if (personName) {
    const cacheData = {
      mailAppByEmail: {
        [email || 'unknown']: results
      },
      mailAppMetadata: {
        totalFound: results.length,
        oldestDate: oldest[0]?.date,
        newestDate: results[0]?.date,
        searchedAt: new Date().toISOString()
      },
      dataSource: 'Mail.app'
    };
    
    writeCache(personName, cacheData);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { searchMailApp, writeCache };
