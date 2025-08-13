#!/usr/bin/env node
/**
 * Test MailStore search with ALL of Alexander Lourie's email addresses
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MailStoreSearch } = require('./mailstoreSearch');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function searchAllEmails() {
  console.log('Searching MailStore for ALL Alexander Lourie email addresses');
  console.log('=' + '='.repeat(60));
  
  const emails = [
    'alexander.lourie@bfkn.com',
    'alourie@attglobal.net', 
    'alourie@mcimail.com'
  ];
  
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};
  
  const client = new MailStoreSearch(config);
  
  try {
    console.log('Connecting to MailStore...');
    await client.connect();
    console.log('✓ Connected successfully!\n');
    
    const allResults = [];
    
    for (const email of emails) {
      console.log(`Searching for ${email}...`);
      const results = await client.searchPerson(email, null, 50);
      
      if (results.length > 0) {
        console.log(`  ✓ Found ${results.length} emails`);
        
        // Get year range
        const years = new Set();
        results.forEach(msg => {
          const year = new Date(msg.date).getFullYear();
          if (!isNaN(year)) years.add(year);
        });
        console.log(`  Years: ${Array.from(years).sort().join(', ')}`);
        
        // Show oldest
        const sorted = results.sort((a, b) => new Date(a.date) - new Date(b.date));
        if (sorted[0]) {
          console.log(`  Oldest: ${sorted[0].date} - ${sorted[0].subject}`);
        }
        
        allResults.push(...results);
      } else {
        console.log(`  ✗ No emails found`);
      }
      console.log();
    }
    
    // Combine and deduplicate
    console.log('Combined Results:');
    console.log('-'.repeat(60));
    
    // Group by year
    const byYear = {};
    allResults.forEach(msg => {
      const year = new Date(msg.date).getFullYear();
      if (!isNaN(year)) {
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(msg);
      }
    });
    
    console.log(`Total emails found: ${allResults.length}`);
    console.log('\nEmails by year:');
    Object.keys(byYear).sort().forEach(year => {
      console.log(`  ${year}: ${byYear[year].length} emails`);
    });
    
    // Show range
    const allSorted = allResults.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (allSorted.length > 0) {
      console.log('\nDate range:');
      console.log(`  Oldest: ${allSorted[0].date}`);
      console.log(`  Subject: ${allSorted[0].subject}`);
      console.log(`  From/To: ${allSorted[0].from} / ${allSorted[0].to}`);
      
      console.log(`\n  Newest: ${allSorted[allSorted.length - 1].date}`);
      console.log(`  Subject: ${allSorted[allSorted.length - 1].subject}`);
      console.log(`  From/To: ${allSorted[allSorted.length - 1].from} / ${allSorted[allSorted.length - 1].to}`);
    }
    
    // Save comprehensive results
    const cacheDir = path.join(__dirname, '..', 'data', 'people_cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    
    const testFile = path.join(cacheDir, 'alexander-lourie-all-emails-test.json');
    fs.writeFileSync(testFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      emailsSearched: emails,
      totalFound: allResults.length,
      yearRange: Object.keys(byYear).sort(),
      results: allResults
    }, null, 2));
    
    console.log(`\n✓ Full results saved to: ${testFile}`);
    
    client.disconnect();
    
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

searchAllEmails().catch(console.error);
