#!/usr/bin/env node
/**
 * Quick setup script for MailStore IMAP integration
 * Since Mail.app uses Core Data which we can't search
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function setupMailStore() {
  console.log('MailStore IMAP Configuration Setup');
  console.log('=' + '='.repeat(50));
  console.log();
  console.log('Since Mail.app uses Core Data (not searchable),');
  console.log('MailStore IMAP is the perfect solution!');
  console.log();
  
  const config = {};
  
  config.host = await question('MailStore server hostname: ') || 'mailstore.local';
  config.port = parseInt(await question('Port (default 143): ') || '143');
  config.user = await question('Username: ');
  config.password = await question('Password: ');
  
  const useTLS = await question('Use TLS? (y/n, default y): ');
  config.tls = useTLS.toLowerCase() !== 'n';
  
  // Save config
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log();
  console.log('✓ Configuration saved to config/mailstore.json');
  console.log();
  console.log('Testing connection...');
  
  rl.close();
  
  // Test the connection
  const { MailStoreSearch } = require('./mailstoreSearch');
  const client = new MailStoreSearch(config);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const folders = await client.listFolders();
    console.log('\nAvailable folders:');
    Object.keys(folders).slice(0, 10).forEach(f => console.log(`  - ${f}`));
    
    client.disconnect();
    
    console.log('\n' + '='.repeat(51));
    console.log('SUCCESS! MailStore is ready to use!');
    console.log('=' + '='.repeat(50));
    console.log();
    console.log('To enrich a person:');
    console.log('  export PERSON_KEY="Person Name"');
    console.log('  export PERSON_EMAIL="email@example.com"');
    console.log('  node tools/enrichFromMailStore.js');
    
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    console.log();
    console.log('Please check:');
    console.log('  1. Server hostname is correct');
    console.log('  2. Username/password are correct');
    console.log('  3. IMAP service is enabled in MailStore');
    console.log('  4. Network/firewall allows connection');
  }
}

setupMailStore().catch(console.error);
