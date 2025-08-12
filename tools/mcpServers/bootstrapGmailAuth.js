#!/usr/bin/env node
/**
 * Bootstrap Gmail OAuth for the standalone Gmail MCP server.
 * Two-step flow:
 *  1) Run without GMAIL_OAUTH_CODE to print the authorization URL
 *  2) After granting, run again with GMAIL_OAUTH_CODE=<paste_code> to save the token
 *
 * Env:
 *  - GMAIL_CREDS_PATH (or fallback GCAL_CREDS_PATH)
 *  - GMAIL_TOKEN_PATH (default ~/.gmail/token.json)
 *  - GMAIL_OAUTH_CODE (only for step 2)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const dotenv = require('dotenv');

// Load project .env for GMAIL_/GCAL_ paths
try { dotenv.config({ path: path.join(__dirname, '..', '..', '.env') }); } catch {}

const USE_DEEP = process.env.GMAIL_DEEP === '1' || process.env.GMAIL_SCOPE === 'readonly';
const SCOPES = [USE_DEEP ? 'https://www.googleapis.com/auth/gmail.readonly' : 'https://www.googleapis.com/auth/gmail.metadata'];
function resolveHome(p) { return p && p.startsWith('~') ? path.join(process.env.HOME, p.slice(1)) : p; }

async function main() {
  const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH;
  const tokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
  if (!credsPath) {
    console.error('Set GMAIL_CREDS_PATH (or GCAL_CREDS_PATH).');
    process.exit(1);
  }
  const content = JSON.parse(fs.readFileSync(resolveHome(credsPath), 'utf8'));
  const { client_secret, client_id, redirect_uris } = content.installed || content.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const code = process.env.GMAIL_OAUTH_CODE;
  if (!code) {
    const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    console.log('Authorize Gmail by visiting this URL, then paste the code back here as GMAIL_OAUTH_CODE:');
    console.log(authUrl);
    console.log('\nAfter approving, run:');
    console.log('GMAIL_OAUTH_CODE="<code>" node tools/mcpServers/bootstrapGmailAuth.js');
    return;
  }

  const { tokens } = await oAuth2Client.getToken(code.trim());
  oAuth2Client.setCredentials(tokens);
  fs.mkdirSync(path.dirname(resolveHome(tokenPath)), { recursive: true });
  fs.writeFileSync(resolveHome(tokenPath), JSON.stringify(tokens), { mode: 0o600 });
  console.log('Saved Gmail token to', resolveHome(tokenPath));
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });


