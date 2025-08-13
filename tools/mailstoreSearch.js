#!/usr/bin/env node
/**
 * Connect to MailStore IMAP server for email search
 * This is a MUCH better solution than fighting with Apple's format!
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// First, let's install imap package if needed
try {
  require.resolve('imap');
} catch {
  console.log('Installing imap package...');
  execSync('npm install imap', { cwd: '/Users/joi/obs-dailynotes', stdio: 'inherit' });
}

const Imap = require('imap');
const { inspect } = require('util');
const { getMailstorePassword } = require('../lib/keychain');

class MailStoreSearch {
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
  
  searchPerson(email, name, limit = 20) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      // For MailStore, search in multiple folders
      const foldersToSearch = [
        'INBOX',
        'joi/joi@media.mit.edu/Inbox',
        'joi/joiito@gmail.com/Inbox',
        'joi/ji@media.mit.edu/Inbox',
        'joi/joi@ito.com/Inbox',
        'joi/jito@neoteny.com/Inbox',
        'joi/joi@kula.jp/Inbox'
      ];
      
      let searchedFolders = 0;
      let allResults = [];
      
      const searchFolder = (folderName) => {
        this.imap.openBox(folderName, true, (err, box) => {
          if (err) {
            console.log(`  Skipping ${folderName}: ${err.message}`);
            searchedFolders++;
            if (searchedFolders === foldersToSearch.length) {
              resolve(allResults);
            }
            return;
          }
          
          console.log(`  Searching in ${folderName}...`);
          
          // Build search criteria
          const criteria = [];
          if (email) {
            criteria.push(['OR', ['FROM', email], ['TO', email]]);
          } else if (name) {
            criteria.push(['TEXT', name]);
          }
          
          // Search
          this.imap.search(criteria, (err, uids) => {
            if (err) {
              console.log(`    Search error in ${folderName}: ${err.message}`);
              searchedFolders++;
              if (searchedFolders === foldersToSearch.length) {
                resolve(allResults);
              }
              return;
            }
            
            if (!uids || uids.length === 0) {
              console.log(`    No results in ${folderName}`);
              searchedFolders++;
              if (searchedFolders === foldersToSearch.length) {
                resolve(allResults);
              }
              return;
            }
            
            console.log(`    Found ${uids.length} messages in ${folderName}`);
            
            // Fetch message headers
            const fetch = this.imap.fetch(uids.slice(-limit), {
              bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
              struct: true
            });
            
            const folderResults = [];
            
            fetch.on('message', (msg, seqno) => {
              const message = { seqno, folder: folderName };
              
              msg.on('body', (stream, info) => {
                let buffer = '';
                stream.on('data', chunk => buffer += chunk.toString('utf8'));
                stream.once('end', () => {
                  const headers = Imap.parseHeader(buffer);
                  message.from = headers.from ? headers.from[0] : '';
                  message.to = headers.to ? headers.to[0] : '';
                  message.subject = headers.subject ? headers.subject[0] : '';
                  message.date = headers.date ? headers.date[0] : '';
                  folderResults.push(message);
                });
              });
            });
            
            fetch.once('error', (err) => {
              console.log(`    Fetch error: ${err.message}`);
              searchedFolders++;
              if (searchedFolders === foldersToSearch.length) {
                resolve(allResults);
              }
            });
            
            fetch.once('end', () => {
              allResults = allResults.concat(folderResults);
              searchedFolders++;
              if (searchedFolders === foldersToSearch.length) {
                // Sort by date and return limited results
                allResults.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(allResults.slice(0, limit));
              }
            });
          });
        });
      };
      
      // Start searching all folders
      foldersToSearch.forEach(folder => searchFolder(folder));
    });
  }
  
  async listFolders() {
    return new Promise((resolve, reject) => {
      this.imap.getBoxes((err, boxes) => {
        if (err) {
          reject(err);
        } else {
          resolve(boxes);
        }
      });
    });
  }
}

// Configuration helper
function setupMailStore() {
  console.log('MailStore IMAP Setup');
  console.log('=' + '='.repeat(50));
  console.log();
  
  // Check for existing config
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  
  if (fs.existsSync(configPath)) {
    console.log('✓ MailStore config found');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  
  console.log('MailStore IMAP configuration needed.');
  console.log();
  console.log('Create config/mailstore.json with:');
  console.log(JSON.stringify({
    host: "your-mailstore-server.com",
    port: 143,
    user: "your-username",
    password: "your-password",
    tls: true
  }, null, 2));
  console.log();
  console.log('Or set environment variables:');
  console.log('  export MAILSTORE_HOST="your-server.com"');
  console.log('  export MAILSTORE_USER="username"');
  console.log('  # Password is read from macOS Keychain (preferred). Fallback: MAILSTORE_PASSWORD');
  console.log('  # To set Keychain item:');
  console.log('  # security add-generic-password -a "username" -s "obs-dailynotes.mailstore" -w "<password>" -U');
  console.log();
  
  return null;
}

// Test connection
async function testMailStore() {
  console.log('Testing MailStore IMAP Connection');
  console.log('=' + '='.repeat(50));
  console.log();
  
  const config = setupMailStore();
  if (!config && !process.env.MAILSTORE_HOST) {
    console.log('❌ No configuration found');
    console.log();
    console.log('MailStore is a GREAT solution for email archiving!');
    console.log('It provides reliable IMAP access to all your archived emails.');
    console.log();
    console.log('Benefits over local Mail.app:');
    console.log('  • Standard IMAP protocol (not proprietary)');
    console.log('  • Full-text search capabilities');
    console.log('  • All emails in one place');
    console.log('  • Works with any IMAP client/library');
    return;
  }
  
  const client = new MailStoreSearch(config || {});
  
  try {
    console.log('Connecting to MailStore...');
    await client.connect();
    console.log('✓ Connected successfully!');
    
    // List folders
    console.log('\nAvailable folders:');
    const folders = await client.listFolders();
    function printFolders(obj, indent = '  ') {
      for (const [name, value] of Object.entries(obj)) {
        console.log(indent + name);
        if (value.children) {
          printFolders(value.children, indent + '  ');
        }
      }
    }
    printFolders(folders);
    
    // Test search
    console.log('\nTesting search for Alexander Lourie...');
    const results = await client.searchPerson('alexander.lourie@bfkn.com', 'Alexander Lourie');
    
    if (results.length > 0) {
      console.log(`✓ Found ${results.length} emails!`);
      console.log('\nSample results:');
      results.slice(0, 5).forEach(msg => {
        console.log(`  ${msg.date} - ${msg.subject}`);
        console.log(`    From: ${msg.from}`);
      });
    } else {
      console.log('No results found (might need to check folder names)');
    }
    
    client.disconnect();
    console.log('\n✓ MailStore IMAP is working perfectly!');
    console.log('This is a much better solution than local Mail.app');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log();
    console.log('Common issues:');
    console.log('  • Check host/port/credentials');
    console.log('  • Ensure MailStore IMAP service is enabled');
    console.log('  • Check firewall/network access');
  }
}

// Export for use in enrichment
module.exports = { MailStoreSearch, setupMailStore };

// Run test if called directly
if (require.main === module) {
  testMailStore().catch(console.error);
}
