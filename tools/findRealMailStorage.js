#!/usr/bin/env node
/**
 * Find where Mail.app is ACTUALLY storing emails
 * Since there are no .emlx files in ~/Library/Mail
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Mail Storage Investigation - Finding Real Email Location');
console.log('=' + '='.repeat(55));
console.log('Issue: 0 .emlx files found, but Mail.app has emails\n');

// 1. Check macOS version (storage changed in recent versions)
console.log('1. System Version:');
console.log('-'.repeat(30));
try {
  const version = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
  console.log(`  macOS ${version}`);
  const major = parseInt(version.split('.')[0]);
  if (major >= 13) {
    console.log('  ⚠️  macOS 13+ uses new Mail storage format!');
  }
} catch {}

// 2. Find Mail data in Containers
console.log('\n2. Checking Container Storage:');
console.log('-'.repeat(30));
const containerPaths = [
  '~/Library/Containers/com.apple.mail/Data',
  '~/Library/Containers/com.apple.mail/Data/Library/Mail',
  '~/Library/Containers/com.apple.mail/Data/Library/Mail Downloads',
  '~/Library/Containers/com.apple.MailServiceAgent',
  '~/Library/Group Containers/group.com.apple.mail'
];

for (const p of containerPaths) {
  const fullPath = p.replace('~', process.env.HOME);
  try {
    if (fs.existsSync(fullPath)) {
      const size = execSync(`du -sh "${fullPath}" 2>/dev/null | cut -f1`, { encoding: 'utf8' }).trim();
      console.log(`  ✓ ${p}`);
      console.log(`    Size: ${size}`);
      
      // Check for email files
      const emlx = execSync(`find "${fullPath}" -name "*.emlx" 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
      const sqlite = execSync(`find "${fullPath}" -name "*.sqlite*" 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
      
      if (parseInt(emlx) > 0) console.log(`    Contains ${emlx} .emlx files!`);
      if (parseInt(sqlite) > 0) console.log(`    Contains ${sqlite} SQLite databases`);
    }
  } catch {}
}

// 3. Look for SQLite databases (modern Mail storage)
console.log('\n3. Mail SQLite Databases:');
console.log('-'.repeat(30));
try {
  const dbs = execSync(`find ~/Library -path "*/com.apple.mail*" -name "*.sqlite*" -size +1M 2>/dev/null`, {
    encoding: 'utf8'
  }).trim();
  
  if (dbs) {
    const dbFiles = dbs.split('\n').filter(Boolean);
    console.log(`  Found ${dbFiles.length} Mail databases:`);
    dbFiles.forEach(db => {
      const size = execSync(`ls -lh "${db}" | awk '{print $5}'`, { encoding: 'utf8' }).trim();
      console.log(`    ${db.replace(process.env.HOME, '~')} (${size})`);
      
      // Check if it contains email data
      try {
        const tables = execSync(`sqlite3 "${db}" ".tables" 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
        if (tables) console.log(`      Tables: ${tables.substring(0, 100)}`);
      } catch {}
    });
  }
} catch {}

// 4. Check iCloud Mail
console.log('\n4. iCloud Mail Storage:');
console.log('-'.repeat(30));
const icloudPaths = [
  '~/Library/Mobile Documents/com~apple~mail',
  '~/Library/Application Support/CloudDocs/session/containers/com.apple.mail'
];

for (const p of icloudPaths) {
  const fullPath = p.replace('~', process.env.HOME);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ ${p} exists`);
  }
}

// 5. Check actual Mail app data location
console.log('\n5. Mail App Data Locations:');
console.log('-'.repeat(30));
try {
  // Find Mail's actual data files
  const mailData = execSync(`find ~/Library -path "*/Mail/*" -type f -size +100k 2>/dev/null | grep -v Cache | head -20`, {
    encoding: 'utf8'
  }).trim();
  
  if (mailData) {
    const files = mailData.split('\n').filter(Boolean);
    console.log(`  Found ${files.length} Mail data files:`);
    
    // Group by extension
    const byExt = {};
    files.forEach(f => {
      const ext = path.extname(f) || 'no-ext';
      byExt[ext] = (byExt[ext] || 0) + 1;
    });
    
    Object.entries(byExt).forEach(([ext, count]) => {
      console.log(`    ${ext}: ${count} files`);
    });
  }
} catch {}

// 6. Search for Alexander in ANY Mail-related file
console.log('\n6. Searching for Alexander in Mail data:');
console.log('-'.repeat(30));
try {
  console.log('  Searching in Containers...');
  const containerSearch = execSync(
    `find ~/Library/Containers/com.apple.mail -type f 2>/dev/null | head -1000 | xargs grep -l "Alexander Lourie\\|bfkn" 2>/dev/null | head -5`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim();
  
  if (containerSearch) {
    const files = containerSearch.split('\n').filter(Boolean);
    console.log(`  ✓ Found ${files.length} files containing Alexander/BFKN:`);
    files.forEach(f => {
      console.log(`    ${f.replace(process.env.HOME, '~').substring(0, 100)}`);
    });
  } else {
    console.log('  No files found containing Alexander/BFKN');
  }
} catch {
  console.log('  Search timed out or failed');
}

console.log('\n' + '='.repeat(56));
console.log('DIAGNOSIS:');
console.log('=' + '='.repeat(55));
console.log('\nMail.app is NOT using traditional .emlx file storage.');
console.log('This is common in macOS 13+ (Ventura) and later.');
console.log('\nPossible storage methods:');
console.log('1. SQLite database (most likely)');
console.log('2. Core Data store');
console.log('3. CloudKit/iCloud sync');
console.log('4. Proprietary format in Containers');
console.log('\nSOLUTION: Use Gmail API for enrichment instead.');
console.log('The local Mail search feature requires .emlx files,');
console.log('which your Mail.app configuration doesn\'t use.');
