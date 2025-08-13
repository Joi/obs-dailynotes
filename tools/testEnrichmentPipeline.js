#!/usr/bin/env node
/**
 * Test enrichment with MailStore integration
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('Testing MailStore + Gmail Enrichment for Alexander Lourie');
console.log('=' + '='.repeat(60));
console.log();

// Clear cache to force fresh fetch
const cacheFile = path.join(__dirname, '..', 'data', 'people_cache', 'alexander-lourie.json');
if (fs.existsSync(cacheFile)) {
  fs.unlinkSync(cacheFile);
  console.log('✓ Cleared existing cache');
}

// Set environment
process.env.PERSON_KEY = 'Alexander Lourie';
process.env.PERSON_EMAIL = 'alexander.lourie@bfkn.com';
process.env.FORCE_REFETCH = '1';

console.log('\n1. Running enrichment pipeline...\n');

// Run the enrichment
const result = spawnSync('node', ['tools/enrichFromLLM.js'], {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
});

console.log('\n2. Checking cache contents...\n');

// Check cache
if (fs.existsSync(cacheFile)) {
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  
  // Check for MailStore data
  const hasMailstore = !!(cache.data && cache.data.mailstoreByEmail);
  const mailstoreCount = hasMailstore ? 
    Object.values(cache.data.mailstoreByEmail).reduce((sum, msgs) => sum + (msgs ? msgs.length : 0), 0) : 0;
  
  // Check for Gmail data  
  const hasGmail = !!(cache.data && cache.data.gmailByEmail);
  const gmailCount = hasGmail ? 
    Object.values(cache.data.gmailByEmail).reduce((sum, msgs) => sum + (Array.isArray(msgs) ? msgs.length : 0), 0) : 0;
  
  console.log(`✓ Cache file exists`);
  console.log(`  MailStore emails: ${mailstoreCount}`);
  console.log(`  Gmail emails: ${gmailCount}`);
  console.log(`  Data source: ${cache.data?.dataSource || 'Unknown'}`);
  
  // Check for date ranges
  if (cache.data?.gmailByEmail) {
    const allMessages = [];
    for (const msgs of Object.values(cache.data.gmailByEmail)) {
      if (Array.isArray(msgs)) {
        allMessages.push(...msgs);
      }
    }
    
    if (allMessages.length > 0) {
      const dates = allMessages.map(m => {
        const d = Number(m.internalDate) || Date.parse(m.headers?.Date || '') || 0;
        return d;
      }).filter(d => d > 0);
      
      if (dates.length > 0) {
        const oldest = new Date(Math.min(...dates));
        const newest = new Date(Math.max(...dates));
        console.log(`\n  Date range: ${oldest.toISOString().slice(0,10)} to ${newest.toISOString().slice(0,10)}`);
        
        // Check by year
        const years = new Set();
        dates.forEach(d => years.add(new Date(d).getFullYear()));
        console.log(`  Years covered: ${Array.from(years).sort().join(', ')}`);
      }
    }
  }
} else {
  console.log('✗ Cache file not created');
}

console.log('\n3. Checking private notes...\n');

// Check private notes
const privateFile = '/Users/<Owner>/switchboard/Private/People/alexander-lourie.md';
if (fs.existsSync(privateFile)) {
  const content = fs.readFileSync(privateFile, 'utf8');
  
  // Check for different years
  const has2011 = content.includes('2011');
  const has2025 = content.includes('2025');
  const hasOldest = content.includes('First Interactions') || content.includes('Oldest Emails');
  const hasNewest = content.includes('Recent Interactions') || content.includes('Newest Emails');
  
  console.log(`✓ Private notes file exists`);
  console.log(`  Contains 2011 emails: ${has2011 ? '✓' : '✗'}`);
  console.log(`  Contains 2025 emails: ${has2025 ? '✓' : '✗'}`);
  console.log(`  Has 'First Interactions' section: ${hasOldest ? '✓' : '✗'}`);
  console.log(`  Has 'Recent Interactions' section: ${hasNewest ? '✓' : '✗'}`);
  
  // Show a sample
  const lines = content.split('\n');
  const firstInteractions = lines.findIndex(l => l.includes('First Interactions'));
  if (firstInteractions > -1) {
    console.log('\n  Sample from First Interactions:');
    for (let i = firstInteractions + 1; i < Math.min(firstInteractions + 4, lines.length); i++) {
      if (lines[i].startsWith('-')) {
        console.log(`    ${lines[i]}`);
      }
    }
  }
} else {
  console.log('✗ Private notes file not found');
}

console.log('\n✓ Test complete');
