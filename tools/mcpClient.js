#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

class MCPClient {
  constructor(serverCmd, serverArgs = [], options = {}) {
    this.serverCmd = serverCmd;
    this.serverArgs = serverArgs;
    this.proc = null;
    this.id = 0;
    this.pending = new Map();
    this.initialized = false;
    this.options = options;
  }

  start() {
    this.proc = spawn(this.serverCmd, this.serverArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '';
    this.proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message || 'MCP error'));
            else resolve(msg.result);
          }
        } catch (_) {}
      }
    });
    this.proc.stderr.on('data', () => {});
  }

  send(method, params) {
    const id = ++this.id;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    this.proc.stdin.write(payload + '\n');
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async initialize(clientInfo = { name: 'obs-dailynotes', version: '1.0.0' }) {
    const res = await this.send('initialize', { clientInfo });
    this.initialized = true;
    return res;
  }

  listTools() {
    return this.send('tools/list', {});
  }

  callTool(name, argumentsObj) {
    return this.send('tools/call', { name, arguments: argumentsObj });
  }

  close() {
    try { this.proc.stdin.end(); } catch {}
    try { this.proc.kill(); } catch {}
  }
}

async function withServer({ cmd, args, fn }) {
  const client = new MCPClient(cmd, args);
  client.start();
  try {
    await client.initialize();
    return await fn(client);
  } finally {
    client.close();
  }
}

// Gmail/Calendar helpers (tool names depend on the specific MCP server implementation)
async function fetchGmailSummaryByEmail(client, email, limit = 5) {
  try {
    const res = await client.callTool('gmail.searchThreads', { query: `from:${email} OR to:${email}`, limit });
    return res;
  } catch (_) {
    return null;
  }
}

async function fetchCalendarByAttendee(client, email, daysBack = 365, daysForward = 30) {
  try {
    const res = await client.callTool('calendar.listEvents', { attendee: email, daysBack, daysForward });
    return res;
  } catch (_) {
    return null;
  }
}

function cachePathFor(personKey) {
  const root = path.join(__dirname, '..', 'data', 'people_cache');
  ensureDir(root);
  const file = personKey.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '.json';
  return path.join(root, file);
}

function writeCache(personKey, data) {
  const p = cachePathFor(personKey);
  fs.writeFileSync(p, JSON.stringify({ timestamp: new Date().toISOString(), data }, null, 2));
  return p;
}

async function main() {
  const email = process.env.PERSON_EMAIL || '';
  const personKey = process.env.PERSON_KEY || email || 'unknown';
  const out = { email, gmail: null, calendar: null };

  if (!email) {
    console.error('Set PERSON_EMAIL to query.');
    process.exit(1);
  }

  const gmailCmd = process.env.MCP_GMAIL_CMD;
  const gmailArgs = (process.env.MCP_GMAIL_ARGS || '').split(' ').filter(Boolean);
  const calCmd = process.env.MCP_CAL_CMD;
  const calArgs = (process.env.MCP_CAL_ARGS || '').split(' ').filter(Boolean);

  if (gmailCmd) {
    out.gmail = await withServer({ cmd: gmailCmd, args: gmailArgs, fn: (c) => fetchGmailSummaryByEmail(c, email, 10) });
  }
  if (calCmd) {
    out.calendar = await withServer({ cmd: calCmd, args: calArgs, fn: (c) => fetchCalendarByAttendee(c, email, 365, 60) });
  }

  const p = writeCache(personKey, out);
  console.log('Wrote cache:', p);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}

module.exports = { MCPClient, withServer, fetchGmailSummaryByEmail, fetchCalendarByAttendee, cachePathFor, writeCache };


