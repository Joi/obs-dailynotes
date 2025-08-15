const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

function resolveHome(p) { return p && p.startsWith('~') ? path.join(process.env.HOME, p.slice(1)) : p; }

async function authorizeGmail({ deep = false } = {}) {
    const credsPath = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH || path.join(process.env.HOME, '.gcalendar', 'credentials.json');
    const gmailTokenPath = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
    const tokenPath = fs.existsSync(resolveHome(gmailTokenPath)) ? gmailTokenPath : (process.env.GCAL_TOKEN_PATH || gmailTokenPath);
    const SCOPES = [deep ? 'https://www.googleapis.com/auth/gmail.readonly' : 'https://www.googleapis.com/auth/gmail.metadata'];

    const content = JSON.parse(fs.readFileSync(resolveHome(credsPath), 'utf8'));
    const { client_secret, client_id, redirect_uris } = content.installed || content.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const token = JSON.parse(fs.readFileSync(resolveHome(tokenPath), 'utf8'));
    oAuth2Client.setCredentials(token);
    oAuth2Client.scopes = SCOPES;
    return oAuth2Client;
}

async function listMessages(gmail, q, maxResults = 50, pageToken) {
    const userId = 'me';
    const res = await gmail.users.messages.list({ userId, q, maxResults, pageToken });
    return res.data;
}

async function getMessage(gmail, id, { deep = false } = {}) {
    const userId = 'me';
    const res = await gmail.users.messages.get({ userId, id, format: deep ? 'full' : 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID'] });
    return res.data;
}

async function fetchFlaggedMessages({ log = console, limit = 50, deep = false } = {}) {
    const auth = await authorizeGmail({ deep });
    const gmail = google.gmail({ version: 'v1', auth });
    const out = [];
    let pageToken;
    const q = 'is:starred OR label:starred';
    while (out.length < limit) {
        const data = await listMessages(gmail, q, Math.min(50, limit - out.length), pageToken);
        const msgs = data.messages || [];
        for (const m of msgs) {
            const msg = await getMessage(gmail, m.id, { deep });
            const headers = Object.fromEntries((msg.payload?.headers || []).map(h => [h.name, h.value]));
            out.push({
                id: msg.id,
                threadId: msg.threadId,
                subject: headers.Subject || '',
                from: headers.From || '',
                date: headers.Date || '',
                messageId: headers['Message-ID'] || headers['Message-Id'] || headers['Message-id'] || '',
                snippet: deep ? (msg.snippet || '') : undefined,
            });
            if (out.length >= limit) break;
        }
        pageToken = data.nextPageToken;
        if (!pageToken || !msgs.length) break;
    }
    if (log && log.info) log.info(`gmailService: fetched ${out.length} flagged messages`);
    return out;
}

async function unstarMessage({ id, auth }) {
    const gmail = google.gmail({ version: 'v1', auth });
    await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['STARRED'] } });
}

module.exports = {
    fetchFlaggedMessages,
    authorizeGmail,
    unstarMessage,
};


