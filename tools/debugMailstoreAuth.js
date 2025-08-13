#!/usr/bin/env node
/**
 * Debug MailStore IMAP authentication methods
 */
const Imap = require('imap');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { getMailstorePassword } = require('../lib/keychain');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testAuth(name, config) {
  console.log(`\nTesting: ${name}`);
  console.log('Config:', JSON.stringify({...config, password: '***'}, null, 2));
  
  return new Promise((resolve) => {
    const imap = new Imap(config);
    let capabilities = null;
    
    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout');
      try { imap.end(); } catch {}
      resolve(false);
    }, 10000);
    
    imap.once('ready', () => {
      clearTimeout(timeout);
      console.log('✅ Authentication successful!');
      console.log('Capabilities:', imap._caps);
      imap.end();
      resolve(true);
    });
    
    imap.once('error', (err) => {
      clearTimeout(timeout);
      console.log('❌ Error:', err.message);
      if (err.textCode) console.log('   Text code:', err.textCode);
      if (err.source === 'authentication') {
        console.log('   This is an authentication error');
      }
      resolve(false);
    });
    
    imap.connect();
  });
}

async function main() {
  console.log('MailStore Authentication Debugger');
  console.log('=' + '='.repeat(50));
  
  const host = process.env.MAILSTORE_HOST || '172.27.1.64';
  const user = process.env.MAILSTORE_USER || '<Owner>';
  const password = getMailstorePassword({ account: process.env.MAILSTORE_USER || '<Owner>' });
  
  if (!password) {
    console.log('❌ MailStore password not found in Keychain or .env');
    process.exit(1);
  }
  
  console.log(`\nServer: ${host}`);
  console.log(`User: ${user}`);
  
  const configs = [
    {
      name: 'Port 993 SSL/TLS with authMethod PLAIN',
      config: {
        host,
        port: 993,
        user,
        password,
        tls: true,
        authMethod: 'PLAIN',
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 993 SSL/TLS with authMethod LOGIN',
      config: {
        host,
        port: 993,
        user,
        password,
        tls: true,
        authMethod: 'LOGIN',
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 993 SSL/TLS with xoauth2',
      config: {
        host,
        port: 993,
        user,
        password,
        tls: true,
        xoauth2: Buffer.from(`user=${user}\x01auth=Bearer ${password}\x01\x01`).toString('base64'),
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 143 STARTTLS with authMethod PLAIN',
      config: {
        host,
        port: 143,
        user,
        password,
        tls: false,
        autotls: 'required',
        authMethod: 'PLAIN',
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 143 STARTTLS with authMethod LOGIN',
      config: {
        host,
        port: 143,
        user,
        password,
        tls: false,
        autotls: 'required',
        authMethod: 'LOGIN',
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 993 with connTimeout and authTimeout',
      config: {
        host,
        port: 993,
        user,
        password,
        tls: true,
        connTimeout: 30000,
        authTimeout: 30000,
        tlsOptions: { 
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        }
      }
    }
  ];
  
  console.log('\nTrying different authentication methods...\n');
  
  let workingConfig = null;
  
  for (const { name, config } of configs) {
    const success = await testAuth(name, config);
    if (success && !workingConfig) {
      workingConfig = { name, config };
      break; // Stop at first success
    }
  }
  
  if (workingConfig) {
    console.log('\n' + '='.repeat(51));
    console.log('✅ WORKING CONFIGURATION FOUND!');
    console.log('=' + '='.repeat(50));
    console.log('\nConfiguration:', workingConfig.name);
    
    // Remove password and xoauth2 from display
    const safeConfig = {...workingConfig.config};
    delete safeConfig.password;
    delete safeConfig.xoauth2;
    
    console.log('\nSave this to config/mailstore.json:');
    console.log(JSON.stringify(safeConfig, null, 2));
    
    console.log('\nPassword will be read from macOS Keychain (service "obs-dailynotes.mailstore").');
    
    // Save the working config
    const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(safeConfig, null, 2));
    console.log('\n✅ Configuration saved to config/mailstore.json');
    
  } else {
    console.log('\n' + '='.repeat(51));
    console.log('❌ No working authentication method found');
    console.log('=' + '='.repeat(50));
    console.log('\nPossible issues:');
    console.log('  1. Wrong username or password');
    console.log('  2. MailStore requires different authentication');
    console.log('  3. Account might need special IMAP permissions');
    console.log('\nTry connecting with a desktop email client to verify credentials');
    console.log('Thunderbird or Apple Mail can help identify the correct settings');
  }
}

main().catch(console.error);
