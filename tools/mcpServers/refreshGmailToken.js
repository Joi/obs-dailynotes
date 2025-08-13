#!/usr/bin/env node
/**
 * Manually refresh Gmail OAuth token
 * Use this to refresh your token before it expires
 */
const path = require('path');
const dotenv = require('dotenv');
const { GmailAuth } = require('../gmailAuth');

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const USE_DEEP = process.env.GMAIL_DEEP === '1' || process.env.GMAIL_SCOPE === 'readonly';
const SCOPES = [USE_DEEP ? 'https://www.googleapis.com/auth/gmail.readonly' : 'https://www.googleapis.com/auth/gmail.metadata'];

async function main() {
  const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH;
  const tokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
  
  if (!credsPath) {
    console.error('❌ Error: Set GMAIL_CREDS_PATH (or GCAL_CREDS_PATH) in .env');
    process.exit(1);
  }

  console.log('🔄 Gmail Token Refresh Utility\n');
  
  const auth = new GmailAuth(credsPath, tokenPath, SCOPES);
  
  // Check current status
  const status = auth.checkTokenStatus();
  
  if (!status.exists) {
    console.error('❌ No token found at:', tokenPath);
    console.error('Run bootstrapGmailAuth.js first to set up authentication.');
    process.exit(1);
  }
  
  console.log('Current token status:');
  console.log(`  • Has refresh token: ${status.hasRefreshToken ? '✅ Yes' : '❌ No'}`);
  console.log(`  • Expired: ${status.isExpired ? '❌ Yes' : '✅ No'}`);
  if (status.expiryDate) {
    console.log(`  • Expires: ${status.expiryDate}`);
    if (status.hoursLeft !== null && status.hoursLeft > 0) {
      console.log(`  • Time left: ${status.hoursLeft.toFixed(1)} hours`);
    }
  }
  
  if (!status.hasRefreshToken) {
    console.error('\n❌ Cannot refresh: No refresh token available.');
    console.error('You need to reauthorize. Run:');
    console.error('  GMAIL_DEEP=1 node tools/mcpServers/bootstrapGmailAuth.js');
    process.exit(1);
  }
  
  if (!status.isExpired && status.hoursLeft > 1) {
    console.log('\n✅ Token is still valid.');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nRefresh anyway? (y/N): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('Token not refreshed.');
      return;
    }
  }
  
  // Perform refresh
  console.log('\n🔄 Refreshing token...');
  try {
    await auth.initClient();
    const newTokens = await auth.refreshAccessToken();
    
    console.log('\n✅ Token refreshed successfully!');
    console.log('New expiry:', new Date(newTokens.expiry_date));
    
    const newStatus = auth.checkTokenStatus();
    if (newStatus.hoursLeft !== null) {
      console.log('Valid for:', newStatus.hoursLeft.toFixed(1), 'hours');
    }
  } catch (error) {
    console.error('\n❌ Failed to refresh token:', error.message);
    console.error('You may need to reauthorize.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});
