#!/usr/bin/env node
/**
 * Fix Spotlight indexing for Mail.app
 * When Mail.app search works but Spotlight doesn't see Mail messages
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Mail.app Spotlight Index Fixer');
console.log('=' + '='.repeat(50));
console.log('Issue: Mail.app search works, but Spotlight doesn\'t index emails\n');

// Step 1: Check current Spotlight status
console.log('Step 1: Current Spotlight Status');
console.log('-'.repeat(35));
try {
  // Check if Mail is in Spotlight exclusions
  const exclusions = execSync(`defaults read /.Spotlight-V100/VolumeConfiguration.plist Exclusions 2>/dev/null || echo "none"`, { encoding: 'utf8' }).trim();
  if (exclusions.includes('Mail')) {
    console.log('⚠️  Mail might be excluded from Spotlight!');
  } else {
    console.log('✓ Mail not explicitly excluded');
  }
  
  // Check indexing status
  const indexStatus = execSync(`mdutil -s / | head -3`, { encoding: 'utf8' }).trim();
  console.log('Indexing status:');
  console.log('  ' + indexStatus.replace(/\n/g, '\n  '));
  
  // Check if Mail importer exists
  const importers = execSync(`mdimport -L 2>/dev/null | grep -i mail || echo "not found"`, { encoding: 'utf8' }).trim();
  if (importers !== 'not found') {
    console.log('✓ Mail importer is registered');
  } else {
    console.log('✗ Mail importer NOT registered!');
  }
} catch (err) {
  console.log('Could not check status:', err.message);
}

// Step 2: Check Mail storage location
console.log('\nStep 2: Verify Mail Storage');
console.log('-'.repeat(35));
const mailPaths = [
  process.env.HOME + '/Library/Mail',
  process.env.HOME + '/Library/Containers/com.apple.mail/Data/Library/Mail'
];

let actualMailPath = null;
for (const path of mailPaths) {
  if (fs.existsSync(path)) {
    try {
      const size = execSync(`du -sh "${path}" 2>/dev/null | cut -f1`, { encoding: 'utf8' }).trim();
      console.log(`✓ Found: ${path}`);
      console.log(`  Size: ${size}`);
      actualMailPath = path;
      break;
    } catch {}
  }
}

// Step 3: Test current indexing
console.log('\nStep 3: Test Current Indexing');
console.log('-'.repeat(35));
try {
  const mailCount = execSync(`mdfind "kMDItemKind == 'Mail Message'" 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
  console.log(`Currently indexed Mail messages: ${mailCount}`);
  
  if (parseInt(mailCount) === 0) {
    console.log('⚠️  No messages indexed - Spotlight needs fixing');
  } else {
    console.log('✓ Some messages are indexed');
  }
} catch {}

// Step 4: Generate fix commands
console.log('\n' + '='.repeat(51));
console.log('FIX INSTRUCTIONS');
console.log('='.repeat(51));

console.log('\nMethod 1: Quick Fix (Try First)');
console.log('-'.repeat(35));
console.log('Run these commands in Terminal:\n');
console.log('# 1. Re-register Mail importer');
console.log('sudo mdimport -r /System/Library/Spotlight/Mail.mdimporter\n');
console.log('# 2. Force import Mail folder');
if (actualMailPath) {
  console.log(`mdimport "${actualMailPath}"`);
} else {
  console.log('mdimport ~/Library/Mail');
}
console.log('\n# 3. Wait 5 minutes, then test:');
console.log('mdfind "kMDItemKind == \'Mail Message\'" | wc -l');
console.log('# Should show a large number (thousands)\n');

console.log('\nMethod 2: System Preferences Fix');
console.log('-'.repeat(35));
console.log('1. Open System Settings → Siri & Spotlight → Spotlight Privacy');
console.log('2. Click the + button');
console.log('3. Navigate to ~/Library/Mail and add it');
console.log('4. Click Remove (-) to remove it immediately');
console.log('5. This forces Spotlight to reindex Mail');
console.log('6. Wait 10-15 minutes for indexing\n');

console.log('Method 3: Reset Spotlight Index (Nuclear Option)');
console.log('-'.repeat(35));
console.log('Run these commands (requires admin password):\n');
console.log('# Turn off indexing');
console.log('sudo mdutil -i off /\n');
console.log('# Delete Spotlight index');
console.log('sudo rm -rf /.Spotlight-V100\n');
console.log('# Turn indexing back on');
console.log('sudo mdutil -i on /\n');
console.log('# Force rebuild');
console.log('sudo mdutil -E /\n');
console.log('# This will reindex EVERYTHING (takes 30-60 minutes)\n');

console.log('Method 4: Mail-Specific Reindex');
console.log('-'.repeat(35));
console.log('# Just reindex Mail without affecting other Spotlight data:');
console.log('sudo mdutil -E ~/Library/Mail');
console.log('mdimport -d1 ~/Library/Mail\n');

// Step 5: Test command
console.log('TEST AFTER FIXING');
console.log('='.repeat(51));
console.log('\nRun this to verify the fix worked:');
console.log('-'.repeat(35));
console.log('node tools/quickTestAlexander.js\n');
console.log('Expected result: Should find thousands of Mail messages');
console.log('and specifically find Alexander Lourie emails.\n');

// Step 6: Alternative if nothing works
console.log('IF NOTHING WORKS - ALTERNATIVE APPROACH');
console.log('='.repeat(51));
console.log('\nWe can build a custom index from Mail\'s SQLite database:');
console.log('(Mail.app stores its search index in SQLite files)');
console.log('\n1. Find Mail\'s database:');
console.log('find ~/Library/Mail -name "*.sqlite" -size +1M 2>/dev/null\n');
console.log('2. We can create a custom search tool that queries');
console.log('   Mail\'s SQLite directly instead of using Spotlight\n');
console.log('Let me know if you want to try this approach!\n');
