#!/usr/bin/env node
/**
 * Gmail Preflight Check - Ensures correct token and scope before Gmail operations
 * Returns 0 if ready, 1 if needs fix, 2 if warning
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Colors for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function resolveHome(p) {
  return p && p.startsWith('~') ? path.join(process.env.HOME || '', p.slice(1)) : p;
}

function checkToken(tokenPath) {
  try {
    const resolved = resolveHome(tokenPath);
    if (!fs.existsSync(resolved)) {
      return { exists: false, path: tokenPath };
    }
    const token = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    const scope = token.scope || '';
    
    // Debug time comparison
    const now = Date.now();
    const expiryMs = token.expiry_date;
    const expiryDate = expiryMs ? new Date(expiryMs) : null;
    const isExpired = expiryMs ? now >= expiryMs : false;
    
    return {
      exists: true,
      path: tokenPath,
      resolved,
      scope,
      hasReadonly: scope.includes('https://www.googleapis.com/auth/gmail.readonly'),
      hasMetadata: scope.includes('https://www.googleapis.com/auth/gmail.metadata'),
      hasCalendar: scope.includes('https://www.googleapis.com/auth/calendar'),
      refreshToken: token.refresh_token,
      expiryDate: expiryDate,
      expiryMs: expiryMs,
      nowMs: now,
      isExpired: isExpired
    };
  } catch (error) {
    return { exists: false, path: tokenPath, error: error.message };
  }
}

function ensureGmailToken() {
  const results = {
    ready: false,
    warnings: [],
    errors: [],
    recommendations: []
  };
  
  // Check for verbose mode
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  // Check what's configured in environment
  const gmailTokenPath = process.env.GMAIL_TOKEN_PATH || '~/.gmail/token.json';
  const gcalTokenPath = process.env.GCAL_TOKEN_PATH || '~/.gcalendar/token.json';
  
  console.log(`${BLUE}=== Gmail Preflight Check ===${RESET}\n`);
  
  // Check primary Gmail token
  const gmailToken = checkToken(gmailTokenPath);
  console.log(`Gmail Token (${gmailTokenPath}):`);
  
  if (!gmailToken.exists) {
    console.log(`  ${RED}✗ Not found${RESET}`);
    results.errors.push(`Gmail token not found at ${gmailTokenPath}`);
  } else if (gmailToken.error) {
    console.log(`  ${RED}✗ Error: ${gmailToken.error}${RESET}`);
    results.errors.push(`Error reading token: ${gmailToken.error}`);
  } else {
    if (gmailToken.hasReadonly) {
      console.log(`  ${GREEN}✓ Has gmail.readonly scope${RESET}`);
      results.ready = true;
    } else if (gmailToken.hasMetadata) {
      console.log(`  ${YELLOW}⚠ Has gmail.metadata scope only${RESET}`);
      results.warnings.push('Token has limited metadata scope');
    } else {
      console.log(`  ${RED}✗ No Gmail scope found${RESET}`);
      results.errors.push('Token lacks Gmail scope');
    }
    
    // Check for refresh token
    const hasRefreshToken = !!gmailToken.refreshToken;
    if (hasRefreshToken) {
      console.log(`  ${GREEN}✓ Has refresh token (auto-refresh enabled)${RESET}`);
    } else {
      console.log(`  ${YELLOW}⚠ No refresh token (will need reauth when expired)${RESET}`);
      results.warnings.push('No refresh token - cannot auto-refresh');
    }
    
    if (gmailToken.expiryDate) {
      if (verbose) {
        console.log(`  ${BLUE}Debug info:${RESET}`);
        console.log(`    Current time (ms): ${gmailToken.nowMs}`);
        console.log(`    Expiry time (ms):  ${gmailToken.expiryMs}`);
        console.log(`    Current time:      ${new Date(gmailToken.nowMs).toISOString()}`);
        console.log(`    Expiry time:       ${gmailToken.expiryDate.toISOString()}`);
        console.log(`    Is expired:        ${gmailToken.isExpired}`);
      }
      
      if (gmailToken.isExpired) {
        console.log(`  ${RED}✗ Token expired at ${gmailToken.expiryDate}${RESET}`);
        results.errors.push('Token is expired');
        results.ready = false;
      } else {
        const hoursLeft = (gmailToken.expiryMs - gmailToken.nowMs) / (1000 * 60 * 60);
        if (hoursLeft < 24) {
          console.log(`  ${YELLOW}⚠ Token expires in ${hoursLeft.toFixed(1)} hours at ${gmailToken.expiryDate}${RESET}`);
          results.warnings.push(`Token expires soon (${hoursLeft.toFixed(1)} hours)`);
        } else {
          console.log(`  ${GREEN}✓ Token valid until ${gmailToken.expiryDate}${RESET}`);
        }
      }
    }
  }

  // Check fallback calendar token
  if (gcalTokenPath !== gmailTokenPath) {
    console.log(`\nCalendar Token (${gcalTokenPath}):`);
    const gcalToken = checkToken(gcalTokenPath);
    
    if (gcalToken.exists && !gcalToken.error) {
      if (gcalToken.hasReadonly) {
        console.log(`  ${YELLOW}⚠ Has gmail.readonly scope (unexpected in calendar token)${RESET}`);
        results.warnings.push('Calendar token has Gmail scope - might cause confusion');
      } else if (gcalToken.hasCalendar) {
        console.log(`  ${BLUE}• Has calendar scope only (expected)${RESET}`);
      }
    }
  }

  // Environment check
  console.log('\nEnvironment Configuration:');
  console.log(`  GMAIL_TOKEN_PATH: ${process.env.GMAIL_TOKEN_PATH || '(not set)'}`);
  console.log(`  GCAL_TOKEN_PATH: ${process.env.GCAL_TOKEN_PATH || '(not set)'}`);
  console.log(`  GMAIL_CREDS_PATH: ${process.env.GMAIL_CREDS_PATH || '(not set)'}`);

  // Recommendations
  if (!gmailToken.exists || !gmailToken.hasReadonly) {
    results.recommendations.push(
      'Run: GMAIL_DEEP=1 node tools/mcpServers/bootstrapGmailAuth.js',
      'Then paste the authorization code when prompted'
    );
  }
  
  if (!process.env.GMAIL_TOKEN_PATH) {
    results.recommendations.push(
      'Add to .env: GMAIL_TOKEN_PATH=~/.gmail/token.json'
    );
  }

  // Final status
  console.log('\n' + '='.repeat(50));
  if (results.ready) {
    console.log(`${GREEN}✓ Gmail authentication is ready${RESET}`);
    return 0;
  } else if (results.errors.length > 0) {
    console.log(`${RED}✗ Gmail authentication needs setup${RESET}`);
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e}`));
    if (results.recommendations.length > 0) {
      console.log('\nTo fix:');
      results.recommendations.forEach(r => console.log(`  ${r}`));
    }
    return 1;
  } else if (results.warnings.length > 0) {
    console.log(`${YELLOW}⚠ Gmail authentication has warnings${RESET}`);
    console.log('\nWarnings:');
    results.warnings.forEach(w => console.log(`  - ${w}`));
    return 2;
  }
  
  return 0;
}

// Export for use in other scripts
module.exports = { checkToken, ensureGmailToken, resolveHome };

// Run if called directly
if (require.main === module) {
  const exitCode = ensureGmailToken();
  process.exit(exitCode);
}
