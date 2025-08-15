#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { fetchFlaggedMessages } = require('../lib/services/gmailService');

function parseArgs(argv) {
  const args = { limit: 50, deep: false, out: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === '--limit' || a === '-l') && argv[i + 1]) { args.limit = Math.max(1, Math.min(500, parseInt(argv[++i], 10) || 50)); continue; }
    if (a === '--deep' || a === '-d') { args.deep = true; continue; }
    if ((a === '--out' || a === '-o') && argv[i + 1]) { args.out = argv[++i]; continue; }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const items = await fetchFlaggedMessages({ limit: args.limit, deep: Boolean(args.deep) });
  if (args.out) {
    const abs = args.out.startsWith('/') ? args.out : path.join(process.cwd(), args.out);
    await fs.promises.mkdir(path.dirname(abs), { recursive: true });
    await fs.promises.writeFile(abs, JSON.stringify({ timestamp: new Date().toISOString(), items }, null, 2));
    console.log('Wrote:', abs);
    return;
  }
  console.log(JSON.stringify(items, null, 2));
}

if (require.main === module) {
  main().catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
}


