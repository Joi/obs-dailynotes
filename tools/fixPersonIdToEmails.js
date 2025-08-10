#!/usr/bin/env node
/**
 * Fix person pages to use 'emails' field instead of 'personId'
 * Ensures emails is always an array format
 */

const fs = require('fs');
const path = require('path');

const switchboardDir = '/Users/<Owner>/switchboard';

function fixPersonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it has personId in frontmatter
  if (!content.includes('personId:')) {
    return false;
  }
  
  let modified = content;
  
  // Replace personId with emails field (as array)
  // First check if there's already an email or emails field
  const hasEmailField = /^email:/m.test(content) || /^emails:/m.test(content);
  
  if (!hasEmailField) {
    // Replace personId with emails: []
    modified = modified.replace(/^personId:.*$/m, 'emails: []');
  } else {
    // Just remove personId line since we have email/emails
    modified = modified.replace(/^personId:.*\n/m, '');
  }
  
  // Convert single 'email:' to 'emails:' array format
  if (/^email:/m.test(modified)) {
    // Extract the email value
    const emailMatch = modified.match(/^email:\s*(.*)$/m);
    if (emailMatch) {
      const emailValue = emailMatch[1].trim();
      if (emailValue && emailValue !== '[]') {
        // If it's already an array, keep it
        if (emailValue.startsWith('[')) {
          modified = modified.replace(/^email:/m, 'emails:');
        } else {
          // Convert single email to array format
          const cleanEmail = emailValue.replace(/['"]/g, '');
          if (cleanEmail) {
            modified = modified.replace(/^email:.*$/m, `emails: ["${cleanEmail}"]`);
          } else {
            modified = modified.replace(/^email:.*$/m, 'emails: []');
          }
        }
      } else {
        modified = modified.replace(/^email:.*$/m, 'emails: []');
      }
    }
  }
  
  // Ensure emails field exists and is in array format
  if (!/^emails:/m.test(modified)) {
    // Add emails field after name
    modified = modified.replace(/^(name:.*\n)/m, '$1emails: []\n');
  } else {
    // Ensure emails value is in array format
    const emailsMatch = modified.match(/^emails:\s*(.*)$/m);
    if (emailsMatch) {
      const emailsValue = emailsMatch[1].trim();
      // If not already an array, convert it
      if (emailsValue && !emailsValue.startsWith('[')) {
        const cleanEmail = emailsValue.replace(/['"]/g, '');
        if (cleanEmail) {
          modified = modified.replace(/^emails:.*$/m, `emails: ["${cleanEmail}"]`);
        } else {
          modified = modified.replace(/^emails:.*$/m, 'emails: []');
        }
      } else if (!emailsValue) {
        modified = modified.replace(/^emails:.*$/m, 'emails: []');
      }
    }
  }
  
  if (modified !== content) {
    fs.writeFileSync(filePath, modified);
    return true;
  }
  
  return false;
}

// Process all markdown files
console.log('Scanning for person files with personId...');
const files = fs.readdirSync(switchboardDir)
  .filter(f => f.endsWith('.md'))
  .map(f => path.join(switchboardDir, f));

let fixedCount = 0;
let checkedCount = 0;

for (const file of files) {
  checkedCount++;
  if (fixPersonFile(file)) {
    console.log(`Fixed: ${path.basename(file)}`);
    fixedCount++;
  }
}

console.log(`\nCompleted! Fixed ${fixedCount} files out of ${checkedCount} checked.`);

// Also show files that still need email addresses
console.log('\nChecking for files with empty emails field...');
let emptyEmailCount = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (/^emails:\s*\[\s*\]/m.test(content) && /^tags:.*people/m.test(content)) {
    console.log(`Needs email: ${path.basename(file)}`);
    emptyEmailCount++;
    if (emptyEmailCount >= 10) {
      console.log('... and more');
      break;
    }
  }
}