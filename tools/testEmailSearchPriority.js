#!/usr/bin/env node
/**
 * Test email search priority: Local Mail.app first, then Gmail
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function testEmailSearch(personKey, email) {
  console.log('='.repeat(60));
  console.log(`Testing email search for: ${personKey}`);
  console.log(`Email: ${email}`);
  console.log('='.repeat(60));
  
  // Test 1: Local Mail.app search
  console.log('\n1. Testing Local Mail.app Search:');
  try {
    const result = execSync(
      `node tools/searchMailApp.js "${personKey}" ${email}`,
      { cwd: '/Users/<Owner>/obs-dailynotes', encoding: 'utf8' }
    );
    
    // Check if found messages
    if (result.includes('Found') && !result.includes('No emails found')) {
      console.log('✅ Local search successful');
      console.log(result.split('\n').slice(0, 10).join('\n'));
      return 'local';
    } else {
      console.log('❌ No local emails found');
    }
  } catch (err) {
    console.log('❌ Local search failed:', err.message);
  }
  
  // Test 2: Gmail API search
  console.log('\n2. Testing Gmail API Search:');
  try {
    const result = execSync(
      `node tools/quickGmailFetch.js "${personKey}" ${email}`,
      { cwd: '/Users/<Owner>/obs-dailynotes', encoding: 'utf8' }
    );
    
    if (result.includes('Successfully fetched') || result.includes('Date range:')) {
      console.log('✅ Gmail search successful');
      console.log(result.split('\n').slice(0, 10).join('\n'));
      return 'gmail';
    } else {
      console.log('❌ No Gmail messages found');
    }
  } catch (err) {
    console.log('❌ Gmail search failed:', err.message);
  }
  
  return 'none';
}

// Test with Alexander Lourie
const result = testEmailSearch('Alexander Lourie', 'alexander.lourie@bfkn.com');

console.log('\n' + '='.repeat(60));
console.log('Summary:');
switch(result) {
  case 'local':
    console.log('✅ Would use LOCAL Mail.app data (no API needed)');
    break;
  case 'gmail':
    console.log('⚠️  Would use Gmail API (local not available)');
    break;
  case 'none':
    console.log('❌ No email data available from either source');
    break;
}

console.log('\nEnvironment Variables for Control:');
console.log('  SKIP_LOCAL=1     # Skip Mail.app search');
console.log('  SKIP_GMAIL=1     # Skip Gmail API');
console.log('  FORCE_REFETCH=1  # Force refresh even if cache exists');
