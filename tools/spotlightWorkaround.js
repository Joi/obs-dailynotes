#!/usr/bin/env node
/**
 * WORKAROUND: Use Spotlight text search results directly
 * Since Spotlight finds emails but not as "Mail Messages"
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function searchViaSpotlight(email, personName, limit = 20) {
  console.log(`Using Spotlight text search for ${personName || email}...`);
  
  const results = [];
  const searchTerms = [];
  
  // Build search terms
  if (email) {
    searchTerms.push(email);
    searchTerms.push(email.split('@')[0]); // username
    searchTerms.push(email.split('@')[1]); // domain
  }
  if (personName) {
    searchTerms.push(personName);
  }
  
  // Search with each term
  const foundFiles = new Set();
  
  for (const term of searchTerms) {
    try {
      console.log(`  Searching for "${term}"...`);
      const searchResult = execSync(`mdfind "${term}" 2>/dev/null | head -50`, { encoding: 'utf8' }).trim();
      
      if (searchResult) {
        const files = searchResult.split('\n').filter(Boolean);
        console.log(`    Found ${files.length} results`);
        
        // Process each result
        files.forEach(file => {
          if (!foundFiles.has(file)) {
            foundFiles.add(file);
            
            // Try to get metadata about the file
            try {
              // Get file info
              const stats = fs.statSync(file);
              const isFile = stats.isFile();
              
              if (isFile) {
                // Try to get Spotlight metadata
                const metadata = execSync(`mdls -name kMDItemDisplayName -name kMDItemContentCreationDate -name kMDItemTextContent "${file}" 2>/dev/null | head -20`, 
                  { encoding: 'utf8' }).trim();
                
                // Extract date if possible
                let date = null;
                const dateMatch = metadata.match(/kMDItemContentCreationDate\s+=\s+(.+)/);
                if (dateMatch && !dateMatch[1].includes('null')) {
                  const d = new Date(dateMatch[1].trim());
                  if (!isNaN(d)) date = d.toISOString();
                }
                
                // Build result object
                results.push({
                  filepath: file,
                  filename: path.basename(file),
                  directory: path.dirname(file).replace(process.env.HOME, '~'),
                  date: date,
                  searchTerm: term,
                  source: 'Spotlight'
                });
              }
            } catch {
              // Skip files we can't access
            }
          }
        });
      }
    } catch {
      // Continue with next search term
    }
  }
  
  // Sort by date if available
  results.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  
  return results.slice(0, limit);
}

function enrichFromSpotlight(personKey, email) {
  console.log('Enrichment Using Spotlight Results');
  console.log('=' + '='.repeat(50));
  
  const results = searchViaSpotlight(email, personKey, 30);
  
  if (results.length === 0) {
    console.log('\nNo results found via Spotlight');
    console.log('Falling back to Gmail API...');
    return null;
  }
  
  console.log(`\nFound ${results.length} Spotlight results:`);
  
  // Group by directory to understand where emails are
  const byDir = {};
  results.forEach(r => {
    byDir[r.directory] = (byDir[r.directory] || 0) + 1;
  });
  
  console.log('\nResults by location:');
  Object.entries(byDir).forEach(([dir, count]) => {
    console.log(`  ${dir}: ${count} files`);
  });
  
  // Create a simple summary
  const summary = {
    totalFound: results.length,
    dateRange: {
      oldest: results.filter(r => r.date).pop()?.date,
      newest: results.filter(r => r.date)[0]?.date
    },
    locations: Object.keys(byDir),
    sampleFiles: results.slice(0, 5).map(r => ({
      file: r.filename,
      date: r.date ? new Date(r.date).toISOString().slice(0, 10) : 'unknown'
    }))
  };
  
  return summary;
}

// Test with Alexander Lourie
console.log('Testing Spotlight-based search for Alexander Lourie\n');

const summary = enrichFromSpotlight('Alexander Lourie', 'alexander.lourie@bfkn.com');

if (summary) {
  console.log('\n' + '='.repeat(51));
  console.log('SUMMARY:');
  console.log('=' + '='.repeat(50));
  console.log(`Total items found: ${summary.totalFound}`);
  if (summary.dateRange.oldest) {
    console.log(`Date range: ${new Date(summary.dateRange.oldest).toISOString().slice(0, 10)} to ${new Date(summary.dateRange.newest).toISOString().slice(0, 10)}`);
  }
  console.log('\nSample files:');
  summary.sampleFiles.forEach(f => {
    console.log(`  ${f.date} - ${f.file}`);
  });
  
  console.log('\n✓ Spotlight search is working!');
  console.log('However, without .emlx files, full enrichment needs Gmail API.');
} else {
  console.log('\nSpotlight search found nothing.');
}

console.log('\n' + '='.repeat(51));
console.log('RECOMMENDATION:');
console.log('=' + '='.repeat(50));
console.log('\nUse Gmail API for reliable enrichment:');
console.log('  SKIP_LOCAL=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" \\');
console.log('    node tools/enrichFromLLM.js');

module.exports = { searchViaSpotlight, enrichFromSpotlight };
