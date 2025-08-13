#!/usr/bin/env node
/**
 * Updated Mail search that uses content-based queries instead of kMDItemKind
 * Since Spotlight UI finds emails but kMDItemKind doesn't work
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function searchMailContent(email, personName, limit = 20) {
  console.log(`Searching for ${email || personName} in Spotlight...`);
  
  const results = new Set();
  
  // Build search queries - use content search instead of Mail Message kind
  const queries = [];
  
  if (email) {
    queries.push(`mdfind "${email}"`);
    queries.push(`mdfind "${email.split('@')[0]}"`);  // Just username
    queries.push(`mdfind "${email.split('@')[1]}"`);  // Just domain
  }
  
  if (personName) {
    queries.push(`mdfind "${personName}"`);
    // Try individual parts of name
    personName.split(' ').forEach(part => {
      if (part.length > 2) {
        queries.push(`mdfind "${part}"`);
      }
    });
  }
  
  console.log(`  Trying ${queries.length} search patterns...`);
  
  // Execute queries
  for (const query of queries) {
    try {
      const cmd = `${query} 2>/dev/null | grep -E "\\.(emlx|eml|mbox)" | head -${limit * 2}`;
      const result = execSync(cmd, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'ignore']
      });
      
      const files = result.trim().split('\n').filter(Boolean);
      if (files.length > 0) {
        console.log(`  ✓ Found ${files.length} email files`);
        files.forEach(f => results.add(f));
      }
    } catch {
      // Continue to next query
    }
  }
  
  // If still no results, try broader search in Mail folder
  if (results.size === 0) {
    console.log('  Trying broad search in Mail folders...');
    try {
      const searchTerm = email ? email.split('@')[0] : personName.split(' ')[0];
      const broadSearch = execSync(
        `mdfind -onlyin ~/Library "${searchTerm}" 2>/dev/null | grep -i mail | grep -E "\\.(emlx|eml)" | head -${limit}`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      const files = broadSearch.trim().split('\n').filter(Boolean);
      if (files.length > 0) {
        console.log(`  ✓ Found ${files.length} files in Mail folders`);
        files.forEach(f => results.add(f));
      }
    } catch {}
  }
  
  console.log(`  Total unique files found: ${results.size}`);
  
  // Parse the email files
  const emails = [];
  for (const filepath of Array.from(results).slice(0, limit)) {
    try {
      // Try to get basic info from filename and path
      const filename = path.basename(filepath);
      const dirPath = path.dirname(filepath);
      
      // Try to get metadata
      let subject = '(no subject)';
      let from = '';
      let to = '';
      let date = null;
      
      try {
        const metadata = execSync(`mdls -name kMDItemSubject -name kMDItemAuthors -name kMDItemRecipients -name kMDItemContentCreationDate "${filepath}" 2>/dev/null`, 
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        
        subject = (metadata.match(/kMDItemSubject\s+=\s+"([^"]*)"/) || [,''])[1] || '(no subject)';
        from = (metadata.match(/kMDItemAuthors\s+=\s+\(([\s\S]*?)\)/) || [,''])[1] || '';
        to = (metadata.match(/kMDItemRecipients\s+=\s+\(([\s\S]*?)\)/) || [,''])[1] || '';
        const dateStr = (metadata.match(/kMDItemContentCreationDate\s+=\s+(.+)/) || [,''])[1];
        
        if (dateStr && dateStr !== '(null)') {
          const d = new Date(dateStr.trim());
          if (!isNaN(d)) {
            date = d.toISOString();
          }
        }
      } catch {
        // If mdls fails, try to extract from file content
        try {
          const content = execSync(`strings "${filepath}" 2>/dev/null | head -50`, 
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
          
          // Try to find subject
          const subjectMatch = content.match(/Subject:\s*(.+)/i);
          if (subjectMatch) subject = subjectMatch[1].trim();
          
          // Try to find from
          const fromMatch = content.match(/From:\s*(.+)/i);
          if (fromMatch) from = fromMatch[1].trim();
          
          // Try to find date
          const dateMatch = content.match(/Date:\s*(.+)/i);
          if (dateMatch) {
            const d = new Date(dateMatch[1]);
            if (!isNaN(d)) date = d.toISOString();
          }
        } catch {}
      }
      
      emails.push({
        filepath,
        subject,
        from: from.replace(/[\n\s"]+/g, ' ').trim(),
        to: to.replace(/[\n\s"]+/g, ' ').trim(),
        date,
        source: 'Mail.app'
      });
    } catch {
      // Skip files we can't parse
    }
  }
  
  // Sort by date
  emails.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  
  return emails;
}

// Test it
if (require.main === module) {
  console.log('Testing updated Mail search with content-based queries\n');
  console.log('=' + '='.repeat(50));
  
  const results = searchMailContent('alexander.lourie@bfkn.com', 'Alexander Lourie', 20);
  
  if (results.length > 0) {
    console.log(`\n✅ Found ${results.length} emails!`);
    console.log('\nRecent emails:');
    results.slice(0, 5).forEach(email => {
      const date = email.date ? new Date(email.date).toISOString().slice(0, 10) : 'Unknown';
      console.log(`  ${date} - ${email.subject}`);
      if (email.from) console.log(`    From: ${email.from}`);
    });
  } else {
    console.log('\n⚠️  No emails found yet');
    console.log('Since Spotlight UI shows results, indexing might still be in progress.');
    console.log('Wait a few minutes and try again.');
  }
}

module.exports = { searchMailApp: searchMailContent };
