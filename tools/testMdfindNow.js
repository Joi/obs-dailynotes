#!/usr/bin/env node
/**
 * Test various mdfind queries now that we know Spotlight IS finding emails
 */
const { execSync } = require('child_process');

console.log('Testing mdfind with various queries (since Spotlight UI works)');
console.log('=' + '='.repeat(60));

const queries = [
  // Try searching for specific content we saw in the screenshot
  { desc: 'Search for "Alexander Lourie"', cmd: `mdfind "Alexander Lourie"` },
  { desc: 'Search for bfkn.com', cmd: `mdfind "bfkn.com"` },
  { desc: 'Search for "Financial Advisor"', cmd: `mdfind "Financial Advisor Magazine"` },
  { desc: 'Search in Mail folder', cmd: `mdfind -onlyin ~/Library/Mail "Alexander"` },
  { desc: 'Any Alexander file', cmd: `mdfind -name "Alexander"` },
  { desc: 'Text content search', cmd: `mdfind "kMDItemTextContent == '*Alexander*Lourie*'"` },
  { desc: 'Display name search', cmd: `mdfind "kMDItemDisplayName == '*Alexander*'"` },
  { desc: 'Any bfkn content', cmd: `mdfind "kMDItemTextContent == '*bfkn*'"` },
  // Alternative Mail queries
  { desc: 'Mail by content type', cmd: `mdfind "kMDItemContentType == 'com.apple.mail.emlx'"` },
  { desc: 'Any .emlx files', cmd: `mdfind "kMDItemFSName == '*.emlx'"` },
];

let foundAny = false;

for (const {desc, cmd} of queries) {
  try {
    process.stdout.write(`${desc}:\n  `);
    const result = execSync(`${cmd} 2>/dev/null | head -5`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    if (result) {
      const files = result.split('\n').filter(Boolean);
      console.log(`✓ Found ${files.length}+ results`);
      
      // Check if any are Mail files
      const mailFiles = files.filter(f => f.includes('Mail') || f.includes('.emlx'));
      if (mailFiles.length > 0) {
        console.log(`  Including ${mailFiles.length} Mail-related files`);
        foundAny = true;
      }
      
      // Show first result
      if (files[0]) {
        const shortPath = files[0].replace(process.env.HOME, '~');
        console.log(`  First: ${shortPath.substring(shortPath.lastIndexOf('/') + 1)}`);
      }
    } else {
      console.log('✗ No results');
    }
  } catch {
    console.log('✗ Error');
  }
  console.log();
}

if (foundAny) {
  console.log('✅ SUCCESS! mdfind is now finding Mail content!');
  console.log('\nThe indexing must have just completed. Try the enrichment now:');
  console.log('PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js');
} else {
  console.log('⚠️  mdfind still not finding Mail, but Spotlight UI is.');
  console.log('\nThis might mean:');
  console.log('1. Indexing is still in progress (wait a few more minutes)');
  console.log('2. mdfind needs different syntax on your macOS version');
  console.log('\nTry searching directly for content:');
  console.log('  mdfind "JEREMY HECKMAN"');
  console.log('  mdfind "Financial Advisor Magazine"');
}
