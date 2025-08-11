#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

async function fetchGmailMessagesWithPreview(client, email, limit = 5) {
  try {
    const res = await client.callTool('gmail.searchMessages', { query: `from:${email} OR to:${email}`, limit });
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

function readCache(personKey) {
  const p = cachePathFor(personKey);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function writeCache(personKey, merge) {
  const p = cachePathFor(personKey);
  let existing = {};
  if (fs.existsSync(p)) {
    try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  const data = existing.data || {};
  const merged = { timestamp: new Date().toISOString(), data: { ...data, ...merge } };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2));
  return p;
}

function resolvePersonFilePath(personKey, personFileEnv) {
  if (personFileEnv) {
    return path.isAbsolute(personFileEnv) ? personFileEnv : path.join('/Users/joi/switchboard', personFileEnv);
  }
  if (!personKey) return null;
  const baseDir = '/Users/joi/switchboard';
  const candidates = [];
  // Direct
  candidates.push(path.join(baseDir, `${personKey}.md`));
  // Variant: parentheses -> hyphen
  const parenToHyphen = personKey.replace(/\s*\(([^)]+)\)\s*$/, ' - $1');
  if (parenToHyphen !== personKey) candidates.push(path.join(baseDir, `${parenToHyphen}.md`));
  // Variant: hyphen -> parentheses
  const hyphenToParen = personKey.replace(/\s*-\s*([^()]+)\s*$/, ' ($1)');
  if (hyphenToParen !== personKey) candidates.push(path.join(baseDir, `${hyphenToParen}.md`));
  for (const p of candidates) if (fs.existsSync(p)) return p;
  // Fallback: consult people.index.json
  try {
    const dailyDir = process.env.DAILY_NOTE_PATH;
    const vaultRoot = dailyDir ? path.resolve(dailyDir, '..') : baseDir;
    const idxPath = path.join(vaultRoot, 'people.index.json');
    if (fs.existsSync(idxPath)) {
      const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
      // Direct name
      if (idx[personKey]?.pagePath) {
        const p = path.join(vaultRoot, idx[personKey].pagePath);
        if (fs.existsSync(p)) return p;
      }
      // Alias match
      for (const [name, rec] of Object.entries(idx)) {
        const aliases = Array.isArray(rec.aliases) ? rec.aliases : [];
        if (name === personKey || aliases.includes(personKey)) {
          const p = path.join(vaultRoot, rec.pagePath);
          if (fs.existsSync(p)) return p;
        }
      }
    }
  } catch {}
  return path.join(baseDir, `${personKey}.md`);
}

function readFrontmatterFlag(personFilePath, flagKey) {
  try {
    if (!personFilePath || !fs.existsSync(personFilePath)) return null;
    const txt = fs.readFileSync(personFilePath, 'utf8');
    const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return null;
    const fm = m[1];
    const re = new RegExp(`^${flagKey}:\\s*(true|false)\\s*$`, 'mi');
    const mm = fm.match(re);
    if (!mm) return null;
    return /^true$/i.test(mm[1]);
  } catch { return null; }
}

async function main() {
  const email = process.env.PERSON_EMAIL || '';
  const personKey = process.env.PERSON_KEY || email || 'unknown';
  const out = {}; // we will merge selectively
  const existing = readCache(personKey) || {};

  if (!email) {
    console.error('Set PERSON_EMAIL to query.');
    process.exit(1);
  }

  const gmailCmd = process.env.MCP_GMAIL_CMD;
  const gmailArgs = (process.env.MCP_GMAIL_ARGS || '').split(' ').filter(Boolean);
  const calCmd = process.env.MCP_CAL_CMD;
  const calArgs = (process.env.MCP_CAL_ARGS || '').split(' ').filter(Boolean);

  if (gmailCmd) {
    let deep = (process.env.GMAIL_DEEP === '1' || /^(true|1)$/i.test(process.env.GMAIL_DEEP || ''));
    if (!deep) {
      const personFilePath = resolvePersonFilePath(personKey, process.env.PERSON_FILE);
      const flag = readFrontmatterFlag(personFilePath, 'gmail_deep');
      if (flag === true) deep = true;
    }
    if (deep) process.env.GMAIL_DEEP = '1';
    const gmail = await withServer({ cmd: gmailCmd, args: gmailArgs, fn: (c) => deep ? fetchGmailMessagesWithPreview(c, email, 10) : fetchGmailSummaryByEmail(c, email, 10) });
    const prev = (existing.data && existing.data.gmailByEmail) || {};
    out.gmailByEmail = { ...prev, [email]: gmail };
  }
  if (calCmd) {
    const calendar = await withServer({ cmd: calCmd, args: calArgs, fn: (c) => fetchCalendarByAttendee(c, email, 365, 60) });
    const prev = (existing.data && existing.data.calendarDirectByEmail) || {};
    out.calendarDirectByEmail = { ...prev, [email]: calendar };
  }

  const p = writeCache(personKey, out);
  console.log('Wrote cache:', p);
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}

module.exports = { MCPClient, withServer, fetchGmailSummaryByEmail, fetchCalendarByAttendee, cachePathFor, writeCache };


