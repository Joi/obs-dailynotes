#!/usr/bin/env node
/**
 * Test different MailStore IMAP configurations
 */
const Imap = require('imap');
const fs = require('fs');
const path = require('path');
const { getMailstorePassword } = require('../lib/keychain');

async function testConfig(name, config) {
  console.log(`\nTesting ${name}...`);
  console.log('Config:', JSON.stringify({...config, password: '***'}, null, 2));
  
  return new Promise((resolve) => {
    const imap = new Imap(config);
    
    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout');
      imap.end();
      resolve(false);
    }, 10000);
    
    imap.once('ready', () => {
      clearTimeout(timeout);
      console.log('✅ Connected successfully!');
      imap.end();
      resolve(true);
    });
    
    imap.once('error', (err) => {
      clearTimeout(timeout);
      console.log('❌ Error:', err.message);
      resolve(false);
    });
    
    imap.connect();
  });
}

async function main() {
  console.log('MailStore Connection Tester');
  console.log('=' + '='.repeat(50));
  
  // Load existing config
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  let baseConfig = {};
  
  if (fs.existsSync(configPath)) {
    baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('\nFound config:', {...baseConfig, password: '***'});
  } else {
    console.log('No config file found. Using environment variables.');
    baseConfig = {
      host: process.env.MAILSTORE_HOST || 'localhost',
      user: process.env.MAILSTORE_USER || '',
      password: getMailstorePassword({ account: process.env.MAILSTORE_USER || '' }) || ''
    };
  }
  
  if (!baseConfig.host || !baseConfig.user || !baseConfig.password) {
    console.log('\n❌ Missing required configuration (host, user, or password)');
    console.log('\nPlease set in config/mailstore.json or environment variables:');
    console.log('  MAILSTORE_HOST, MAILSTORE_USER, and store password in macOS Keychain');
    process.exit(1);
  }
  
  const configs = [
    {
      name: 'Plain IMAP (port 143, no TLS)',
      config: {
        ...baseConfig,
        port: 143,
        tls: false,
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'STARTTLS (port 143 with TLS upgrade)',
      config: {
        ...baseConfig,
        port: 143,
        tls: false,
        autotls: 'required',
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'IMAP over SSL/TLS (port 993)',
      config: {
        ...baseConfig,
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Alternative SSL/TLS (port 993, different settings)',
      config: {
        ...baseConfig,
        port: 993,
        tls: true,
        tlsOptions: { 
          rejectUnauthorized: false,
          secureProtocol: 'TLSv1_2_method'
        }
      }
    }
  ];
  
  console.log('\nTesting different configurations...\n');
  
  let workingConfig = null;
  
  for (const { name, config } of configs) {
    const success = await testConfig(name, config);
    if (success && !workingConfig) {
      workingConfig = { name, config };
    }
  }
  
  if (workingConfig) {
    console.log('\n' + '='.repeat(51));
    console.log('✅ WORKING CONFIGURATION FOUND!');
    console.log('=' + '='.repeat(50));
    console.log('\nConfiguration:', workingConfig.name);
    console.log('\nSave this to config/mailstore.json:');
    console.log(JSON.stringify(workingConfig.config, null, 2));
    
    // Ask if user wants to save it
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nSave this configuration? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(workingConfig.config, null, 2));
        console.log('✅ Configuration saved to config/mailstore.json');
      }
      rl.close();
    });
  } else {
    console.log('\n' + '='.repeat(51));
    console.log('❌ No working configuration found');
    console.log('=' + '='.repeat(50));
    console.log('\nPossible issues:');
    console.log('  1. MailStore server is not reachable');
    console.log('  2. IMAP service is not enabled in MailStore');
    console.log('  3. Firewall is blocking the connection');
    console.log('  4. Wrong hostname or credentials');
    console.log('\nTry testing with telnet or openssl:');
    console.log(`  telnet ${baseConfig.host} 143`);
    console.log(`  openssl s_client -connect ${baseConfig.host}:993`);
  }
}

main().catch(console.error);
