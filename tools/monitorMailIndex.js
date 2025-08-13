#!/usr/bin/env node
/**
 * Monitor Mail indexing progress
 * Run this while Spotlight is indexing to see when it completes
 */
const { execSync } = require('child_process');

function checkIndexStatus() {
  const checks = [
    { name: 'Mail Messages', cmd: `mdfind "kMDItemKind == 'Mail Message'" 2>/dev/null | wc -l` },
    { name: 'EMLX files', cmd: `mdfind "kMDItemContentType == 'com.apple.mail.emlx'" 2>/dev/null | wc -l` },
    { name: 'Alexander emails', cmd: `mdfind "Alexander Lourie" 2>/dev/null | grep -i mail | wc -l` },
    { name: 'BFKN emails', cmd: `mdfind "bfkn.com" 2>/dev/null | grep -i mail | wc -l` },
  ];
  
  const results = {};
  for (const check of checks) {
    try {
      const count = execSync(check.cmd, { encoding: 'utf8' }).trim();
      results[check.name] = parseInt(count) || 0;
    } catch {
      results[check.name] = 0;
    }
  }
  
  return results;
}

console.log('Mail Indexing Monitor');
console.log('=' + '='.repeat(50));
console.log('Checking every 30 seconds... (Ctrl+C to stop)\n');

let lastTotal = 0;
let checkCount = 0;

const interval = setInterval(() => {
  checkCount++;
  const now = new Date().toLocaleTimeString();
  const status = checkIndexStatus();
  const total = Object.values(status).reduce((a, b) => a + b, 0);
  
  console.log(`[${now}] Check #${checkCount}`);
  console.log(`  Mail Messages: ${status['Mail Messages']}`);
  console.log(`  EMLX files: ${status['EMLX files']}`);
  console.log(`  Alexander emails: ${status['Alexander emails']}`);
  console.log(`  BFKN emails: ${status['BFKN emails']}`);
  
  if (total > lastTotal) {
    console.log(`  📈 Indexing in progress! (+${total - lastTotal} since last check)`);
  } else if (total > 0 && total === lastTotal) {
    console.log(`  ✅ Indexing might be complete (no change)`);
    if (checkCount > 3 && status['Mail Messages'] > 0) {
      console.log('\n🎉 Mail indexing appears complete!');
      console.log('Run the enrichment now:');
      console.log('PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js');
      clearInterval(interval);
      process.exit(0);
    }
  } else if (total === 0) {
    console.log(`  ⏳ Waiting for indexing to start...`);
  }
  
  lastTotal = total;
  console.log();
}, 30000); // Check every 30 seconds

// Initial check
const initial = checkIndexStatus();
console.log('Initial status:');
Object.entries(initial).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});
console.log();

if (initial['Mail Messages'] > 0) {
  console.log('✅ Mail is already indexed! You can run enrichment now.');
  console.log('PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js');
  clearInterval(interval);
  process.exit(0);
}
