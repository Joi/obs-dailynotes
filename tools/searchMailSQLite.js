#!/usr/bin/env node
/**
 * Alternative: Search Mail.app's SQLite database directly
 * Bypasses Spotlight completely
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findMailDatabases() {
  console.log('Finding Mail.app SQLite databases...');
  try {
    // Look for Mail's envelope index (contains message metadata)
    const dbs = execSync(`find ~/Library -path "*/Mail/*" -name "*.sqlite*" -size +100k 2>/dev/null | grep -i envelope || find ~/Library/Mail -name "*.sqlite*" -size +100k 2>/dev/null`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim().split('\n').filter(Boolean);
    
    if (dbs.length > 0) {
      console.log(`Found ${dbs.length} Mail database(s):`);
      dbs.forEach(db => {
        const size = execSync(`ls -lh "${db}" | awk '{print $5}'`, { encoding: 'utf8' }).trim();
        console.log(`  ${db} (${size})`);
      });
      return dbs;
    }
  } catch {}
  
  return [];
}

function searchMailSQLite(searchTerm, dbPath) {
  console.log(`\nSearching for "${searchTerm}" in Mail database...`);
  
  try {
    // First, check what tables exist
    const tables = execSync(`sqlite3 "${dbPath}" ".tables" 2>/dev/null`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    console.log('Database tables:', tables.substring(0, 200));
    
    // Common Mail.app table names
    const queries = [
      // Try messages table
      `SELECT COUNT(*) FROM messages WHERE subject LIKE '%${searchTerm}%' OR sender LIKE '%${searchTerm}%';`,
      // Try searchable_messages
      `SELECT COUNT(*) FROM searchable_messages WHERE contents MATCH '${searchTerm}';`,
      // Try envelope index
      `SELECT COUNT(*) FROM subjects WHERE subject LIKE '%${searchTerm}%';`,
      `SELECT COUNT(*) FROM addresses WHERE address LIKE '%${searchTerm}%' OR comment LIKE '%${searchTerm}%';`,
    ];
    
    for (const query of queries) {
      try {
        const result = execSync(`sqlite3 "${dbPath}" "${query}" 2>/dev/null`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        
        if (result && parseInt(result) > 0) {
          console.log(`✓ Found ${result} matches in database`);
          
          // Try to get sample results
          const sampleQuery = query.replace('COUNT(*)', 'subject, date_sent, sender').replace(';', ' LIMIT 5;');
          try {
            const samples = execSync(`sqlite3 -header -column "${dbPath}" "${sampleQuery}" 2>/dev/null`, {
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            
            if (samples) {
              console.log('\nSample results:');
              console.log(samples);
            }
          } catch {}
          
          return true;
        }
      } catch {}
    }
    
  } catch (err) {
    console.log('Error searching database:', err.message);
  }
  
  return false;
}

// Main execution
console.log('Mail.app SQLite Direct Search');
console.log('=' + '='.repeat(50));
console.log('This bypasses Spotlight and searches Mail\'s database directly\n');

const dbs = findMailDatabases();

if (dbs.length === 0) {
  console.log('\n⚠️  No Mail databases found!');
  console.log('Mail.app might be using a different storage format.');
} else {
  // Search for Alexander Lourie
  const searchTerms = ['bfkn.com', 'Lourie', 'alexander.lourie'];
  let found = false;
  
  for (const db of dbs) {
    for (const term of searchTerms) {
      if (searchMailSQLite(term, db)) {
        found = true;
        console.log(`\n✓ Found emails for "${term}" in ${path.basename(db)}`);
        break;
      }
    }
    if (found) break;
  }
  
  if (!found) {
    console.log('\n✗ No matches found in Mail databases');
    console.log('The emails might be stored in a different format');
  }
}

console.log('\n' + '='.repeat(51));
console.log('RECOMMENDATION: Fix Spotlight Instead');
console.log('=' + '='.repeat(50));
console.log('\nWhile direct SQLite search is possible, fixing Spotlight is better.');
console.log('Run: node tools/fixMailSpotlight.js');
console.log('for instructions on fixing Spotlight indexing.');
