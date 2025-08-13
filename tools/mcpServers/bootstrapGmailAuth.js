#!/usr/bin/env node
/**
 * Bootstrap Gmail OAuth with automatic token refresh support
 * 
 * Usage:
 *  1) Run without code to get authorization URL
 *  2) Visit URL, authorize, and copy the code
 *  3) Run with GMAIL_OAUTH_CODE=<code> to save token
 * 
 * This script ensures you get a refresh token for long-term access
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

  const auth = new GmailAuth(credsPath, tokenPath, SCOPES);
  
  // Initialize OAuth client
  await auth.initClient();
  
  // Check existing token status
  const status = auth.checkTokenStatus();
  if (status.exists) {
    console.log('\n📋 Existing token status:');
    console.log(`  • Has refresh token: ${status.hasRefreshToken ? '✅ Yes' : '❌ No'}`);
    console.log(`  • Expired: ${status.isExpired ? '❌ Yes' : '✅ No'}`);
    if (status.expiryDate) {
      console.log(`  • Expires: ${status.expiryDate}`);
      if (status.hoursLeft !== null && status.hoursLeft > 0) {
        console.log(`  • Time left: ${status.hoursLeft.toFixed(1)} hours`);
      }
    }
    console.log(`  • Scope: ${status.scope}`);
    
    if (status.hasRefreshToken && !status.isExpired) {
      console.log('\n✅ Token is valid and has refresh capability.');
      console.log('ℹ️  The token will auto-refresh when it expires.');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('\nDo you want to reauthorize anyway? (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Keeping existing token.');
        return;
      }
    }
    
    if (!status.hasRefreshToken) {
      console.log('\n⚠️  Warning: No refresh token found. You\'ll need to reauthorize.');
    }
  }
  
  const code = process.env.GMAIL_OAUTH_CODE;
  
  if (!code) {
    const authUrl = auth.getAuthUrl();
    console.log('\n🔐 Authorize Gmail by visiting this URL:');
    console.log('\n' + authUrl);
    console.log('\nAfter approving, you\'ll see a code. Run this command with the code:');
    console.log(`\nGMAIL_OAUTH_CODE="<paste-code-here>" node ${process.argv[1]}`);
    console.log('\n💡 Tip: The code might be in the URL after "code=" if you don\'t see it on the page.');
    return;
  }

  // Exchange code for tokens
  console.log('\n🔄 Exchanging authorization code for tokens...');
  try {
    const tokens = await auth.getTokenFromCode(code);
    
    console.log('\n✅ Success! Token saved to:', tokenPath);
    console.log('\nToken details:');
    console.log(`  • Has refresh token: ${tokens.refresh_token ? '✅ Yes' : '⚠️  No'}`);
    console.log(`  • Access token expires: ${new Date(tokens.expiry_date)}`);
    console.log(`  • Scope: ${tokens.scope}`);
    
    if (!tokens.refresh_token) {
      console.log('\n⚠️  Warning: No refresh token received!');
      console.log('This might happen if you\'ve authorized this app before.');
      console.log('To fix: Go to https://myaccount.google.com/permissions');
      console.log('Revoke access for this app, then run authorization again.');
    } else {
      console.log('\n✅ Token includes refresh capability for long-term access!');
    }
  } catch (error) {
    console.error('\n❌ Error getting token:', error.message);
    console.error('Make sure you copied the entire authorization code.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});
