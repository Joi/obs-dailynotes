#!/usr/bin/env node
/**
 * Debug Mail.app search - test various search strategies
 */
const { execSync } = require('child_process');

const email = 'alexander.lourie@bfkn.com';
const names = ['Alexander Lourie', 'Alexander', 'Lourie', 'alexander', 'lourie'];
const domain = 'bfkn.com';

console.log('Mail.app Search Debugging');
console.log('=' + '='.repeat(50));
console.log(`Target email: ${email}`);
console.log();

// Test 1: Check if Mail is indexed at all
console.log('1. Checking if Mail messages are indexed by Spotlight:');
try {
  const count = execSync(`mdfind "kMDItemKind == 'Mail Message'" | wc -l`, { encoding: 'utf8' }).trim();
  console.log(`   ✓ Found ${count} total Mail messages indexed`);
  if (parseInt(count) === 0) {
    console.log('   ⚠️  WARNING: No Mail messages indexed! Spotlight may need to be enabled.');
  }
} catch (err) {
  console.log('   ✗ Error checking Mail index:', err.message);
}
console.log();

// Test 2: Search by email address variations
console.log('2. Testing email address searches:');
const emailSearches = [
  `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${email}*'`,
  `kMDItemKind == 'Mail Message' && kMDItemAuthors == '*${email}*'`,
  `kMDItemKind == 'Mail Message' && kMDItemRecipients == '*${email}*'`,
  `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*${domain}*'`,
  `kMDItemKind == 'Mail Message' && kMDItemTextContent == '*alexander*lourie*'`,
];

for (const query of emailSearches) {
  try {
    const shortQuery = query.replace('kMDItemKind == \'Mail Message\' && ', '');
    process.stdout.write(`   Testing: ${shortQuery.substring(0, 50)}... `);
    const result = execSync(`mdfind "${query}" | head -5`, { encoding: 'utf8' });
    const files = result.trim().split('\n').filter(Boolean);
    if (files.length > 0) {
      console.log(`✓ Found ${files.length} messages`);
      // Show first file
      console.log(`      First: ${files[0].substring(files[0].lastIndexOf('/') + 1)}`);
    } else {
      console.log('✗ No results');
    }
  } catch (err) {
    console.log('✗ Error');
  }
}
console.log();

// Test 3: Search by name variations
console.log('3. Testing name searches:');
for (const name of names) {
  try {
    process.stdout.write(`   Testing name: "${name}"... `);
    const query = `kMDItemKind == 'Mail Message' && (kMDItemAuthors == '*${name}*' || kMDItemRecipients == '*${name}*' || kMDItemTextContent == '*${name}*')`;
    const result = execSync(`mdfind "${query}" | head -5`, { encoding: 'utf8' });
    const files = result.trim().split('\n').filter(Boolean);
    if (files.length > 0) {
      console.log(`✓ Found ${files.length} messages`);
    } else {
      console.log('✗ No results');
    }
  } catch (err) {
    console.log('✗ Error');
  }
}
console.log();

// Test 4: Check a sample email file metadata
console.log('4. Checking sample email metadata:');
try {
  // Get any email file
  const anyEmail = execSync(`mdfind "kMDItemKind == 'Mail Message'" | head -1`, { encoding: 'utf8' }).trim();
  if (anyEmail) {
    console.log(`   Sample file: ${anyEmail.substring(anyEmail.lastIndexOf('/') + 1)}`);
    const metadata = execSync(`mdls -name kMDItemAuthors -name kMDItemRecipients -name kMDItemSubject "${anyEmail}"`, { encoding: 'utf8' });
    console.log('   Metadata format:');
    metadata.split('\n').forEach(line => {
      if (line.trim()) console.log(`      ${line}`);
    });
  }
} catch (err) {
  console.log('   ✗ Could not get sample metadata');
}
console.log();

// Test 5: Direct case-insensitive search
console.log('5. Case-insensitive broad search:');
const broadSearches = [
  'lourie',
  'bfkn',
  'alexander lourie',
];

for (const term of broadSearches) {
  try {
    process.stdout.write(`   Searching for "${term}"... `);
    const result = execSync(`mdfind -onlyin ~/Library/Mail "kMDItemKind == 'Mail Message'" | xargs grep -l -i "${term}" 2>/dev/null | head -5`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const files = result.trim().split('\n').filter(Boolean);
    if (files.length > 0) {
      console.log(`✓ Found ${files.length} messages with grep`);
    } else {
      console.log('✗ No results');
    }
  } catch (err) {
    console.log('✗ No results');
  }
}
console.log();

// Test 6: Check Mail folder structure
console.log('6. Checking Mail folder:');
try {
  const mailPath = process.env.HOME + '/Library/Mail';
  const v10Path = mailPath + '/V10';
  const v9Path = mailPath + '/V9';
  
  if (require('fs').existsSync(v10Path)) {
    console.log('   ✓ Found Mail V10 folder');
    const accounts = execSync(`ls -d ${v10Path}/MailData/* 2>/dev/null | head -5`, { encoding: 'utf8' }).trim();
    if (accounts) {
      console.log('   Mail accounts/folders found:');
      accounts.split('\n').slice(0, 3).forEach(a => {
        console.log(`      ${a.substring(a.lastIndexOf('/') + 1)}`);
      });
    }
  } else if (require('fs').existsSync(v9Path)) {
    console.log('   ✓ Found Mail V9 folder');
  } else {
    console.log('   ⚠️  No standard Mail folder found');
  }
} catch (err) {
  console.log('   ✗ Could not check Mail folder');
}
console.log();

console.log('Recommendations:');
console.log('1. If no messages are indexed, enable Spotlight for Mail:');
console.log('   System Preferences > Spotlight > Privacy > Remove Mail if present');
console.log('   OR rebuild: mdimport -r /System/Library/Spotlight/Mail.mdimporter');
console.log();
console.log('2. If messages exist but search fails, try:');
console.log('   - Different search terms (just last name, domain)');
console.log('   - Check if emails are in a different format in metadata');
console.log();
console.log('3. Alternative: Export emails from Mail.app and use Gmail API');
