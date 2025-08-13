#!/usr/bin/env node
/**
 * Quick test for Alexander Lourie emails
 */
const { execSync } = require('child_process');

console.log('Quick Mail.app Search Test for Alexander Lourie');
console.log('=' + '='.repeat(50));

// Test 1: Check if ANY mail is indexed
try {
  const count = execSync(`mdfind "kMDItemKind == 'Mail Message'" | wc -l`, { encoding: 'utf8' }).trim();
  console.log(`✓ Total Mail messages indexed: ${count}`);
  
  if (parseInt(count) === 0) {
    console.log('\n⚠️  NO MAIL MESSAGES ARE INDEXED!');
    console.log('Fix: System Preferences > Spotlight > Privacy');
    console.log('     Remove Mail.app if it\'s in the exclusion list');
    console.log('     OR run: sudo mdutil -E /');
    process.exit(1);
  }
} catch (err) {
  console.log('✗ Cannot check mail index');
}

// Test 2: Search variations for Alexander Lourie
const searches = [
  { desc: 'Domain bfkn.com', query: `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*bfkn.com*'` },
  { desc: 'Name Lourie', query: `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*Lourie*'` },
  { desc: 'Name lourie (lowercase)', query: `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*lourie*'` },
  { desc: 'Name Alexander', query: `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*Alexander*'` },
  { desc: 'Full email', query: `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*alexander.lourie@bfkn.com*'` },
  { desc: 'Email without dots', query: `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*alexander*lourie*bfkn*'` },
];

console.log('\nSearching for Alexander Lourie emails:');
let foundAny = false;

for (const {desc, query} of searches) {
  try {
    process.stdout.write(`  ${desc}... `);
    const result = execSync(`mdfind "${query}" | head -3`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const files = result.trim().split('\n').filter(Boolean);
    
    if (files.length > 0) {
      console.log(`✓ Found ${files.length}+ messages`);
      foundAny = true;
      
      // Get details of first one
      const firstFile = files[0];
      try {
        const details = execSync(`mdls -name kMDItemSubject -name kMDItemContentCreationDate "${firstFile}"`, { encoding: 'utf8' });
        const subject = (details.match(/kMDItemSubject\s+=\s+"([^"]*)"/) || [,'(no subject)'])[1];
        const date = (details.match(/kMDItemContentCreationDate\s+=\s+([^\n]+)/) || [,''])[1];
        console.log(`    Example: ${subject}`);
        if (date && date !== '(null)') {
          const d = new Date(date.trim());
          if (!isNaN(d)) {
            console.log(`    Date: ${d.toISOString().slice(0, 10)}`);
          }
        }
      } catch {}
      break;  // Found something, stop searching
    } else {
      console.log('✗ Not found');
    }
  } catch (err) {
    console.log('✗ Error');
  }
}

if (!foundAny) {
  console.log('\n⚠️  No emails found for Alexander Lourie');
  console.log('\nPossible reasons:');
  console.log('1. Emails not in Mail.app (check if account is configured)');
  console.log('2. Emails not indexed yet (wait for Spotlight to finish)');
  console.log('3. Different email address or name spelling');
  console.log('\nTry searching Mail.app manually for "Lourie" or "bfkn.com"');
} else {
  console.log('\n✓ Emails found! The search should work.');
  console.log('\nNow testing the full searchMailApp.js script:');
  
  try {
    const { searchMailApp } = require('./searchMailApp');
    const results = searchMailApp('alexander.lourie@bfkn.com', 'Alexander Lourie', 10);
    console.log(`\n✓ searchMailApp found ${results.length} messages`);
    
    if (results.length > 0) {
      console.log('\nFirst few results:');
      results.slice(0, 3).forEach(r => {
        const date = r.date ? new Date(r.date).toISOString().slice(0, 10) : 'Unknown';
        console.log(`  ${date} - ${r.subject}`);
      });
    }
  } catch (err) {
    console.log('\n✗ Error running searchMailApp:', err.message);
  }
}
