#!/usr/bin/env node
/**
 * Process all people-tagged pages safely.
 * Policy:
 *  - Public fetch -> LLM enrich -> normalize
 *  - Gmail fetch only if an email exists; deep only if gmail_deep: true
 * Logs to stdout; redirect from caller if needed.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, env, label) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (res.status !== 0) {
    console.error(`Step failed${label ? ` (${label})` : ''} with code ${res.status}`);
  }
}

function listPeopleNames() {
  const res = spawnSync('node', ['tools/findPeoplePages.js', 'EXCLUDE=Adam Back'], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error('findPeoplePages failed');
    process.exit(res.status);
  }
  return res.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function readFrontmatter(personName) {
  try {
    const abs = path.join('/Users/<Owner>/switchboard', `${personName}.md`);
    const text = fs.readFileSync(abs, 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return {};
    const fm = m[1];
    const out = {};
    const emailsInline = fm.match(/^emails:\s*\[(.*?)\]/m);
    if (emailsInline) {
      out.emails = emailsInline[1].split(',').map(s => s.replace(/^[\s\"\']+|[\s\"\']+$/g,'')).filter(Boolean);
    } else {
      const mm = fm.match(/^emails:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
      if (mm) {
        out.emails = mm[1].split(/\r?\n/).map(l => l.trim()).map(l => l.replace(/^[-\s]+/, '')).filter(l => /@/.test(l));
      }
    }
    const deep = fm.match(/^gmail_deep:\s*(true|false)/mi);
    if (deep) out.gmail_deep = /true/i.test(deep[1]);
    return out;
  } catch { return {}; }
}

function main() {
  const names = listPeopleNames();
  console.log(`Processing ${names.length} people…`);
  for (const name of names) {
    console.log(`\n=== ${name} ===`);
    run('node', ['tools/fetchPublicSnippets.js'], { PERSON_KEY: name }, 'public');
    const fm = readFrontmatter(name);
    const primaryEmail = Array.isArray(fm.emails) && fm.emails.length ? fm.emails[0] : null;
    if (primaryEmail) {
      const env = { PERSON_KEY: name, PERSON_EMAIL: primaryEmail, MCP_GMAIL_CMD: 'node', MCP_GMAIL_ARGS: 'tools/mcpServers/gmailServer.js' };
      if (fm.gmail_deep) env.GMAIL_DEEP = '1';
      run('node', ['tools/mcpClient.js'], env, 'gmail');
    }
    run('node', ['tools/enrichFromLLM.js'], { PERSON_KEY: name }, 'enrich');
    run('node', ['tools/normalizePersonPage.js'], { PERSON_KEY: name }, 'normalize');
  }
  console.log('\nDone.');
}

if (require.main === module) main();


