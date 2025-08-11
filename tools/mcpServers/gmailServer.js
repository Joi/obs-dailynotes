#!/usr/bin/env node
/**
 * Minimal Gmail MCP server (JSON-RPC 2.0 over stdio)
 * Tools:
 *  - gmail.searchThreads { query: string, limit?: number }
 *    Returns: [{ id, threadId, internalDate, snippet, headers: {From, To, Subject, Date} }]
 *
 * Env:
 *  - GMAIL_CREDS_PATH (path to OAuth creds JSON)
 *  - GMAIL_TOKEN_PATH (path to token JSON; created on first run)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const USE_DEEP = process.env.GMAIL_DEEP === '1' || process.env.GMAIL_SCOPE === 'readonly';
const SCOPES = [USE_DEEP ? 'https://www.googleapis.com/auth/gmail.readonly' : 'https://www.googleapis.com/auth/gmail.metadata'];

function resolveHome(p) { return p && p.startsWith('~') ? path.join(process.env.HOME, p.slice(1)) : p; }

async function authorize(credsPath, tokenPath) {
  const content = JSON.parse(fs.readFileSync(resolveHome(credsPath), 'utf8'));
  const { client_secret, client_id, redirect_uris } = content.installed || content.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  try {
    const token = JSON.parse(fs.readFileSync(resolveHome(tokenPath), 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch {
    const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    process.stderr.write(`Authorize Gmail MCP by visiting this url:\n${authUrl}\n`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    const code = await new Promise((resolve) => rl.question('Enter the code here: ', resolve));
    rl.close();
    const { tokens } = await oAuth2Client.getToken(code.trim());
    oAuth2Client.setCredentials(tokens);
    fs.mkdirSync(path.dirname(resolveHome(tokenPath)), { recursive: true });
    fs.writeFileSync(resolveHome(tokenPath), JSON.stringify(tokens), { mode: 0o600 });
    return oAuth2Client;
  }
}

async function gmailSearchThreads(auth, query, limit = 10) {
  const gmail = google.gmail({ version: 'v1', auth });
  const userId = 'me';
  const out = [];
  let pageToken;
  while (out.length < limit) {
    const res = await gmail.users.messages.list({ userId, q: query, maxResults: Math.min(50, limit - out.length), pageToken });
    const msgs = res.data.messages || [];
    for (const m of msgs) {
      const msg = await gmail.users.messages.get({ userId, id: m.id, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] });
      const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
      out.push({ id: msg.data.id, threadId: msg.data.threadId, internalDate: msg.data.internalDate, snippet: msg.data.snippet, headers });
      if (out.length >= limit) break;
    }
    pageToken = res.data.nextPageToken;
    if (!pageToken || !msgs.length) break;
  }
  return out;
}

function decodePartData(data) {
  if (!data) return '';
  try {
    // Gmail uses URL-safe base64
    const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    return buff.toString('utf8');
  } catch (_) { return ''; }
}

function collectTextParts(payload) {
  if (!payload) return '';
  const stack = [payload];
  const texts = [];
  while (stack.length) {
    const p = stack.pop();
    const mime = (p.mimeType || '').toLowerCase();
    if (mime === 'text/plain' && p.body?.data) {
      texts.push(decodePartData(p.body.data));
    } else if (p.parts && Array.isArray(p.parts)) {
      for (const child of p.parts) stack.push(child);
    } else if (!p.parts && p.body?.data && mime.startsWith('text/')) {
      texts.push(decodePartData(p.body.data));
    }
  }
  return texts.join('\n\n');
}

async function gmailSearchMessagesWithBodies(auth, query, limit = 5) {
  const gmail = google.gmail({ version: 'v1', auth });
  const userId = 'me';
  const out = [];
  let pageToken;
  while (out.length < limit) {
    const res = await gmail.users.messages.list({ userId, q: query, maxResults: Math.min(50, limit - out.length), pageToken });
    const msgs = res.data.messages || [];
    for (const m of msgs) {
      const msg = await gmail.users.messages.get({ userId, id: m.id, format: USE_DEEP ? 'full' : 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] });
      const headers = Object.fromEntries((msg.data.payload?.headers || []).map(h => [h.name, h.value]));
      const bodyText = USE_DEEP ? collectTextParts(msg.data.payload || {}) : '';
      const preview = (bodyText || msg.data.snippet || '').slice(0, 4000);
      out.push({ id: msg.data.id, threadId: msg.data.threadId, internalDate: msg.data.internalDate, headers, preview, snippet: msg.data.snippet || '' });
      if (out.length >= limit) break;
    }
    pageToken = res.data.nextPageToken;
    if (!pageToken || !msgs.length) break;
  }
  return out;
}

// JSON-RPC plumbing
let idCounter = 0;
function send(result, id) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function sendError(message, id) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message } }) + '\n'); }

let authPromise = null;
const tools = [
  { name: 'gmail.searchThreads', description: 'Search Gmail threads by query string', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
  { name: 'gmail.searchMessages', description: 'Search Gmail messages; returns headers and safe preview text (<=2000 chars)', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } }
];

async function handleCall(name, params, id) {
  try {
    if (name === 'gmail.searchThreads') {
      const { query, limit } = params || {};
      if (!query) return sendError('Missing query', id);
      const auth = await authPromise;
      const results = await gmailSearchThreads(auth, query, Math.max(1, Math.min(50, Number(limit) || 10)));
      return send(results, id);
    }
    if (name === 'gmail.searchMessages') {
      const { query, limit } = params || {};
      if (!query) return sendError('Missing query', id);
      const auth = await authPromise;
      const results = await gmailSearchMessagesWithBodies(auth, query, Math.max(1, Math.min(50, Number(limit) || 10)));
      return send(results, id);
    }
    return sendError('Unknown tool', id);
  } catch (e) { return sendError(e.message || 'Tool error', id); }
}

async function main() {
  const creds = process.env.GMAIL_CREDS_PATH || process.env.GCAL_CREDS_PATH; // allow reuse
  const token = process.env.GMAIL_TOKEN_PATH || path.join(process.env.HOME, '.gmail', 'token.json');
  if (!creds) { process.stderr.write('Set GMAIL_CREDS_PATH (or GCAL_CREDS_PATH)\n'); process.exit(1); }
  authPromise = authorize(creds, token);

  let buffer = '';
  process.stdin.on('data', async (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;
      let msg; try { msg = JSON.parse(line); } catch { continue; }
      const { id, method, params } = msg;
      if (method === 'initialize') return send({ serverInfo: { name: 'gmail-mcp', version: '1.0.0' } }, id);
      if (method === 'tools/list') return send({ tools }, id);
      if (method === 'tools/call') return handleCall(params?.name, params?.arguments, id);
      return sendError('Unknown method', id);
    }
  });
}

main().catch((e) => { process.stderr.write(`Fatal: ${e.message}\n`); process.exit(1); });


