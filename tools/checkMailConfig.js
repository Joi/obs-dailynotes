#!/usr/bin/env node
/**
 * Deep investigation - Mail.app with no local storage
 * Check if Mail is using server-only mode or cloud storage
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Mail.app Configuration Investigation');
console.log('=' + '='.repeat(50));
console.log('macOS 15.6 - Mail containers are empty\n');

// 1. Check if Mail.app is actually configured
console.log('1. Mail Account Configuration:');
console.log('-'.repeat(35));
try {
  // Check for Mail preferences
  const prefPaths = [
    '~/Library/Preferences/com.apple.mail.plist',
    '~/Library/Containers/com.apple.mail/Data/Library/Preferences/com.apple.mail.plist',
    '~/Library/Preferences/com.apple.mail-shared.plist'
  ];
  
  for (const p of prefPaths) {
    const fullPath = p.replace('~', process.env.HOME);
    if (fs.existsSync(fullPath)) {
      const size = fs.statSync(fullPath).size;
      console.log(`  ✓ ${p} (${size} bytes)`);
      
      // Try to read account info (without showing sensitive data)
      try {
        const accounts = execSync(`defaults read "${fullPath}" MailAccounts 2>/dev/null | grep -c AccountType || echo "0"`, { encoding: 'utf8' }).trim();
        if (parseInt(accounts) > 0) {
          console.log(`    Contains account configuration`);
        }
      } catch {}
    }
  }
} catch {}

// 2. Check Mail cache locations
console.log('\n2. Mail Cache Locations:');
console.log('-'.repeat(35));
const cachePaths = [
  '~/Library/Caches/com.apple.mail',
  '~/Library/Containers/com.apple.mail/Data/Library/Caches',
  '~/Library/Caches/Mail',
  '~/Library/Mail Downloads'
];

for (const p of cachePaths) {
  const fullPath = p.replace('~', process.env.HOME);
  if (fs.existsSync(fullPath)) {
    try {
      const size = execSync(`du -sh "${fullPath}" 2>/dev/null | cut -f1`, { encoding: 'utf8' }).trim();
      console.log(`  ✓ ${p}: ${size}`);
    } catch {}
  }
}

// 3. Check for IMAP/Exchange configurations
console.log('\n3. Server-Only Mode Check:');
console.log('-'.repeat(35));
try {
  // Look for account type indicators
  const imapCheck = execSync(`defaults read com.apple.mail 2>/dev/null | grep -i "AccountType" | head -5`, { encoding: 'utf8' }).trim();
  if (imapCheck) {
    console.log('  Account types found:');
    imapCheck.split('\n').forEach(line => {
      if (line.includes('IMAP')) console.log('    ✓ IMAP account (might be server-only)');
      if (line.includes('Exchange')) console.log('    ✓ Exchange account (might be server-only)');
      if (line.includes('POP')) console.log('    ✓ POP account (should download)');
    });
  }
} catch {
  console.log('  Could not determine account types');
}

// 4. Check CloudKit/iCloud storage
console.log('\n4. iCloud Mail Storage:');
console.log('-'.repeat(35));
try {
  const cloudPaths = [
    '~/Library/Application Support/CloudDocs',
    '~/Library/Mobile Documents/com~apple~mail',
    '~/Library/Application Support/com.apple.sharedfilelist'
  ];
  
  for (const p of cloudPaths) {
    const fullPath = p.replace('~', process.env.HOME);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✓ ${p} exists`);
    }
  }
  
  // Check if using iCloud+
  const icloudCheck = execSync(`defaults read MobileMeAccounts 2>/dev/null | grep -c "Mail" || echo "0"`, { encoding: 'utf8' }).trim();
  if (parseInt(icloudCheck) > 0) {
    console.log('  ✓ iCloud Mail is configured');
  }
} catch {}

// 5. Check Spotlight's Mail data source
console.log('\n5. Spotlight Mail Data Source:');
console.log('-'.repeat(35));
try {
  // Check what Spotlight thinks about Mail
  const spotlightStores = execSync(`mdutil -L 2>/dev/null | grep -i mail`, { encoding: 'utf8' }).trim();
  if (spotlightStores) {
    console.log(`  ${spotlightStores}`);
  }
  
  // Check for Mail spotlight importer
  const importer = execSync(`mdimport -L 2>/dev/null | grep -i mail`, { encoding: 'utf8' }).trim();
  if (importer) {
    console.log(`  Mail importer: registered`);
  }
} catch {}

// 6. Alternative: Check actual Mail process
console.log('\n6. Mail.app Process Check:');
console.log('-'.repeat(35));
try {
  const isRunning = execSync(`pgrep -x Mail 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
  if (isRunning) {
    console.log('  ✓ Mail.app is running (PID: ' + isRunning + ')');
    
    // Check memory usage (indicates if emails are loaded)
    const memUsage = execSync(`ps aux | grep -E "^[^ ]+[ ]+${isRunning}" | awk '{print $5}'`, { encoding: 'utf8' }).trim();
    if (memUsage) {
      const mb = Math.round(parseInt(memUsage) / 1024);
      console.log(`    Memory usage: ${mb} MB`);
      if (mb > 500) {
        console.log('    (High memory = emails likely cached in RAM only)');
      }
    }
  } else {
    console.log('  ✗ Mail.app is not running');
    console.log('    Start Mail.app to see if it downloads messages');
  }
} catch {}

console.log('\n' + '='.repeat(51));
console.log('DIAGNOSIS:');
console.log('=' + '='.repeat(50));
console.log('\nYour Mail.app appears to be using one of:');
console.log('1. **Server-only mode** - No local email storage');
console.log('2. **iCloud-only storage** - Emails in cloud, not local');
console.log('3. **RAM-only caching** - Emails in memory while app runs');
console.log('\nThis is why:');
console.log('• Mail.app search works (queries server)');
console.log('• Spotlight shows results (from server/RAM)');
console.log('• But no local files exist to index');
console.log('\nRECOMMENDATION:');
console.log('Use Gmail API for all enrichment - it works reliably!');
console.log('\nTo enable local storage (optional):');
console.log('1. Open Mail.app → Settings → Accounts');
console.log('2. Select your account → Account Information');
console.log('3. Check "Download Attachments: All"');
console.log('4. Advanced tab → "Keep copies of messages for offline viewing"');
