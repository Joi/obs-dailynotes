#!/usr/bin/env node
/**
 * Test Gmail token scope and verify access
 * Usage: node tools/gmail_scope_test.js --email test@example.com
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { google } = require('googleapis');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function resolveHome(p) {
  return p && p.startsWith('~') ? path.join(process.env.HOME || '', p.slice(1)) : p;
}

function parseArgs(argv) {
  const args = { email: process.env.TEST_EMAIL || '', verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--email' || arg === '-e') && argv[i + 1]) {
      args.email = argv[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/gmail_scope_test.js [--email test@example.com] [--verbose]');
      process.exit(0);
    }
  }
  return args;
}

function checkTokenScope(tokenPath) {
  try {
    const tokenContent = fs.readFileSync(resolveHome(tokenPath), 'utf8');
    const token = JSON.parse(tokenContent);
    const scope = token.scope || '(none)';
    const hasReadonly = scope.includes('https://www.googleapis.com/auth/gmail.readonly');
    const hasMetadata = scope.includes('https://www.googleapis.com/auth/gmail.metadata');
    
    return {
      path: tokenPath,
      scope,
      hasReadonly,
      hasMetadata,
      hasAnyScope: hasReadonly || hasMetadata,
      expiryDate: token.expiry_date ? new Date(token.expiry_date) : null,
      isExpired: token.expiry_date ? Date.now() > token.expiry_date : false
    };
  } catch (error) {
    return {
      path: tokenPath,
      error: error.message,
      hasReadonly: false,
      hasMetadata: false,
      hasAnyScope: false
    };
  }
}

async function testGmailAccess(auth, email, verbose) {
  const gmail = google.gmail({ version: 'v1', auth });
  const results = {
    listAccess: false,
    queryAccess: false,
    messageCount: 0,
    error: null
  };

  try {
    // Test 1: List recent messages
    if (verbose) console.log('Testing message list access...');
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5
    });
    results.listAccess = true;
    results.messageCount = listRes.data.messages?.length || 0;
    
    // Test 2: Query with specific email
    if (email) {
      if (verbose) console.log(`Testing query access for ${email}...`);
      const queryRes = await gmail.users.messages.list({
        userId: 'me',
        q: `from:${email} OR to:${email}`,
        maxResults: 5
      });
      results.queryAccess = true;
      results.queryCount = queryRes.data.messages?.length || 0;
    }
  } catch (error) {
    results.error = error.message || String(error);
    if (error.response?.data) {
      results.errorDetails = error.response.data;
    }
  }

  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  
  console.log('=== Gmail Token Scope Test ===\n');

  // Check all possible token paths
  const tokenPaths = [
    process.env.GMAIL_TOKEN_PATH,
    process.env.GCAL_TOKEN_PATH,
    '~/.gmail/token.json',
    '~/.gcalendar/token.json'
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // unique values

  console.log('Checking token paths:');
  let validToken = null;
  let bestToken = null;

  for (const tokenPath of tokenPaths) {
    const resolved = resolveHome(tokenPath);
    const exists = fs.existsSync(resolved);
    const scopeInfo = exists ? checkTokenScope(tokenPath) : null;
    
    if (exists) {
      console.log(`  ${tokenPath}:`);
      if (scopeInfo.error) {
        console.log(`    ${RED}✗ Error: ${scopeInfo.error}${RESET}`);
      } else {
        const scopeColor = scopeInfo.hasReadonly ? GREEN : YELLOW;
        console.log(`    Scope: ${scopeColor}${scopeInfo.scope}${RESET}`);
        if (scopeInfo.isExpired) {
          console.log(`    ${RED}✗ Token expired at ${scopeInfo.expiryDate}${RESET}`);
        } else if (scopeInfo.expiryDate) {
          console.log(`    Expires: ${scopeInfo.expiryDate}`);
        }
        
        if (scopeInfo.hasReadonly && !scopeInfo.isExpired) {
          bestToken = { path: tokenPath, info: scopeInfo };
        } else if (!bestToken && scopeInfo.hasAnyScope && !scopeInfo.isExpired) {
          validToken = { path: tokenPath, info: scopeInfo };
        }
      }
    } else {
      console.log(`  ${tokenPath}: ${RED}✗ Not found${RESET}`);
    }
  }

  console.log();

  // Use best available token
  const selectedToken = bestToken || validToken;
  if (!selectedToken) {
    console.log(`${RED}✗ No valid Gmail token found!${RESET}\n`);
    console.log('To fix this, run:');
    console.log('  GMAIL_DEEP=1 node tools/mcpServers/bootstrapGmailAuth.js');
    process.exit(1);
  }

  console.log(`Using token: ${selectedToken.path}`);
  
  if (!selectedToken.info.hasReadonly) {
    console.log(`${YELLOW}⚠ Warning: Token has metadata scope only, not readonly scope${RESET}`);
    console.log('This will cause failures when querying Gmail with specific email addresses.\n');
    console.log('To upgrade to readonly scope, run:');
    console.log('  GMAIL_DEEP=1 node tools/mcpServers/bootstrapGmailAuth.js');
    console.log('Then paste the authorization code when prompted.\n');
  }

  // Test actual Gmail API access
  if (args.verbose || args.email) {
    console.log('\n=== Testing Gmail API Access ===\n');
    
    try {
      const credsPath = resolveHome(
        process.env.GMAIL_CREDS_PATH || 
        process.env.GCAL_CREDS_PATH || 
        '~/.gcalendar/credentials.json'
      );
      
      if (!fs.existsSync(credsPath)) {
        console.log(`${RED}✗ Credentials file not found at ${credsPath}${RESET}`);
        process.exit(1);
      }

      const content = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = content.installed || content.web;
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      
      const token = JSON.parse(fs.readFileSync(resolveHome(selectedToken.path), 'utf8'));
      oAuth2Client.setCredentials(token);
      
      const testResults = await testGmailAccess(oAuth2Client, args.email, args.verbose);
      
      if (testResults.listAccess) {
        console.log(`${GREEN}✓ Can list messages (found ${testResults.messageCount})${RESET}`);
      }
      
      if (args.email) {
        if (testResults.queryAccess) {
          console.log(`${GREEN}✓ Can query messages for ${args.email} (found ${testResults.queryCount || 0})${RESET}`);
        } else {
          console.log(`${RED}✗ Cannot query messages for ${args.email}${RESET}`);
          if (testResults.error) {
            console.log(`  Error: ${testResults.error}`);
          }
        }
      }
      
      if (testResults.error && testResults.error.includes('insufficient')) {
        console.log(`\n${YELLOW}The token lacks sufficient scope for the requested operation.${RESET}`);
        console.log('Re-authenticate with readonly scope to fix this.');
        process.exit(1);
      }
    } catch (error) {
      console.log(`${RED}✗ Error testing Gmail API: ${error.message}${RESET}`);
      process.exit(1);
    }
  }

  // Summary
  console.log('\n=== Summary ===\n');
  if (selectedToken.info.hasReadonly) {
    console.log(`${GREEN}✓ Token has gmail.readonly scope - full access available${RESET}`);
    process.exit(0);
  } else {
    console.log(`${YELLOW}⚠ Token has limited scope - upgrade recommended${RESET}`);
    process.exit(selectedToken.info.hasAnyScope ? 2 : 1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${RED}Fatal error: ${error.message}${RESET}`);
    process.exit(1);
  });
}
