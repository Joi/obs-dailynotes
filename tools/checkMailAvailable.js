#!/usr/bin/env node
/**
 * Check if local Mail.app search is available
 */
const { execSync } = require('child_process');
const fs = require('fs');

function isMailSearchAvailable() {
  try {
    // Check 1: Are any Mail messages indexed?
    const indexCount = execSync(`mdfind "kMDItemKind == 'Mail Message'" 2>/dev/null | wc -l`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    if (parseInt(indexCount) > 0) {
      return { available: true, reason: 'Mail messages indexed', count: parseInt(indexCount) };
    }
    
    // Check 2: Do .emlx files exist?
    const emlxCount = execSync(`find ~/Library/Mail -name "*.emlx" 2>/dev/null | wc -l`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    if (parseInt(emlxCount) > 0) {
      return { available: false, reason: 'Mail files exist but not indexed', count: parseInt(emlxCount) };
    }
    
    // Check 3: Does Mail folder exist?
    const mailPath = process.env.HOME + '/Library/Mail';
    if (!fs.existsSync(mailPath)) {
      return { available: false, reason: 'Mail.app not configured', count: 0 };
    }
    
    // Mail folder exists but no messages
    return { available: false, reason: 'Mail.app configured but no local messages', count: 0 };
    
  } catch (err) {
    return { available: false, reason: 'Error checking Mail.app: ' + err.message, count: 0 };
  }
}

// If run directly
if (require.main === module) {
  const status = isMailSearchAvailable();
  
  console.log('Mail.app Search Availability Check');
  console.log('===================================');
  console.log(`Available: ${status.available ? '✓ YES' : '✗ NO'}`);
  console.log(`Reason: ${status.reason}`);
  console.log(`Message count: ${status.count}`);
  
  if (!status.available) {
    console.log('\nRecommendations:');
    
    if (status.reason.includes('not indexed')) {
      console.log('• Run: sudo mdutil -E /');
      console.log('• Wait 10-30 minutes for indexing');
    } else if (status.reason.includes('not configured')) {
      console.log('• Mail.app is not set up');
      console.log('• Use Gmail API for email search');
    } else if (status.reason.includes('no local messages')) {
      console.log('• Open Mail.app → Settings → Accounts');
      console.log('• Enable message downloading for your accounts');
      console.log('• Or continue using Gmail API');
    }
  }
  
  process.exit(status.available ? 0 : 1);
}

module.exports = { isMailSearchAvailable };
