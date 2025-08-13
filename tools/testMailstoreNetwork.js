#!/usr/bin/env node
/**
 * Basic network connectivity test for MailStore
 */
const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

async function testPort(host, port, useTLS = false) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout' });
    }, 5000);
    
    const onConnect = () => {
      clearTimeout(timeout);
      resolve({ success: true });
      client.end();
    };
    
    const onError = (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    };
    
    const client = useTLS 
      ? tls.connect(port, host, { rejectUnauthorized: false }, onConnect)
      : net.connect(port, host, onConnect);
    
    client.on('error', onError);
  });
}

async function main() {
  console.log('MailStore Network Connectivity Test');
  console.log('=' + '='.repeat(50));
  
  // Load config to get hostname
  const configPath = path.join(__dirname, '..', 'config', 'mailstore.json');
  let host = 'localhost';
  
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    host = config.host;
    console.log(`\nTesting host: ${host}`);
  } else if (process.env.MAILSTORE_HOST) {
    host = process.env.MAILSTORE_HOST;
    console.log(`\nTesting host: ${host} (from environment)`);
  } else {
    console.log('\n❌ No host configured. Set MAILSTORE_HOST or create config/mailstore.json');
    process.exit(1);
  }
  
  const ports = [
    { port: 143, name: 'IMAP (plain)', tls: false },
    { port: 993, name: 'IMAP (SSL/TLS)', tls: true },
    { port: 110, name: 'POP3 (plain)', tls: false },
    { port: 995, name: 'POP3 (SSL/TLS)', tls: true },
    { port: 25, name: 'SMTP', tls: false },
    { port: 587, name: 'SMTP (submission)', tls: false },
    { port: 465, name: 'SMTP (SSL)', tls: true }
  ];
  
  console.log('\nTesting ports...\n');
  
  const available = [];
  
  for (const { port, name, tls } of ports) {
    process.stdout.write(`Port ${port} (${name})... `);
    const result = await testPort(host, port, tls);
    if (result.success) {
      console.log('✅ OPEN');
      available.push({ port, name });
    } else {
      console.log(`❌ CLOSED (${result.error})`);
    }
  }
  
  console.log('\n' + '='.repeat(51));
  
  if (available.length > 0) {
    console.log('Available services:');
    for (const { port, name } of available) {
      console.log(`  • Port ${port}: ${name}`);
    }
    
    // Suggest configuration based on what's available
    if (available.find(p => p.port === 143)) {
      console.log('\n💡 Port 143 is open. Try this configuration:');
      console.log(JSON.stringify({
        host,
        port: 143,
        user: "your-username",
        password: "your-password",
        tls: false
      }, null, 2));
    } else if (available.find(p => p.port === 993)) {
      console.log('\n💡 Port 993 is open. Try this configuration:');
      console.log(JSON.stringify({
        host,
        port: 993,
        user: "your-username",
        password: "your-password",
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      }, null, 2));
    }
  } else {
    console.log('❌ No mail ports are accessible.');
    console.log('\nPossible issues:');
    console.log(`  1. Host "${host}" is not reachable`);
    console.log('  2. Firewall is blocking all mail ports');
    console.log('  3. MailStore services are not running');
    console.log('  4. Wrong hostname');
    
    // Try to ping the host
    console.log(`\nTry: ping ${host}`);
  }
}

main().catch(console.error);
