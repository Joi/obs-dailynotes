#!/usr/bin/env node
/**
 * Debug what mdfind is actually finding for Alexander Lourie
 */
const { execSync } = require('child_process');
const path = require('path');

console.log('Investigating Alexander Lourie search results');
console.log('=' + '='.repeat(50));

// Step 1: Get the raw results
console.log('\n1. Raw mdfind results for "Alexander Lourie":');
console.log('-'.repeat(40));
try {
  const rawResults = execSync(`mdfind "Alexander Lourie" 2>/dev/null | head -30`, { encoding: 'utf8' }).trim();
  
  if (rawResults) {
    const files = rawResults.split('\n').filter(Boolean);
    console.log(`Found ${files.length} results:`);
    
    files.forEach((file, i) => {
      // Show full path for first 5
      if (i < 5) {
        console.log(`  ${i+1}. ${file}`);
        
        // Check file type
        try {
          const ext = path.extname(file);
          const isInMail = file.includes('/Mail/') || file.includes('/Library/Mail');
          const isEmlx = ext === '.emlx' || file.includes('.emlx');
          
          if (isInMail) console.log(`     ✓ In Mail folder`);
          if (isEmlx) console.log(`     ✓ Is .emlx file`);
          if (!isInMail && !isEmlx) {
            // Try to identify what it is
            const fileType = execSync(`file -b "${file}" 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
            console.log(`     Type: ${fileType.substring(0, 50)}`);
          }
        } catch {}
      }
    });
    
    // Analyze all results
    console.log('\nAnalysis of all results:');
    const mailFiles = files.filter(f => f.includes('/Mail/') || f.includes('Library/Mail'));
    const emlxFiles = files.filter(f => f.includes('.emlx'));
    const otherFiles = files.filter(f => !f.includes('/Mail/') && !f.includes('.emlx'));
    
    console.log(`  In Mail folders: ${mailFiles.length}`);
    console.log(`  .emlx files: ${emlxFiles.length}`);  
    console.log(`  Other files: ${otherFiles.length}`);
    
    if (mailFiles.length > 0) {
      console.log('\n  Sample Mail file paths:');
      mailFiles.slice(0, 3).forEach(f => {
        const shortPath = f.replace(process.env.HOME, '~');
        console.log(`    ${shortPath}`);
      });
    }
  } else {
    console.log('No results found');
  }
} catch (err) {
  console.log('Error:', err.message);
}

// Step 2: Try searching with different approaches
console.log('\n2. Alternative search approaches:');
console.log('-'.repeat(40));

const searches = [
  { 
    desc: 'In Mail folders only', 
    cmd: `mdfind -onlyin ~/Library/Mail "Alexander Lourie" 2>/dev/null | head -10` 
  },
  { 
    desc: 'BFKN domain', 
    cmd: `mdfind "bfkn.com" 2>/dev/null | head -10` 
  },
  { 
    desc: 'Just "Lourie"', 
    cmd: `mdfind "Lourie" 2>/dev/null | grep -i mail | head -10` 
  },
  {
    desc: 'Content contains alexander AND lourie',
    cmd: `mdfind "kMDItemTextContent == '*alexander*' && kMDItemTextContent == '*lourie*'" 2>/dev/null | head -10`
  }
];

for (const {desc, cmd} of searches) {
  try {
    console.log(`\n${desc}:`);
    const result = execSync(cmd, { encoding: 'utf8' }).trim();
    
    if (result) {
      const files = result.split('\n').filter(Boolean);
      console.log(`  Found ${files.length} results`);
      
      // Show first result with details
      if (files[0]) {
        const shortPath = files[0].replace(process.env.HOME, '~');
        console.log(`  First: ${shortPath}`);
        
        // If it's an emlx file, try to get its content
        if (files[0].includes('.emlx')) {
          try {
            const preview = execSync(`head -20 "${files[0]}" 2>/dev/null | strings | grep -E "From:|Subject:|Date:" | head -3`, { encoding: 'utf8' }).trim();
            if (preview) {
              console.log(`  Preview:`);
              preview.split('\n').forEach(line => console.log(`    ${line}`));
            }
          } catch {}
        }
      }
    } else {
      console.log(`  No results`);
    }
  } catch {
    console.log(`  Error running search`);
  }
}

// Step 3: Direct file system check
console.log('\n3. Direct file system check:');
console.log('-'.repeat(40));
try {
  const emlxCount = execSync(`find ~/Library/Mail -name "*.emlx" 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
  console.log(`  .emlx files in Mail folder: ${emlxCount}`);
  
  if (parseInt(emlxCount) > 0) {
    // Search for Alexander in actual files
    console.log('\n  Searching for "Alexander" in .emlx files (this may take a moment)...');
    const grepResult = execSync(
      `find ~/Library/Mail -name "*.emlx" -type f 2>/dev/null | head -100 | xargs grep -l -i "alexander.lourie\\|bfkn" 2>/dev/null | head -5`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    
    if (grepResult) {
      const files = grepResult.split('\n').filter(Boolean);
      console.log(`  ✓ Found ${files.length} .emlx files containing Alexander/BFKN`);
      files.forEach(f => {
        const shortPath = f.replace(process.env.HOME, '~');
        console.log(`    ${shortPath.substring(shortPath.lastIndexOf('/') + 1)}`);
      });
    } else {
      console.log(`  No .emlx files found containing Alexander/BFKN`);
    }
  }
} catch (err) {
  console.log(`  File system search failed or timed out`);
}

console.log('\n' + '='.repeat(51));
console.log('RECOMMENDATIONS:');
console.log('='.repeat(51));
console.log('\nBased on the results above:');
console.log('1. If Mail files were found → Update searchMailApp.js to handle the paths');
console.log('2. If no Mail files found → Indexing might index content but not files yet');
console.log('3. Try running: mdfind -0 "Alexander Lourie" | xargs -0 ls -la');
console.log('   to see what types of files are being found');
