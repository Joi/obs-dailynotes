#!/usr/bin/env node
/**
 * Deep search for where Mail.app is actually storing emails
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Deep Mail.app Storage Investigation');
console.log('=' + '='.repeat(50));

// 1. Check all possible Mail locations
console.log('\n1. Checking Mail storage locations:');
const locations = [
  '~/Library/Mail',
  '~/Library/Containers/com.apple.mail/Data/Library/Mail',
  '~/Library/Group Containers/group.com.apple.mail',
  '~/Library/Caches/Mail',
  '~/Library/Containers/com.apple.MailServiceAgent',
];

for (const loc of locations) {
  const fullPath = loc.replace('~', process.env.HOME);
  try {
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const size = execSync(`du -sh "${fullPath}" 2>/dev/null | cut -f1`, { encoding: 'utf8' }).trim();
      console.log(`  ✓ ${loc}`);
      console.log(`    Size: ${size}`);
      
      // Check for any email-like files
      const fileTypes = execSync(`find "${fullPath}" -type f -name "*.emlx" -o -name "*.eml" -o -name "*.mbox" -o -name "*.sqlite" 2>/dev/null | head -20`, { encoding: 'utf8' }).trim();
      if (fileTypes) {
        const files = fileTypes.split('\n').filter(Boolean);
        console.log(`    Found ${files.length}+ email-related files`);
        if (files.length > 0) {
          console.log(`    Example: ${files[0].substring(files[0].lastIndexOf('/') + 1)}`);
        }
      }
    } else {
      console.log(`  ✗ ${loc} - not found`);
    }
  } catch (err) {
    console.log(`  ✗ ${loc} - error: ${err.message}`);
  }
}

// 2. Check Mail versions
console.log('\n2. Checking Mail version folders:');
try {
  const mailRoot = process.env.HOME + '/Library/Mail';
  if (fs.existsSync(mailRoot)) {
    const contents = fs.readdirSync(mailRoot);
    console.log(`  Contents of ~/Library/Mail:`);
    contents.forEach(item => {
      const itemPath = path.join(mailRoot, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        console.log(`    📁 ${item}/`);
        // Check subdirectories
        try {
          const subItems = fs.readdirSync(itemPath).slice(0, 5);
          subItems.forEach(sub => {
            console.log(`       - ${sub}`);
          });
        } catch {}
      } else {
        console.log(`    📄 ${item}`);
      }
    });
  }
} catch (err) {
  console.log(`  Error listing Mail directory: ${err.message}`);
}

// 3. Check Container Mail
console.log('\n3. Checking Container-based Mail storage:');
try {
  const containerPath = process.env.HOME + '/Library/Containers/com.apple.mail/Data/Library/Mail';
  if (fs.existsSync(containerPath)) {
    console.log('  ✓ Container Mail path exists');
    const contents = fs.readdirSync(containerPath);
    contents.forEach(item => {
      console.log(`    - ${item}`);
    });
    
    // Count email files in container
    const emlxCount = execSync(`find "${containerPath}" -name "*.emlx" 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
    console.log(`    .emlx files in container: ${emlxCount}`);
  } else {
    console.log('  ✗ No container-based Mail storage');
  }
} catch (err) {
  console.log(`  Error checking container: ${err.message}`);
}

// 4. Check for SQLite databases
console.log('\n4. Checking for Mail SQLite databases:');
try {
  const dbSearch = execSync(`find ~/Library -name "*.sqlite*" -path "*/Mail/*" 2>/dev/null | grep -i mail | head -10`, { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  }).trim();
  
  if (dbSearch) {
    console.log('  Found Mail-related SQLite databases:');
    dbSearch.split('\n').forEach(db => {
      const size = execSync(`ls -lh "${db}" 2>/dev/null | awk '{print $5}'`, { encoding: 'utf8' }).trim();
      console.log(`    ${db.substring(db.lastIndexOf('/') + 1)} (${size})`);
    });
  } else {
    console.log('  No Mail SQLite databases found');
  }
} catch {
  console.log('  No Mail SQLite databases found');
}

// 5. Check what Mail.app process is accessing
console.log('\n5. Checking if Mail.app is running and what files it has open:');
try {
  const mailPid = execSync(`pgrep -x Mail`, { encoding: 'utf8' }).trim();
  if (mailPid) {
    console.log(`  ✓ Mail.app is running (PID: ${mailPid})`);
    
    // Check open files (limited view)
    const openFiles = execSync(`lsof -p ${mailPid} 2>/dev/null | grep -E "emlx|sqlite|Mail" | head -10`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    if (openFiles) {
      console.log('  Sample of open files:');
      openFiles.split('\n').slice(0, 5).forEach(line => {
        const parts = line.split(/\s+/);
        if (parts.length > 8) {
          const file = parts.slice(8).join(' ');
          if (file.includes('/')) {
            console.log(`    ${file.substring(file.lastIndexOf('/') + 1)}`);
          }
        }
      });
    }
  } else {
    console.log('  ✗ Mail.app is not running');
    console.log('  Start Mail.app and run this script again for more info');
  }
} catch {
  console.log('  ✗ Could not check Mail.app process');
}

// 6. Check Spotlight status
console.log('\n6. Checking Spotlight indexing status:');
try {
  const mdStatus = execSync(`mdutil -s / | grep -A1 "Indexing"`, { encoding: 'utf8' }).trim();
  console.log(`  ${mdStatus.replace(/\n/g, '\n  ')}`);
  
  // Check if Mail importer is loaded
  const importers = execSync(`mdimport -L | grep -i mail`, { encoding: 'utf8' }).trim();
  if (importers) {
    console.log('  ✓ Mail importer is registered');
  } else {
    console.log('  ✗ Mail importer not found - this is the problem!');
    console.log('  Fix: mdimport -r /System/Library/Spotlight/Mail.mdimporter');
  }
} catch (err) {
  console.log('  Could not check Spotlight status');
}

// 7. Search for any Alexander Lourie files
console.log('\n7. Searching for Alexander Lourie in any format:');
try {
  // Search in any Mail directory
  const searches = [
    `grep -r -l "alexander.lourie" ~/Library/Mail 2>/dev/null | head -5`,
    `grep -r -l "bfkn.com" ~/Library/Mail 2>/dev/null | head -5`,
    `grep -r -l "Lourie" ~/Library/Mail 2>/dev/null | head -5`,
  ];
  
  let found = false;
  for (const search of searches) {
    try {
      const result = execSync(search, { 
        encoding: 'utf8', 
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 5000  // 5 second timeout
      }).trim();
      
      if (result) {
        console.log('  ✓ Found emails containing search terms:');
        result.split('\n').slice(0, 3).forEach(file => {
          console.log(`    ${file.substring(file.lastIndexOf('/') + 1)}`);
        });
        found = true;
        break;
      }
    } catch {}
  }
  
  if (!found) {
    console.log('  ✗ No files found containing Alexander Lourie');
  }
} catch {
  console.log('  Search timed out or failed');
}

console.log('\n' + '='.repeat(51));
console.log('RECOMMENDATIONS:');
console.log('='.repeat(51));

console.log('\n1. If Mail.app is not running, start it and run this script again');
console.log('\n2. Force re-register Mail importer:');
console.log('   sudo mdimport -r /System/Library/Spotlight/Mail.mdimporter');
console.log('\n3. Force reindex Mail directories found above:');
console.log('   mdimport -d1 ~/Library/Mail');
console.log('\n4. If emails are in Containers, try:');
console.log('   mdimport ~/Library/Containers/com.apple.mail');
console.log('\n5. Full system reindex (last resort):');
console.log('   sudo mdutil -E /');
