#!/usr/bin/env node
/**
 * Test MailStore search specifically for Alexander Lourie
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MailStoreSearch } = require('./mailstoreSearch');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testSearch() {
  console.log('Testing MailStore Search for Alexander Lourie');
  console.log('=' + '='.repeat(50));
  
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};
  
  if (!config.host && !process.env.MAILSTORE_HOST) {
    console.log('❌ MailStore not configured');
    return;
  }
  
  const client = new MailStoreSearch(config);
  
  try {
    console.log('Connecting to MailStore...');
    await client.connect();
    console.log('✓ Connected successfully!');
    
    // Search for Alexander Lourie
    console.log('\nSearching for emails with Alexander Lourie...');
    const results = await client.searchPerson('alexander.lourie@bfkn.com', 'Alexander Lourie', 50);
    
    if (results.length > 0) {
      console.log(`\n✓ Found ${results.length} emails!`);
      
      // Group by year to see the date range
      const byYear = {};
      results.forEach(msg => {
        const year = new Date(msg.date).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(msg);
      });
      
      console.log('\nEmails by year:');
      Object.keys(byYear).sort().forEach(year => {
        console.log(`  ${year}: ${byYear[year].length} emails`);
      });
      
      // Show oldest and newest
      const sorted = results.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      console.log('\n5 Oldest emails:');
      sorted.slice(0, 5).forEach(msg => {
        console.log(`  ${msg.date} - ${msg.subject}`);
        console.log(`    From: ${msg.from}`);
        console.log(`    Folder: ${msg.folder}`);
      });
      
      console.log('\n5 Newest emails:');
      sorted.slice(-5).reverse().forEach(msg => {
        console.log(`  ${msg.date} - ${msg.subject}`);
        console.log(`    From: ${msg.from}`);
        console.log(`    Folder: ${msg.folder}`);
      });
      
      // Save to cache for testing
      const cacheDir = path.join(__dirname, '..', 'data', 'people_cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      
      const testCacheFile = path.join(cacheDir, 'alexander-lourie-mailstore-test.json');
      fs.writeFileSync(testCacheFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        mailstoreResults: results
      }, null, 2));
      
      console.log('\n✓ Test results saved to:', testCacheFile);
      
    } else {
      console.log('❌ No results found');
      console.log('\nPossible issues:');
      console.log('  1. Email might be stored in different folders');
      console.log('  2. Search criteria might need adjustment');
      console.log('  3. MailStore might not have emails for this person');
      
      // List available folders to help debug
      console.log('\nListing available folders...');
      const folders = await client.listFolders();
      
      function listFolders(obj, prefix = '') {
        for (const [name, value] of Object.entries(obj)) {
          console.log(`  ${prefix}${name}`);
          if (value.children) {
            listFolders(value.children, prefix + '  ');
          }
        }
      }
      listFolders(folders);
    }
    
    client.disconnect();
    console.log('\n✓ Test complete');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log(err.stack);
  }
}

// Run the test
testSearch().catch(console.error);
