#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// Load .env beside project, fallback silently
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');

// Path to the CSV file - can be passed as argument or use default
const csvPath = process.argv[2] || path.join(vaultRoot, '2025_Nenga_All_people__export_Aug-08-2025.csv');

// Parse CSV line - handles quotes and commas within fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
  const fm = content.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  if (!fm) return null;
  
  const yaml = fm[1];
  const obj = {};
  
  // Simple YAML parser for our needs
  const lines = yaml.split(/\r?\n/);
  let currentKey = null;
  let inList = false;
  
  for (const line of lines) {
    // Handle list items
    if (line.match(/^\s*-\s+/)) {
      if (currentKey && inList) {
        const value = line.replace(/^\s*-\s+/, '').replace(/[\[\]"']/g, '').trim();
        if (value) {
          if (!Array.isArray(obj[currentKey])) obj[currentKey] = [];
          obj[currentKey].push(value);
        }
      }
    } 
    // Handle key: [value1, value2] format
    else if (line.includes('[') && line.includes(']')) {
      const match = line.match(/^([A-Za-z0-9_\-]+):\s*\[(.*)\]/);
      if (match) {
        currentKey = match[1];
        const values = match[2].split(',').map(v => v.trim().replace(/['"]/g, '')).filter(Boolean);
        obj[currentKey] = values;
        inList = false;
      }
    }
    // Handle key: value format
    else {
      const match = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
      if (match) {
        currentKey = match[1];
        const value = match[2].trim();
        
        if (value) {
          // Check if it's a simple value or start of a list
          if (value === '' || value === '[]') {
            obj[currentKey] = [];
            inList = true;
          } else {
            obj[currentKey] = value.replace(/['"]/g, '');
            inList = false;
          }
        } else {
          obj[currentKey] = '';
          inList = true;
        }
      }
    }
    
    // Handle nested objects (like reminders:)
    if (line.match(/^(\s+)([A-Za-z0-9_\-]+):\s*(.*)$/)) {
      const match = line.match(/^(\s+)([A-Za-z0-9_\-]+):\s*(.*)$/);
      if (match && currentKey === 'reminders') {
        if (!obj.reminders) obj.reminders = {};
        obj.reminders[match[2]] = match[3].replace(/['"]/g, '').trim();
      }
    }
  }
  
  return obj;
}

// Update or create person page
function updatePersonPage(firstName, lastName, fullName, email) {
  if (!firstName || !email) return;
  
  // Clean up the name and email
  firstName = firstName.trim();
  lastName = (lastName || '').trim();
  fullName = fullName ? fullName.trim() : `${firstName} ${lastName}`.trim();
  email = email.toLowerCase().trim();
  
  // Skip invalid emails
  if (!email.includes('@')) return;
  
  // Use "Firstname Lastname.md" format, sanitize for filesystem
  let fileName = lastName ? `${firstName} ${lastName}` : `${firstName}`;
  // Remove or replace invalid characters for filenames
  fileName = fileName.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  fileName = `${fileName}.md`;
  const filePath = path.join(vaultRoot, fileName);
  
  let content = '';
  let frontmatter = null;
  let bodyContent = '';
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
    frontmatter = parseFrontmatter(content);
    
    // Get body content (everything after frontmatter)
    const fmEnd = content.indexOf('---', 4);
    if (fmEnd > 0) {
      bodyContent = content.substring(fmEnd + 3).trim();
    }
  }
  
  // Create or update frontmatter
  if (!frontmatter) {
    frontmatter = {
      tags: 'people',
      name: fullName,
      emails: [email],
      aliases: [],
      reminders: {
        listName: fullName
      }
    };
  } else {
    // Ensure emails is an array
    if (!frontmatter.emails) {
      frontmatter.emails = [email];
    } else if (typeof frontmatter.emails === 'string') {
      frontmatter.emails = [frontmatter.emails];
      if (!frontmatter.emails.includes(email)) {
        frontmatter.emails.push(email);
      }
    } else if (Array.isArray(frontmatter.emails)) {
      if (!frontmatter.emails.includes(email)) {
        frontmatter.emails.push(email);
      }
    }
    
    // Ensure other fields exist
    if (!frontmatter.tags) frontmatter.tags = 'people';
    if (!frontmatter.name) frontmatter.name = fullName;
    if (!frontmatter.aliases) frontmatter.aliases = [];
    if (!frontmatter.reminders) {
      frontmatter.reminders = { listName: fullName };
    } else if (!frontmatter.reminders.listName) {
      frontmatter.reminders.listName = fullName;
    }
  }
  
  // Build the new content
  let newContent = '---\n';
  newContent += `tags: ${frontmatter.tags}\n`;
  newContent += `name: ${frontmatter.name}\n`;
  
  // Format emails array
  if (frontmatter.emails && frontmatter.emails.length > 0) {
    newContent += `emails: [${frontmatter.emails.join(', ')}]\n`;
  } else {
    newContent += 'emails: []\n';
  }
  
  // Format aliases array
  if (frontmatter.aliases && frontmatter.aliases.length > 0) {
    newContent += `aliases: [${frontmatter.aliases.join(', ')}]\n`;
  } else {
    newContent += 'aliases: []\n';
  }
  
  // Add reminders
  newContent += 'reminders:\n';
  newContent += `  listName: "${frontmatter.reminders.listName || fullName}"\n`;
  newContent += '---\n';
  
  // Add body content if it exists
  if (bodyContent) {
    newContent += '\n' + bodyContent;
  }
  
  // Write the file
  const wasExisting = fs.existsSync(filePath);
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  return { name: fullName, email, action: wasExisting ? 'updated' : 'created' };
}

// Main processing
async function processCSV() {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }
  
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let isFirstLine = true;
  let headers = [];
  let fullNameIndex = -1;
  let firstNameIndex = -1;
  let lastNameIndex = -1;
  let emailIndex = -1;
  let primaryEmailIndex = -1;
  const results = [];
  let processedCount = 0;
  
  for await (const line of rl) {
    if (isFirstLine) {
      // Parse headers
      headers = parseCSVLine(line);
      
      // Find relevant columns (case-insensitive)
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().replace(/[^a-z ]/g, ''); // Remove special chars
        if (header === 'full name') fullNameIndex = i;
        if (header === 'first name') firstNameIndex = i;
        if (header === 'last name') lastNameIndex = i;
        if (header === 'email addresses') emailIndex = i;
        if (header === 'primary email') primaryEmailIndex = i;
      }
      
      console.log('Headers found:', headers);
      console.log(`Indices - Full Name: ${fullNameIndex}, First: ${firstNameIndex}, Last: ${lastNameIndex}, Email: ${emailIndex}, Primary Email: ${primaryEmailIndex}`);
      
      if (firstNameIndex === -1 || (emailIndex === -1 && primaryEmailIndex === -1)) {
        console.error('Could not find required columns (First Name and Email)');
        process.exit(1);
      }
      
      isFirstLine = false;
      continue;
    }
    
    // Parse data row
    const values = parseCSVLine(line);
    
    const firstName = values[firstNameIndex] || '';
    const lastName = values[lastNameIndex] || '';
    const fullName = values[fullNameIndex] || `${firstName} ${lastName}`.trim();
    
    // Get email - prefer primary email if available
    let email = '';
    if (primaryEmailIndex >= 0 && values[primaryEmailIndex]) {
      email = values[primaryEmailIndex];
    } else if (emailIndex >= 0 && values[emailIndex]) {
      // Handle multiple emails separated by semicolon
      const emails = values[emailIndex].split(';').map(e => e.trim());
      email = emails[0]; // Take first email
    }
    
    if (firstName && email) {
      const result = updatePersonPage(firstName, lastName, fullName, email);
      if (result) {
        results.push(result);
        processedCount++;
        console.log(`${result.action}: ${result.name} - ${result.email}`);
      }
    }
  }
  
  console.log('\n=== Summary ===');
  const created = results.filter(r => r.action === 'created').length;
  const updated = results.filter(r => r.action === 'updated').length;
  console.log(`Created: ${created} new person pages`);
  console.log(`Updated: ${updated} existing person pages`);
  console.log(`Total processed: ${results.length}`);
}

// Run the script
processCSV().catch(err => {
  console.error('Error processing CSV:', err);
  process.exit(1);
});