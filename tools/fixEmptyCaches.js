#!/usr/bin/env node
/**
 * Scan all people caches and refresh empty ones
 * This fixes the issue where failed attempts create empty caches
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { loadCache, hasValidGmailData, checkTokenValid } = require('./checkAndRefreshEmptyCache');

function getAllCacheFiles() {
  const cacheDir = path.join(__dirname, '..', 'data', 'people_cache');
  
  if (!fs.existsSync(cacheDir)) {
    console.error('Cache directory not found:', cacheDir);
    return [];
  }
  
  const files = fs.readdirSync(cacheDir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      filename: f,
      personKey: f.replace('.json', '').replace(/-/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }));
}

function findPersonFile(personKey) {
  const variations = [
    personKey,
    personKey.replace(/-/g, ' '),
    personKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  ];
  
  for (const variant of variations) {
    const file = path.join('/Users/<Owner>/switchboard', `${variant}.md`);
    if (fs.existsSync(file)) return file;
  }
  
  return null;
}

async function main() {
  console.log('=== Scanning for Empty Gmail Caches ===\n');
  
  // Check token first
  const tokenValid = checkTokenValid();
  if (!tokenValid) {
    console.error('✗ Gmail token is not valid. Run: npm run gmail:refresh');
    process.exit(1);
  }
  
  console.log('✓ Gmail token is valid\n');
  
  const cacheFiles = getAllCacheFiles();
  console.log(`Found ${cacheFiles.length} cache files to check\n`);
  
  const emptyOnes = [];
  const validOnes = [];
  const noPersonFile = [];
  
  // Scan all caches
  for (const { filename, personKey } of cacheFiles) {
    const cache = loadCache(personKey.replace(/ /g, '-').toLowerCase());
    const hasData = hasValidGmailData(cache);
    const personFile = findPersonFile(personKey);
    
    if (!personFile) {
      noPersonFile.push(personKey);
    } else if (!hasData) {
      emptyOnes.push({ personKey, personFile });
    } else {
      validOnes.push(personKey);
    }
  }
  
  // Report findings
  console.log('=== Summary ===');
  console.log(`✓ Valid caches: ${validOnes.length}`);
  console.log(`✗ Empty caches: ${emptyOnes.length}`);
  console.log(`? No person file: ${noPersonFile.length}`);
  
  if (emptyOnes.length === 0) {
    console.log('\n✓ All caches have valid data!');
    return;
  }
  
  // Show empty caches
  console.log('\n=== Empty Caches ===');
  for (const { personKey } of emptyOnes) {
    console.log(`  - ${personKey}`);
  }
  
  // Ask to fix
  const dryRun = process.argv.includes('--dry-run');
  const autoFix = process.argv.includes('--fix');
  
  if (dryRun) {
    console.log('\n[DRY RUN] Would refresh these caches. Use --fix to actually refresh.');
    return;
  }
  
  if (!autoFix) {
    console.log('\nUse --fix to refresh these empty caches');
    return;
  }
  
  // Fix empty caches
  console.log('\n=== Refreshing Empty Caches ===\n');
  
  let fixed = 0;
  let failed = 0;
  
  for (const { personKey, personFile } of emptyOnes) {
    console.log(`\nProcessing: ${personKey}`);
    
    const result = spawnSync('node', ['tools/enrichFromLLM.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        PERSON_FILE: personFile,
        PERSON_KEY: personKey,
        FORCE_REFETCH: '1',  // Force refetch even if cache exists
        SKIP_PREFETCH: '0'    // Allow prefetch to run
      }
    });
    
    if (result.status === 0) {
      // Check if it actually got data
      const newCache = loadCache(personKey.replace(/ /g, '-').toLowerCase());
      if (hasValidGmailData(newCache)) {
        console.log(`✓ Fixed ${personKey}`);
        fixed++;
      } else {
        console.log(`✗ Still empty after refresh: ${personKey}`);
        failed++;
      }
    } else {
      console.log(`✗ Failed to refresh: ${personKey}`);
      failed++;
    }
  }
  
  // Final report
  console.log('\n=== Final Report ===');
  console.log(`✓ Successfully fixed: ${fixed}`);
  console.log(`✗ Failed to fix: ${failed}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}
