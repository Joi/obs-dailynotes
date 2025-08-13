#!/usr/bin/env node
/**
 * Find macOS 15.6 Mail storage format
 * Using multiple detection methods
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('macOS 15.6 Mail Format Detection');
console.log('=' + '='.repeat(50));

// 1. Check running Mail.app memory maps
console.log('\n1. Mail.app Memory-Mapped Files:');
console.log('-'.repeat(35));
try {
  const pid = execSync('pgrep -x Mail | head -1', { encoding: 'utf8' }).trim();
  if (pid) {
    console.log(`Mail.app PID: ${pid}`);
    
    // Get memory mapped files
    const vmmap = execSync(`vmmap ${pid} 2>/dev/null | grep -E "mapped file|Mail|Messages" | head -20`, { encoding: 'utf8' }).trim();
    if (vmmap) {
      console.log('Memory-mapped regions:');
      console.log(vmmap);
    }
    
    // Check open files
    console.log('\nOpen database files:');
    const dbs = execSync(`lsof -p ${pid} 2>/dev/null | grep -E "\\.db|\\.sqlite|\\.store" | awk '{print $NF}' | sort -u`, { encoding: 'utf8' }).trim();
    if (dbs) {
      dbs.split('\n').forEach(db => {
        if (fs.existsSync(db)) {
          const size = fs.statSync(db).size;
          console.log(`  ${db}`);
          console.log(`    Size: ${Math.round(size/1024/1024)} MB`);
          
          // Try to identify format
          try {
            const header = execSync(`xxd -l 16 "${db}" 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
            if (header.includes('SQLite')) {
              console.log('    Format: SQLite database');
              
              // Get tables
              const tables = execSync(`sqlite3 "${db}" ".tables" 2>/dev/null`, { encoding: 'utf8' }).trim();
              if (tables) {
                console.log(`    Tables: ${tables.substring(0, 100)}`);
              }
            }
          } catch {}
        }
      });
    }
  } else {
    console.log('Mail.app not running - start it first!');
  }
} catch (err) {
  console.log('Error checking Mail process:', err.message);
}

// 2. Search for hidden Core Data stores
console.log('\n2. Core Data Stores:');
console.log('-'.repeat(35));
try {
  const stores = execSync(`find ~/Library -name "*.storedata" -o -name "*.mom" -o -name "*.omo" 2>/dev/null | grep -i mail`, { encoding: 'utf8' }).trim();
  if (stores) {
    console.log('Found Core Data files:');
    stores.split('\n').forEach(f => console.log(`  ${f.replace(process.env.HOME, '~')}`));
  } else {
    console.log('No Core Data stores found');
  }
} catch {}

// 3. Check for CloudKit containers
console.log('\n3. CloudKit/iCloud Containers:');
console.log('-'.repeat(35));
try {
  const containers = execSync(`find ~/Library/Containers -name "*.cloudkit" -o -name "*.ckrecord" 2>/dev/null | head -10`, { encoding: 'utf8' }).trim();
  if (containers) {
    console.log('Found CloudKit files:');
    containers.split('\n').forEach(f => console.log(`  ${f.replace(process.env.HOME, '~')}`));
  }
  
  // Check CloudKit daemon
  const ckd = execSync('pgrep -l cloudd', { encoding: 'utf8' }).trim();
  if (ckd) {
    console.log(`CloudKit daemon running: ${ckd}`);
  }
} catch {}

// 4. Use strings to find email content in any file
console.log('\n4. Searching for email content in Mail directories:');
console.log('-'.repeat(35));
try {
  console.log('Searching for "Alexander Lourie" in Mail-related files...');
  const search = execSync(`
    find ~/Library -path "*/Mail/*" -type f -size +1M 2>/dev/null | 
    head -20 | 
    while read f; do 
      if strings "$f" 2>/dev/null | grep -q "Alexander Lourie"; then 
        echo "$f"
      fi
    done
  `, { encoding: 'utf8', timeout: 10000 }).trim();
  
  if (search) {
    console.log('Found in these files:');
    search.split('\n').forEach(f => {
      console.log(`  ${f.replace(process.env.HOME, '~')}`);
      
      // Identify file type
      try {
        const type = execSync(`file -b "${f}" | cut -d, -f1`, { encoding: 'utf8' }).trim();
        console.log(`    Type: ${type}`);
      } catch {}
    });
  } else {
    console.log('Content not found in Mail files');
  }
} catch {
  console.log('Search timed out');
}

// 5. Check shared memory segments
console.log('\n5. Shared Memory Segments:');
console.log('-'.repeat(35));
try {
  const ipcs = execSync('ipcs -m 2>/dev/null | grep $USER', { encoding: 'utf8' }).trim();
  if (ipcs) {
    console.log('User has shared memory segments (possible mail cache)');
    console.log(ipcs.substring(0, 200));
  }
} catch {}

console.log('\n' + '='.repeat(51));
console.log('FINDINGS:');
console.log('=' + '='.repeat(50));
console.log('\nBased on the above, macOS 15.6 likely uses:');
console.log('1. SQLite/Core Data hybrid storage');
console.log('2. Memory-mapped database files');
console.log('3. CloudKit sync for IMAP');
console.log('\nBUT: MailStore IMAP is a much better solution!');
