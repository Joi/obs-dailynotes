#!/usr/bin/env node
/**
 * Get raw IMAP capabilities from MailStore
 */
const net = require('net');
const tls = require('tls');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function getCapabilities(host, port, useTLS = false) {
  return new Promise((resolve, reject) => {
    console.log(`\nConnecting to ${host}:${port} (${useTLS ? 'SSL/TLS' : 'plain'})...`);
    
    const options = {
      host,
      port,
      rejectUnauthorized: false
    };
    
    const client = useTLS ? tls.connect(options) : net.connect(options);
    
    let buffer = '';
    let capabilities = '';
    
    client.on('connect', () => {
      console.log('Connected! Waiting for server greeting...');
    });
    
    client.on('data', (data) => {
      buffer += data.toString();
      console.log('<<< ' + data.toString().trim());
      
      // Look for the initial greeting
      if (buffer.includes('* OK')) {
        // Send CAPABILITY command
        if (!capabilities) {
          console.log('>>> A001 CAPABILITY');
          client.write('A001 CAPABILITY\r\n');
          capabilities = 'requested';
        }
      }
      
      // Look for CAPABILITY response
      if (buffer.includes('* CAPABILITY')) {
        const capLine = buffer.split('\n').find(line => line.includes('* CAPABILITY'));
        console.log('\n✅ Server capabilities:');
        console.log(capLine);
        
        // Extract AUTH methods
        const authMethods = capLine.match(/AUTH=\S+/g) || [];
        if (authMethods.length > 0) {
          console.log('\nSupported authentication methods:');
          authMethods.forEach(method => console.log('  • ' + method));
        } else {
          console.log('\nNo AUTH methods advertised (may support LOGIN)');
        }
        
        // Send LOGOUT
        console.log('\n>>> A002 LOGOUT');
        client.write('A002 LOGOUT\r\n');
        
        setTimeout(() => {
          client.end();
          resolve(capLine);
        }, 1000);
      }
    });
    
    client.on('error', (err) => {
      console.log('❌ Error:', err.message);
      reject(err);
    });
    
    client.on('close', () => {
      console.log('Connection closed');
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      client.end();
      reject(new Error('Timeout'));
    }, 10000);
  });
}

async function main() {
  console.log('MailStore IMAP Capabilities Scanner');
  console.log('=' + '='.repeat(50));
  
  const host = process.env.MAILSTORE_HOST || '172.27.1.64';
  console.log(`Server: ${host}`);
  
  try {
    // Test port 143 (plain)
    await getCapabilities(host, 143, false).catch(() => {});
    
    // Test port 993 (SSL/TLS)
    await getCapabilities(host, 993, true).catch(() => {});
    
  } catch (err) {
    console.log('Failed to get capabilities:', err.message);
  }
  
  console.log('\n' + '='.repeat(51));
  console.log('Scan complete!');
  console.log('\nBased on the capabilities, update your config accordingly.');
  console.log('If you see AUTH=PLAIN, use authMethod: "PLAIN"');
  console.log('If you see AUTH=LOGIN, use authMethod: "LOGIN"');
  console.log('If you see AUTH=CRAM-MD5, the password might need special encoding');
}

main().catch(console.error);
