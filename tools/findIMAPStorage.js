#!/usr/bin/env node
/**
 * Find where macOS 15.6 is ACTUALLY storing IMAP emails
 * They must be somewhere since Mail.app search works!
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Finding IMAP Email Storage on macOS 15.6');
console.log('=' + '='.repeat(50));
console.log('Your emails ARE indexed locally, just not where expected\n');

// 1. Search EVERYWHERE in Library for Mail data
console.log('1. Comprehensive Library Search:');
console.log('-'.repeat(35));
try {
  const searches = [
    { desc: 'Any .emlx files anywhere', cmd: `find ~/Library -name "*.emlx" 2>/dev/null | wc -l` },
    { desc: 'Any .eml files', cmd: `find ~/Library -name "*.eml" 2>/dev/null | wc -l` },
    { desc: 'Envelope Index files', cmd: `find ~/Library -name "*Envelope*" 2>/dev/null | head -10` },
    { desc: 'Messages directories', cmd: `find ~/Library -type d -name "Messages" 2>/dev/null | head -10` },
    { desc: 'IMAP directories', cmd: `find ~/Library -type d -name "*IMAP*" 2>/dev/null | head -10` },
    { desc: 'Mail Data directories', cmd: `find ~/Library -type d -name "*MailData*" 2>/dev/null | head -10` },
  ];
  
  for (const {desc, cmd} of searches) {
    console.log(`  ${desc}:`);
    const result = execSync(cmd, { encoding: 'utf8' }).trim();
    if (result && result !== '0') {
      console.log(`    ${result}`);
    } else {
      console.log(`    None found`);
    }
  }
} catch {}

// 2. Check new macOS 15 locations
console.log('\n2. macOS 15 Specific Locations:');
console.log('-'.repeat(35));
const newPaths = [
  '~/Library/Mail/V11',  // macOS 15 might use V11
  '~/Library/Mail/V10',
  '~/Library/Mail/V9',
  '~/Library/Mail/Bundles',
  '~/Library/Mail/MailData',
  '~/Library/Application Support/Mail',
  '~/Library/Group Containers/group.com.apple.mail/Library'
];

for (const p of newPaths) {
  const fullPath = p.replace('~', process.env.HOME);
  if (fs.existsSync(fullPath)) {
    try {
      const size = execSync(`du -sh "${fullPath}" 2>/dev/null | cut -f1`, { encoding: 'utf8' }).trim();
      console.log(`  ✓ ${p}: ${size}`);
      
      // List contents
      const contents = fs.readdirSync(fullPath).slice(0, 5);
      if (contents.length > 0) {
        console.log(`    Contents: ${contents.join(', ')}`);
      }
    } catch {}
  }
}

// 3. Search for large files that could be mail storage
console.log('\n3. Large Files (potential mail storage):');
console.log('-'.repeat(35));
try {
  const largeFiles = execSync(`find ~/Library -type f -size +50M -path "*/Mail/*" 2>/dev/null | head -10`, {
    encoding: 'utf8'
  }).trim();
  
  if (largeFiles) {
    const files = largeFiles.split('\n').filter(Boolean);
    console.log(`  Found ${files.length} large Mail files:`);
    files.forEach(f => {
      const size = execSync(`ls -lh "${f}" | awk '{print $5}'`, { encoding: 'utf8' }).trim();
      console.log(`    ${path.basename(f)} (${size})`);
      console.log(`      Path: ${f.replace(process.env.HOME, '~')}`);
    });
  } else {
    console.log('  No large files in Mail directories');
  }
} catch {}

// 4. Check for Core Data stores
console.log('\n4. Core Data / Database Storage:');
console.log('-'.repeat(35));
try {
  const stores = execSync(`find ~/Library -name "*.store" -o -name "*.db" -o -name "*.sqlite*" | grep -i mail | head -10`, {
    encoding: 'utf8'
  }).trim();
  
  if (stores) {
    const files = stores.split('\n').filter(Boolean);
    console.log(`  Found ${files.length} database files:`);
    files.forEach(f => {
      const size = execSync(`ls -lh "${f}" 2>/dev/null | awk '{print $5}'`, { encoding: 'utf8' }).trim();
      console.log(`    ${path.basename(f)} (${size})`);
    });
  }
} catch {}

// 5. Use fs_usage to see what Mail.app is accessing (requires sudo)
console.log('\n5. Mail.app File Access (if running):');
console.log('-'.repeat(35));
try {
  const mailPid = execSync(`pgrep -x Mail | head -1`, { encoding: 'utf8' }).trim();
  if (mailPid) {
    console.log(`  Mail.app is running (PID: ${mailPid})`);
    console.log('  To see what files it\'s accessing, run:');
    console.log(`    sudo fs_usage -w -f pathname ${mailPid} | grep -v Cache`);
    console.log('  Then search for an email in Mail.app and watch the output');
  } else {
    console.log('  Mail.app not running - start it and search for an email');
  }
} catch {}

// 6. Check mdfind with different attributes
console.log('\n6. Alternative Spotlight Queries:');
console.log('-'.repeat(35));
const mdQueries = [
  { desc: 'com.apple.mail.message', cmd: `mdfind "kMDItemContentType == 'com.apple.mail.message'" | wc -l` },
  { desc: 'public.email-message', cmd: `mdfind "kMDItemContentType == 'public.email-message'" | wc -l` },
  { desc: 'Mail in path', cmd: `mdfind "kMDItemPath == '*Mail*'" | wc -l` },
  { desc: 'IMAP in content', cmd: `mdfind "IMAP" | grep -i mail | wc -l` },
];

for (const {desc, cmd} of mdQueries) {
  try {
    const count = execSync(cmd, { encoding: 'utf8' }).trim();
    console.log(`  ${desc}: ${count}`);
  } catch {
    console.log(`  ${desc}: 0`);
  }
}

// 7. Direct test - can we find Alexander's emails?
console.log('\n7. Direct Search Test:');
console.log('-'.repeat(35));
try {
  // Get ALL Alexander Lourie results and analyze them
  const alexResults = execSync(`mdfind "Alexander Lourie" 2>/dev/null`, { encoding: 'utf8' }).trim();
  if (alexResults) {
    const files = alexResults.split('\n').filter(Boolean);
    console.log(`  Found ${files.length} "Alexander Lourie" results`);
    
    // Group by directory
    const byDir = {};
    files.forEach(f => {
      const dir = path.dirname(f);
      const key = dir.replace(process.env.HOME, '~');
      byDir[key] = (byDir[key] || 0) + 1;
    });
    
    console.log('  Results by directory:');
    Object.entries(byDir)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([dir, count]) => {
        console.log(`    ${dir}: ${count} files`);
      });
  }
} catch {}

console.log('\n' + '='.repeat(51));
console.log('NEXT STEPS:');
console.log('=' + '='.repeat(50));
console.log('\n1. Start Mail.app and search for "Alexander Lourie"');
console.log('2. While results are showing, run this in another terminal:');
console.log('   sudo lsof -p $(pgrep Mail) | grep -i alexander');
console.log('\n3. This will show exactly what files Mail.app has open');
console.log('4. Share those file paths and we can update the search');
console.log('\nAlternatively, just use Gmail API which already works:');
console.log('  SKIP_LOCAL=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" \\');
console.log('    node tools/enrichFromLLM.js');
