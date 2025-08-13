/**
 * Shared Gmail authentication module with automatic token refresh
 * Handles OAuth2 token management including automatic refresh when tokens expire
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

function resolveHome(p) {
  return p && p.startsWith('~') ? path.join(process.env.HOME || '', p.slice(1)) : p;
}

class GmailAuth {
  constructor(credsPath, tokenPath, scopes) {
    this.credsPath = resolveHome(credsPath);
    this.tokenPath = resolveHome(tokenPath);
    this.scopes = scopes;
    this.oAuth2Client = null;
    this.lastRefresh = 0;
  }

  /**
   * Initialize OAuth2 client from credentials
   */
  async initClient() {
    if (this.oAuth2Client) return this.oAuth2Client;
    
    const content = JSON.parse(fs.readFileSync(this.credsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = content.installed || content.web;
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    // Set up automatic token refresh
    this.oAuth2Client.on('tokens', (tokens) => {
      console.error('[GmailAuth] Token refreshed automatically');
      this.saveTokens(tokens);
    });
    
    return this.oAuth2Client;
  }

  /**
   * Load existing token from disk
   */
  loadToken() {
    try {
      const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
      return token;
    } catch (err) {
      return null;
    }
  }

  /**
   * Save tokens to disk, preserving refresh token if not provided
   */
  saveTokens(tokens) {
    try {
      // Load existing token to preserve refresh_token if not in new tokens
      const existingToken = this.loadToken();
      const tokenToSave = {
        ...existingToken,
        ...tokens,
        // Ensure refresh_token is preserved
        refresh_token: tokens.refresh_token || existingToken?.refresh_token
      };
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(this.tokenPath), { recursive: true });
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokenToSave, null, 2), { mode: 0o600 });
      console.error(`[GmailAuth] Token saved to ${this.tokenPath}`);
    } catch (err) {
      console.error(`[GmailAuth] Failed to save token: ${err.message}`);
    }
  }

  /**
   * Check if token needs refresh (expires in less than 5 minutes)
   */
  needsRefresh(token) {
    if (!token.expiry_date) return false;
    const expiryMs = token.expiry_date;
    const nowMs = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;
    return (expiryMs - nowMs) < fiveMinutesMs;
  }

  /**
   * Manually refresh the access token using refresh token
   */
  async refreshAccessToken() {
    const token = this.loadToken();
    if (!token?.refresh_token) {
      throw new Error('No refresh token available. Need to reauthorize.');
    }

    await this.initClient();
    this.oAuth2Client.setCredentials({
      refresh_token: token.refresh_token
    });

    try {
      const { credentials } = await this.oAuth2Client.refreshAccessToken();
      console.error('[GmailAuth] Manually refreshed access token');
      
      // Save the new tokens
      this.saveTokens(credentials);
      this.oAuth2Client.setCredentials(credentials);
      this.lastRefresh = Date.now();
      
      return credentials;
    } catch (err) {
      console.error(`[GmailAuth] Failed to refresh token: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get authenticated client, refreshing token if needed
   */
  async getAuthClient() {
    await this.initClient();
    
    const token = this.loadToken();
    if (!token) {
      throw new Error('No token found. Run authentication first.');
    }

    // Check if we need to refresh
    if (this.needsRefresh(token)) {
      console.error('[GmailAuth] Token expiring soon, refreshing...');
      try {
        await this.refreshAccessToken();
      } catch (err) {
        console.error(`[GmailAuth] Refresh failed: ${err.message}`);
        throw new Error('Token expired and refresh failed. Need to reauthorize.');
      }
    } else {
      this.oAuth2Client.setCredentials(token);
    }

    return this.oAuth2Client;
  }

  /**
   * Generate authorization URL for initial setup
   */
  getAuthUrl() {
    if (!this.oAuth2Client) {
      throw new Error('Client not initialized. Call initClient() first.');
    }
    
    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',  // Essential for getting refresh token
      prompt: 'consent',        // Force consent to ensure refresh token
      scope: this.scopes
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokenFromCode(code) {
    if (!this.oAuth2Client) {
      throw new Error('Client not initialized. Call initClient() first.');
    }

    const { tokens } = await this.oAuth2Client.getToken(code.trim());
    
    if (!tokens.refresh_token) {
      console.error('[GmailAuth] Warning: No refresh token received. May need to revoke access and reauthorize.');
    }
    
    this.saveTokens(tokens);
    this.oAuth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Check token status without refreshing
   */
  checkTokenStatus() {
    const token = this.loadToken();
    if (!token) {
      return { exists: false };
    }

    const now = Date.now();
    const expiryMs = token.expiry_date;
    const isExpired = expiryMs ? now >= expiryMs : false;
    const hoursLeft = expiryMs ? (expiryMs - now) / (1000 * 60 * 60) : null;

    return {
      exists: true,
      hasRefreshToken: !!token.refresh_token,
      isExpired,
      expiryDate: expiryMs ? new Date(expiryMs) : null,
      hoursLeft,
      scope: token.scope || ''
    };
  }
}

module.exports = { GmailAuth };
