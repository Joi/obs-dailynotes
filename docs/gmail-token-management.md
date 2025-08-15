# Gmail Token Management

## Overview
The Gmail integration now supports automatic token refresh to prevent frequent reauthorization. OAuth2 access tokens typically expire after 1 hour, but with a refresh token, we can automatically get new access tokens without user intervention.

## Key Features

### 1. **Automatic Token Refresh**
- Tokens are automatically refreshed when they're about to expire (within 5 minutes)
- Refreshed tokens are saved back to disk
- No manual intervention required once refresh token is obtained

### 2. **Long-term Access**
- Initial authorization requests offline access to get a refresh token
- Refresh tokens don't expire (unless explicitly revoked)
- Access tokens are refreshed automatically as needed

## Commands

### Check Token Status
```bash
npm run gmail:check
# or with verbose output:
node tools/gmailPreflightCheck.js --verbose
```

Shows:
- Token expiry status
- Available scopes
- Refresh token availability
- Time remaining until expiry

### Initial Authorization
```bash
npm run gmail:reauth
```

This will:
1. Generate an authorization URL
2. Request offline access (for refresh token)
3. Save both access and refresh tokens

### Manual Token Refresh
```bash
npm run gmail:refresh
```

Use this to manually refresh your token before it expires.

### Test Gmail Access
```bash
npm run gmail:fetch -- "Person Name"
```

### Fetch Starred/Flagged Messages
```bash
# Print JSON to stdout
npm run gmail:flagged -- --limit 50

# Or write to a file
npm run gmail:flagged -- --limit 100 --out data/flagged.json
```

## Troubleshooting

### No Refresh Token
If you don't have a refresh token:
1. Go to https://myaccount.google.com/permissions
2. Revoke access for the app
3. Run `npm run gmail:reauth` to reauthorize
4. Make sure you see "Has refresh token: ✅ Yes" after authorization

### Token Expired
If your token is expired and refresh fails:
- Run `npm run gmail:reauth` to get a new token with refresh capability

### Checking Token Details
Run with verbose mode to see detailed token information:
```bash
node tools/gmailPreflightCheck.js --verbose
```

## How It Works

1. **Initial Auth**: User authorizes the app and gets both access token (1 hour) and refresh token (permanent)
2. **Auto Refresh**: When accessing Gmail, the system checks if token expires soon
3. **Silent Refresh**: If expiring, uses refresh token to get new access token
4. **Save Token**: New access token is saved to disk for next use

## Token Files

- **Location**: `~/.gmail/token.json` (default)
- **Contents**:
  - `access_token`: Short-lived token for API access
  - `refresh_token`: Long-lived token for getting new access tokens
  - `expiry_date`: When the access token expires (milliseconds)
  - `scope`: Authorized scopes

## Environment Variables

Set in `.env`:
```bash
GMAIL_TOKEN_PATH=~/.gmail/token.json
GMAIL_CREDS_PATH=~/.gcalendar/credentials.json
GMAIL_DEEP=1  # For full email access (gmail.readonly scope)
```

## Security Notes

- Refresh tokens are sensitive - keep them secure
- Token files are saved with restricted permissions (0600)
- Don't commit token files to version control
- Revoke access at https://myaccount.google.com/permissions if compromised
