#!/usr/bin/env node
/**
 * Manually refresh Gmail access token using existing refresh token
 * No reauthorization needed if you have a valid refresh token
 */
const path = require('path');
const dotenv = require('dotenv');
const { GmailAuth } = require('./gmailAuth');

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function refreshToken() {
  const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH;
  const tokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
  const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
  
  console.log('📋 Token path:', tokenPath);
  
  const auth = new GmailAuth(credsPath, tokenPath, scopes);
  
  // Check current status
  const status = auth.checkTokenStatus();
  if (!status.exists) {
    console.error('❌ No token found. Need to authorize first.');
    console.log('Run: GMAIL_DEEP=1 node tools/mcpServers/bootstrapGmailAuth.js');
    process.exit(1);
  }
  
  if (!status.hasRefreshToken) {
    console.error('❌ No refresh token available. Need to reauthorize.');
    console.log('Run: GMAIL_DEEP=1 node tools/mcpServers/bootstrapGmailAuth.js');
    process.exit(1);
  }
  
  console.log('Current token status:');
  console.log('  • Expires:', status.expiryDate);
  console.log('  • Hours left:', status.hoursLeft?.toFixed(1) || 'expired');
  console.log('  • Has refresh token: ✅');
  
  // Manually refresh the token
  console.log('\n🔄 Refreshing access token...');
  try {
    const newTokens = await auth.refreshAccessToken();
    console.log('✅ Token refreshed successfully!');
    console.log('  • New expiry:', new Date(newTokens.expiry_date));
    console.log('  • Valid for: ~1 hour');
  } catch (error) {
    console.error('❌ Failed to refresh:', error.message);
    process.exit(1);
  }
}

refreshToken().catch(console.error);
