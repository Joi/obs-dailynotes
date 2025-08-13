#!/usr/bin/env node
/**
 * Simple Mail search using what we know works: text search
 * Then filter for Mail-related files
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function simpleMailSearch(searchTerm) {
  console.log(`Searching for "${searchTerm}"...`);
  
  try {
    // Use the search that we know works
    const results = execSync(`mdfind "${searchTerm}" 2>/dev/null`, { 
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 
    }).trim();
    
    if (!results) {
      console.log('No results from mdfind');
      return [];
    }
    
    const allFiles = results.split('\n').filter(Boolean);
    console.log(`Found ${allFiles.length} total results from mdfind`);
    
    // Filter for Mail-related files
    const mailFiles = allFiles.filter(file => {
      // Check if it's in a Mail directory
      if (file.includes('/Library/Mail/') || 
          file.includes('/Mail/') ||
          file.includes('.emlx') ||
          file.includes('.eml') ||
          file.includes('.mbox')) {
        return true;
      }
      
      // Check if it's a Spotlight cache file for Mail
      if (file.includes('/.Spotlight-V100/') && file.includes('Mail')) {
        return false; // Skip cache files
      }
      
      // Check file extension
      const ext = path.extname(file).toLowerCase();
      if (ext === '.emlx' || ext === '.eml' || ext === '.mbox') {
        return true;
      }
      
      return false;
    });
    
    console.log(`Filtered to ${mailFiles.length} Mail-related files`);
    
    // Parse email metadata from the files
    const emails = [];
    for (const filepath of mailFiles.slice(0, 20)) {
      try {
        // Try to extract basic info
        const filename = path.basename(filepath);
        let subject = '(no subject)';
        let from = '';
        let date = null;
        
        // Try mdls first
        try {
          const metadata = execSync(`mdls -name kMDItemSubject -name kMDItemAuthors -name kMDItemContentCreationDate "${filepath}" 2>/dev/null`, 
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
          
          const subjectMatch = metadata.match(/kMDItemSubject\s+=\s+"([^"]+)"/);
          if (subjectMatch) subject = subjectMatch[1];
          
          const authorsMatch = metadata.match(/kMDItemAuthors\s+=\s+\(([\s\S]*?)\)/);
          if (authorsMatch) {
            from = authorsMatch[1].replace(/["\s\n]+/g, ' ').trim();
          }
          
          const dateMatch = metadata.match(/kMDItemContentCreationDate\s+=\s+(.+)/);
          if (dateMatch && !dateMatch[1].includes('null')) {
            const d = new Date(dateMatch[1].trim());
            if (!isNaN(d)) date = d.toISOString();
          }
        } catch {}
        
        // If mdls didn't work, try reading the file
        if (subject === '(no subject)' && filepath.endsWith('.emlx')) {
          try {
            const content = execSync(`strings "${filepath}" 2>/dev/null | head -100`, 
              { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            
            const subjectLine = content.match(/Subject:\s*(.+)/i);
            if (subjectLine) subject = subjectLine[1].trim();
            
            const fromLine = content.match(/From:\s*(.+)/i);
            if (fromLine) from = fromLine[1].trim();
            
            const dateLine = content.match(/Date:\s*(.+)/i);
            if (dateLine) {
              const d = new Date(dateLine[1]);
              if (!isNaN(d)) date = d.toISOString();
            }
          } catch {}
        }
        
        emails.push({
          filepath: filepath.replace(process.env.HOME, '~'),
          subject,
          from,
          date,
          source: 'Mail.app'
        });
      } catch {
        // Skip files we can't process
      }
    }
    
    return emails;
    
  } catch (err) {
    console.log('Error:', err.message);
    return [];
  }
}

// Run the search
console.log('Simple Mail Search Test');
console.log('=' + '='.repeat(50) + '\n');

// Try different search terms
const searches = [
  'Alexander Lourie',
  'bfkn.com',
  'JEREMY HECKMAN'  // We saw this in the screenshot
];

let foundAny = false;

for (const term of searches) {
  console.log(`\nSearching for: ${term}`);
  console.log('-'.repeat(40));
  
  const results = simpleMailSearch(term);
  
  if (results.length > 0) {
    foundAny = true;
    console.log(`\n✅ Found ${results.length} emails!`);
    
    // Show first few
    console.log('\nSample results:');
    results.slice(0, 5).forEach((email, i) => {
      const date = email.date ? new Date(email.date).toISOString().slice(0, 10) : 'Unknown';
      console.log(`  ${i+1}. ${date} - ${email.subject}`);
      if (email.from) console.log(`     From: ${email.from}`);
      console.log(`     File: ${email.filepath.substring(email.filepath.lastIndexOf('/') + 1)}`);
    });
    
    break; // Found results, stop searching
  }
}

if (!foundAny) {
  console.log('\n⚠️  No Mail files found in search results');
  console.log('\nThis could mean:');
  console.log('1. Spotlight is indexing content but not yet associating it with files');
  console.log('2. Mail files are in a different location');
  console.log('3. Files are indexed under different metadata');
  console.log('\nTry running this to see what files contain the search term:');
  console.log('  mdfind "Alexander Lourie" | head -20');
  console.log('\nThen check if any are Mail files with:');
  console.log('  mdfind "Alexander Lourie" | xargs -I {} file "{}" | grep -i mail');
} else {
  console.log('\n' + '='.repeat(51));
  console.log('SUCCESS! Local Mail search is working!');
  console.log('=' + '='.repeat(51));
  console.log('\nYou can now run the enrichment with local search:');
  console.log('PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js');
}
