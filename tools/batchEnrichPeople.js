#!/usr/bin/env node
/**
 * Batch enrichment runner for a small list of people
 * Usage:
 *   node tools/batchEnrichPeople.js "Adam Back" "Takayuki Noro"
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, env, { allowFail = false } = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (res.status !== 0 && !allowFail) process.exit(res.status);
}

function readFrontmatter(personName) {
  try {
    const abs = path.join('/Users/joi/switchboard', `${personName}.md`);
    const text = fs.readFileSync(abs, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return {};
    const fm = m[1];
    const out = {};
    // emails inline
    const emailsInline = fm.match(/^emails:\s*\[(.*?)\]/m);
    if (emailsInline) {
      out.emails = emailsInline[1].split(',').map(s => s.replace(/^[\s\"\']+|[\s\"\']+$/g,'')).filter(Boolean);
    } else {
      // list form
      const mm = fm.match(/^emails:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
      if (mm) {
        out.emails = mm[1].split(/\r?\n/).map(l => l.trim()).map(l => l.replace(/^[-\s]+/, '')).filter(l => /@/.test(l));
      }
    }
    const deep = fm.match(/^gmail_deep:\s*(true|false)/mi);
    if (deep) out.gmail_deep = /true/i.test(deep[1]);
    const md = fm.match(/^mail_depth:\s*(\d+)/mi);
    if (md) out.mail_depth = parseInt(md[1], 10);
    return out;
  } catch { return {}; }
}

async function main() {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.error('Provide at least one person name');
    process.exit(1);
  }
  for (const name of names) {
    console.log(`\n=== Enriching ${name} ===`);
    run('node', ['tools/fetchPublicSnippets.js'], { PERSON_KEY: name });
    const fm = readFrontmatter(name);
    const primaryEmail = Array.isArray(fm.emails) && fm.emails.length ? fm.emails[0] : null;
    if (primaryEmail) {
      const env = { PERSON_KEY: name, PERSON_EMAIL: primaryEmail, MCP_GMAIL_CMD: 'node', MCP_GMAIL_ARGS: 'tools/mcpServers/gmailServer.js' };
      if (fm.gmail_deep) env.GMAIL_DEEP = '1';
      const depth = typeof fm.mail_depth === 'number' ? fm.mail_depth : null;
      if (depth !== 0) {
        run('node', ['tools/mcpClient.js'], env, { allowFail: true });
      } else {
        console.log('mail_depth: 0 — skipping Gmail fetch for this person.');
      }
    }
    run('node', ['tools/enrichFromLLM.js'], { PERSON_KEY: name });
    run('node', ['tools/normalizePersonPage.js'], { PERSON_KEY: name });
  }
}

if (require.main === module) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}


