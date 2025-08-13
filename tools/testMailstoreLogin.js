#!/usr/bin/env node
/**
 * MailStore-specific IMAP connection test
 */
const Imap = require('imap');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { getMailstorePassword } = require('../lib/keychain');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testMailStoreLogin() {
  console.log('MailStore Login Test');
  console.log('=' + '='.repeat(50));
  
  const host = process.env.MAILSTORE_HOST || '172.27.1.64';
  // We'll resolve the password per username candidate below to allow different Keychain accounts
  
  // Try different username formats
  const usernames = Array.from(new Set([
    process.env.MAILSTORE_USER || '<Owner>',
    '<Owner>',
    '<Owner>@<Owner>-11-nas-2',
    '<Owner>-11-nas-2\\<Owner>',
    'mailstore',
    'admin',
    '<Owner>@localhost',
    '<Owner>',
  ]));
  
  console.log(`\nServer: ${host}:993 (SSL/TLS)`);
  console.log('Testing different username formats...\n');
  
  for (const user of usernames) {
    console.log(`Testing username: ${user}`);
    
    // Resolve password for this candidate from Keychain (fallback to env)
    const password = getMailstorePassword({ account: user });
    if (!password) {
      console.log('  Skipping (no password found for this account in Keychain/.env)');
      continue;
    }

    const config = {
      host,
      port: 993,
      user,
      password,
      tls: true,
      tlsOptions: { 
        rejectUnauthorized: false,
        servername: host  // Add servername for TLS
      }
    };
    
    const success = await new Promise((resolve) => {
      const imap = new Imap(config);
      
      const timeout = setTimeout(() => {
        try { imap.end(); } catch {}
        resolve(false);
      }, 10000);
      
      imap.once('ready', () => {
        clearTimeout(timeout);
        console.log(`✅ SUCCESS with username: ${user}`);
        
        // List mailboxes to verify full access
        imap.getBoxes((err, boxes) => {
          if (!err && boxes) {
            console.log('Available mailboxes:', Object.keys(boxes).slice(0, 5).join(', '));
          }
          imap.end();
        });
        
        resolve(true);
      });
      
      imap.once('error', (err) => {
        clearTimeout(timeout);
        console.log(`❌ Failed: ${err.message}`);
        resolve(false);
      });
      
      imap.connect();
    });
    
    if (success) {
      console.log('\n' + '='.repeat(51));
      console.log('✅ WORKING USERNAME FOUND!');
      console.log('=' + '='.repeat(50));
      console.log(`\nUpdate your .env file:`);
      console.log(`MAILSTORE_USER=${user}`);
      
      // Save working config
      const config = {
        host,
        port: 993,
        user,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
      
      const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('\n✅ Config saved to config/mailstore.json');
      break;
    }
  }
}

testMailStoreLogin().catch(console.error);
