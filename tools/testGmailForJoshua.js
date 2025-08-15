#!/usr/bin/env node
/**
 * Quick Gmail test for debugging
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { GmailAuth } = require('./gmailAuth');

async function testGmail(email) {
  console.log(`\n🔍 Testing Gmail access for: ${email}`);
  
  // Setup auth
  const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH || path.join(process.env.HOME, '.gcalendar', 'credentials.json');
  const tokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
  const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
  
  const auth = new GmailAuth(credsPath, tokenPath, SCOPES);
  
  try {
    const authClient = await auth.getAuthClient();
    console.log('✅ Authentication successful');
    
    const gmail = google.gmail({ version: 'v1', auth: authClient });
    
    // Try a simple search
    const q = `from:${email} OR to:${email}`;
    console.log(`📧 Searching for: ${q}`);
    
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: q,
      maxResults: 5
    });
    
    const messages = res.data.messages || [];
    console.log(`✅ Found ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log('\nFetching first message details...');
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: messages[0].id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date']
      });
      
      const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
      console.log('Sample message:');
      console.log('  Date:', headers.Date);
      console.log('  From:', headers.From);
      console.log('  Subject:', headers.Subject);
    }
    
    // Also try to see total result estimate
    console.log('\nTotal messages estimate:', res.data.resultSizeEstimate || 'unknown');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Get email from command line or default
const email = process.argv[2] || 'joshua@jramo.com';
testGmail(email).catch(console.error);
