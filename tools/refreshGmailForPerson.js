#!/usr/bin/env node
/**
 * Refresh Gmail context for a single person by name.
 *
 * Usage:
 *   node tools/refreshGmailForPerson.js "Taro Chiba"
 *   node tools/refreshGmailForPerson.js --deep "Taro Chiba"   # force deep mode
 *
 * Behavior:
 * - Looks up ~/switchboard/<Name>.md
 * - Reads frontmatter for emails and gmail_deep flag
 * - Picks the first email as primary
 * - Sets env and runs tools/mcpClient.js against the Gmail MCP server
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = { name: null, forceDeep: false };
  const rest = [];
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--deep' || a === '-d') args.forceDeep = true;
    else rest.push(a);
  }
  args.name = rest.join(' ').trim();
  return args;
}

function readFrontmatterFor(name) {
  const abs = path.join('/Users/joi/switchboard', `${name}.md`);
  if (!fs.existsSync(abs)) return { path: abs, emails: [], gmail_deep: false };
  const text = fs.readFileSync(abs, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { path: abs, emails: [], gmail_deep: false };
  const fm = m[1];
  const out = { path: abs, emails: [], gmail_deep: false };
  const emailsInline = fm.match(/^emails:\s*\[(.*?)\]/m);
  if (emailsInline) {
    out.emails = emailsInline[1].split(',').map(s => s.replace(/^[\s"\']+|[\s"\']+$/g,'')).filter(Boolean);
  } else {
    const mm = fm.match(/^emails:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
    if (mm) {
      out.emails = mm[1].split(/\r?\n/).map(l => l.trim()).map(l => l.replace(/^[\-\s]+/, '')).filter(l => /@/.test(l));
    }
  }
  const deep = fm.match(/^gmail_deep:\s*(true|false)/mi);
  if (deep) out.gmail_deep = /true/i.test(deep[1]);
  return out;
}

function upsertGmailDeepFlag(absPath) {
  try {
    let text = fs.readFileSync(absPath, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) {
      // No frontmatter: create one
      const rebuilt = `---\ngmail_deep: true\n---\n\n` + text.replace(/^\s+/, '');
      fs.writeFileSync(absPath, rebuilt);
      return true;
    }
    let fm = m[1];
    if (/^gmail_deep:\s*true\s*$/mi.test(fm)) return false;
    if (/^gmail_deep:\s*false\s*$/mi.test(fm)) {
      fm = fm.replace(/^gmail_deep:\s*false.*$/mi, 'gmail_deep: true');
    } else {
      fm = fm.replace(/[\s\r\n]+$/, '');
      fm += (fm.endsWith('\n') ? '' : '\n') + 'gmail_deep: true';
    }
    const body = text.slice(m[0].length);
    const rebuilt = `---\n${fm}\n---\n` + body;
    fs.writeFileSync(absPath, rebuilt);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const { name, forceDeep } = parseArgs(process.argv);
  if (!name) {
    console.error('Usage: node tools/refreshGmailForPerson.js "Full Name" [--deep]');
    process.exit(1);
  }
  const fm = readFrontmatterFor(name);
  const primaryEmail = Array.isArray(fm.emails) && fm.emails.length ? fm.emails[0] : null;
  if (!primaryEmail) {
    console.error(`No email found in frontmatter for: ${name} (${fm.path})`);
    process.exit(2);
  }
  const env = {
    ...process.env,
    PERSON_KEY: name,
    PERSON_EMAIL: primaryEmail,
    MCP_GMAIL_CMD: 'node',
    MCP_GMAIL_ARGS: 'tools/mcpServers/gmailServer.js'
  };
  if (forceDeep) {
    env.GMAIL_DEEP = '1';
    // Persist the preference to the person page
    upsertGmailDeepFlag(fm.path);
  } else if (fm.gmail_deep) {
    env.GMAIL_DEEP = '1';
  }

  const res = spawnSync('node', ['tools/mcpClient.js'], { stdio: 'inherit', env });
  if (res.status !== 0) process.exit(res.status);
}

if (require.main === module) main();


