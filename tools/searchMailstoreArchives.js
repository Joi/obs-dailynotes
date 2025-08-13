#!/usr/bin/env node
/**
 * Search MailStore ARCHIVES for Alexander Lourie's older emails
 * Fixed version with proper IMAP search criteria
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Imap = require('imap');
const { inspect } = require('util');
const { getMailstorePassword } = require('../lib/keychain');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

class ArchiveSearcher {
  constructor(config) {
    this.config = {
      host: config.host || process.env.MAILSTORE_HOST,
      port: config.port || 143,
      user: config.user || process.env.MAILSTORE_USER,
      password: config.password || getMailstorePassword({ account: (config.user || process.env.MAILSTORE_USER) }),
      tls: config.tls !== false,
      tlsOptions: { rejectUnauthorized: false },
      ...config
    };
    
    this.imap = new Imap(this.config);
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', resolve);
      this.imap.once('error', reject);
      this.imap.connect();
    });
  }
  
  disconnect() {
    this.imap.end();
  }
  
  searchFolder(folderPath, searchTerm, limit = 20) {
    return new Promise((resolve, reject) => {
      this.imap.openBox(folderPath, true, (err, box) => {
        if (err) {
          resolve([]); // Return empty array instead of rejecting
          return;
        }
        
        // Use TEXT search which searches all headers and body
        const criteria = [['TEXT', searchTerm]];
        
        this.imap.search(criteria, (err, uids) => {
          if (err || !uids || uids.length === 0) {
            resolve([]);
            return;
          }
          
          const fetchLimit = Math.min(uids.length, limit);
          // Get a sample from throughout the folder
          const step = Math.max(1, Math.floor(uids.length / fetchLimit));
          const selectedUids = [];
          for (let i = 0; i < uids.length && selectedUids.length < fetchLimit; i += step) {
            selectedUids.push(uids[i]);
          }
          
          const fetch = this.imap.fetch(selectedUids, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID CC)',
            struct: true
          });
          
          const messages = [];
          
          fetch.on('message', (msg, seqno) => {
            const message = { seqno, folder: folderPath };
            
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', chunk => buffer += chunk.toString('utf8'));
              stream.once('end', () => {
                const headers = Imap.parseHeader(buffer);
                message.from = headers.from ? headers.from[0] : '';
                message.to = headers.to ? headers.to[0] : '';
                message.cc = headers.cc ? headers.cc[0] : '';
                message.subject = headers.subject ? headers.subject[0] : '';
                message.date = headers.date ? headers.date[0] : '';
                
                // Check if Lourie is actually in this message
                const allText = `${message.from} ${message.to} ${message.cc} ${message.subject}`.toLowerCase();
                if (allText.includes('lourie') || allText.includes('alourie') || allText.includes('sandy')) {
                  messages.push(message);
                }
              });
            });
          });
          
          fetch.once('error', () => resolve([]));
          fetch.once('end', () => resolve(messages));
        });
      });
    });
  }
}

async function searchArchives() {
  console.log('Searching MailStore ARCHIVES for Alexander Lourie');
  console.log('=' + '='.repeat(60));
  
  // Search terms - one at a time for simplicity
  const searchTerms = [
    'lourie',           // Should catch all variations
    'alourie',          // Specific for older addresses
    'LOURIE'            // Sometimes case matters
  ];
  
  // Focus on the most promising archive folders first
  const archiveFolders = [
    // Older archives that likely have early emails
    '<Owner>/<Owner>@example.edu/archive/2002oldinbox',
    '<Owner>/<Owner>@example.edu/archive/m9911',        // 1999
    '<Owner>/<Owner>@example.edu/archive/m980130',      // 1998
    '<Owner>/<Owner>@example.edu/archive/m9807out',     // 1998 outbox
    '<Owner>/<Owner>@example.edu/archive/m96089702',    // 1996?
    
    // Early 2000s archives
    '<Owner>/<Owner>@example.edu/archive/19991121',
    '<Owner>/<Owner>@example.edu/archive/20021214',
    '<Owner>/<Owner>@example.edu/archive/20030305',
    '<Owner>/<Owner>@example.edu/archive/20030612',
    '<Owner>/<Owner>@example.edu/archive/20040111',
    '<Owner>/<Owner>@example.edu/archive/20050110',
    '<Owner>/<Owner>@example.edu/archive/20060826',
    '<Owner>/<Owner>@example.edu/archive/20070216',
    '<Owner>/<Owner>@example.edu/archive/20080119',
    '<Owner>/<Owner>@example.edu/archive/20090306',
    '<Owner>/<Owner>@example.edu/archive/20100116',
    '<Owner>/<Owner>@example.edu/archive/20110309',
    
    // Current folders for comparison
    'INBOX',
    '<Owner>/<Owner>@example.edu/Inbox'
  ];
  
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};
  
  const searcher = new ArchiveSearcher(config);
  
  try {
    console.log('Connecting to MailStore...');
    await searcher.connect();
    console.log('✓ Connected successfully!\n');
    
    const allResults = [];
    const folderResults = {};
    
    console.log(`Searching ${archiveFolders.length} folders...`);
    console.log('(Looking for emails with "lourie" or "alourie")\n');
    
    for (const folder of archiveFolders) {
      process.stdout.write(`  ${folder.padEnd(50, '.')}`);
      
      let folderMessages = [];
      
      // Try each search term
      for (const term of searchTerms) {
        try {
          const results = await searcher.searchFolder(folder, term, 20);
          if (results.length > 0) {
            folderMessages.push(...results);
          }
        } catch (searchErr) {
          // Silently continue if a search fails
        }
      }
      
      // Deduplicate by subject+date
      const unique = {};
      folderMessages.forEach(msg => {
        const key = `${msg.subject}_${msg.date}`;
        if (!unique[key]) unique[key] = msg;
      });
      folderMessages = Object.values(unique);
      
      if (folderMessages.length > 0) {
        folderResults[folder] = folderMessages;
        allResults.push(...folderMessages);
        console.log(` ✓ ${folderMessages.length} emails`);
      } else {
        console.log(' -');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    if (allResults.length === 0) {
      console.log('\nNo emails found. This might mean:');
      console.log('  1. The archives use a different email format');
      console.log('  2. The folders need different search criteria');
      console.log('  3. The emails are in different folders');
    } else {
      // Group by year
      const byYear = {};
      allResults.forEach(msg => {
        const year = new Date(msg.date).getFullYear();
        if (!isNaN(year) && year > 1990 && year < 2030) {
          if (!byYear[year]) byYear[year] = [];
          byYear[year].push(msg);
        }
      });
      
      console.log(`\nTotal emails found: ${allResults.length}`);
      
      console.log('\nEmails by year:');
      Object.keys(byYear).sort().forEach(year => {
        console.log(`  ${year}: ${byYear[year].length} emails`);
      });
      
      // Show oldest emails
      const sorted = allResults.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      console.log('\n3 OLDEST emails found:');
      sorted.slice(0, 3).forEach(msg => {
        console.log(`  ${msg.date}`);
        console.log(`    Subject: ${msg.subject}`);
        console.log(`    From: ${msg.from}`);
        console.log(`    To: ${msg.to}`);
        if (msg.cc) console.log(`    Cc: ${msg.cc}`);
        console.log(`    Folder: ${msg.folder}`);
        console.log();
      });
      
      console.log('3 NEWEST emails found:');
      sorted.slice(-3).reverse().forEach(msg => {
        console.log(`  ${msg.date}`);
        console.log(`    Subject: ${msg.subject}`);
        console.log(`    From: ${msg.from}`);
        console.log(`    To: ${msg.to}`);
        if (msg.cc) console.log(`    Cc: ${msg.cc}`);
        console.log(`    Folder: ${msg.folder}`);
        console.log();
      });
      
      // Save results
      const outputFile = path.join(__dirname, '..', 'data', 'people_cache', 'alexander-lourie-archive-search.json');
      fs.writeFileSync(outputFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        searchTerms,
        foldersSearched: archiveFolders.length,
        totalFound: allResults.length,
        byYear: Object.keys(byYear).sort(),
        results: allResults
      }, null, 2));
      
      console.log(`\n✓ Results saved to: ${outputFile}`);
    }
    
    searcher.disconnect();
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log(err.stack);
  }
}

searchArchives().catch(console.error);
