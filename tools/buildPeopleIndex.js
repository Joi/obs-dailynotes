#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH;
if (!dailyDir) {
  console.error('DAILY_NOTE_PATH not set');
  process.exit(1);
}

const vaultRoot = path.resolve(dailyDir, '..');
const peopleDir = vaultRoot; // scan root-level for person pages
const indexPath = path.join(vaultRoot, 'people.index.json');

function parseFrontmatter(content) {
  const fm = content.match(/^---[\r\n]([\s\S]*?)[\r\n]---/);
  if (!fm) return {};
  const yaml = fm[1];
  const obj = {};
  const lines = yaml.split(/\r?\n/);
  let currentKey = null;
  
  lines.forEach((line) => {
    // Skip empty lines
    if (!line.trim()) return;
    
    // Handle array items that start with -
    const arrayMatch = line.match(/^\s*-\s+(.+)$/);
    if (arrayMatch) {
      if (currentKey && !obj[currentKey]) obj[currentKey] = [];
      if (currentKey && Array.isArray(obj[currentKey])) {
        obj[currentKey].push(arrayMatch[1].replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
      }
      return;
    }
    
    // Calculate indent level
    const indent = line.search(/\S/);
    
    // Handle nested objects by tracking indentation
    if (indent > 0 && currentKey) {
      // This is a nested property
      const m = line.match(/^\s+([A-Za-z0-9_\-]+):\s*(.*)$/);
      if (m) {
        const nestedKey = m[1];
        const nestedVal = m[2];
        
        // Ensure parent is an object
        if (typeof obj[currentKey] !== 'object' || obj[currentKey] === null) {
          obj[currentKey] = {};
        }
        
        // Skip if it's an array (not an object)
        if (Array.isArray(obj[currentKey])) return;
        
        // Parse the nested value
        if (nestedVal === 'true' || nestedVal === 'false') {
          obj[currentKey][nestedKey] = nestedVal === 'true';
        } else {
          obj[currentKey][nestedKey] = nestedVal.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        }
      }
    } else {
      // Root-level property
      const m = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
      if (!m) return;
      currentKey = m[1];
      let val = m[2];
      
      // Handle arrays
      if (val.startsWith('[') && val.endsWith(']')) {
        try { 
          obj[currentKey] = JSON.parse(val.replace(/([A-Za-z0-9_.@\-\s]+)/g, '"$1"')); 
        } catch { 
          obj[currentKey] = []; 
        }
      } 
      // Handle empty value (for objects or arrays to be filled by nested lines)
      else if (val === '' || val.trim() === '') {
        // Don't set anything yet, wait for nested lines
      }
      // Handle booleans
      else if (val === 'true' || val === 'false') {
        obj[currentKey] = val === 'true';
      } 
      // Handle regular strings
      else {
        obj[currentKey] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      }
    }
  });
  
  return obj;
}

const index = {};
if (fs.existsSync(peopleDir)) {
  const dailyDirName = path.basename(dailyDir);
  const files = fs.readdirSync(peopleDir)
    .filter(f => f.endsWith('.md'))
    .filter(f => f !== `${new Date().toISOString().slice(0,10)}.md`)
    .filter(f => f !== 'reminders.md' && f !== 'people.index.json')
    .filter(f => f !== dailyDirName && f !== path.basename(indexPath))
    // Ignore obvious non-person files by prefix patterns
    .filter(f => !/^\d{4}[-_]/.test(f))
    .filter(f => !/^\d/.test(f));
  for (const f of files) {
    const filePath = path.join(peopleDir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    const name = (fm.name && String(fm.name).trim().length ? fm.name : path.basename(f, '.md'));
    const tags = Array.isArray(fm.tags) ? fm.tags : (typeof fm.tags === 'string' ? [fm.tags] : []);
    const hasPeopleTag = tags.includes('person');
    const hasRemindersList = fm.reminders && 
      ((typeof fm.reminders === 'object' && fm.reminders.listName) || 
       (typeof fm.reminders === 'string' && fm.reminders.length > 0));
    // Ensure emails is always an array
    let emails = [];
    if (Array.isArray(fm.emails)) {
      emails = fm.emails;
    } else if (typeof fm.emails === 'string' && fm.emails.length > 0) {
      emails = [fm.emails];
    }
    const hasEmails = emails.length > 0;
    
    // Include if explicitly tagged person OR has strong signal (emails or reminders list)
    if (!hasPeopleTag && !hasEmails && !hasRemindersList) continue;
    
    const aliases = Array.isArray(fm.aliases) ? fm.aliases : [];
    const pagePath = `${path.basename(f)}`;

    // Support disambiguated names by including qualifiers in aliases:
    // If page name is like "Name (Qualifier)" or "Name - Qualifier", then record both
    const nameAliases = [];
    const m1 = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const m2 = name.match(/^(.+?)\s*-\s*(.+)$/);
    if (m1) {
      nameAliases.push(m1[1].trim());
      nameAliases.push(`${m1[1].trim()} - ${m1[2].trim()}`);
    } else if (m2) {
      nameAliases.push(m2[1].trim());
      nameAliases.push(`${m2[1].trim()} (${m2[2].trim()})`);
    }
    
    // Use name as the key in the index (not personId)
    index[name] = {
      name,
      pagePath,
      aliases: Array.from(new Set([...(aliases || []), ...nameAliases])),
      emails
    };
    
    // Only add reminders if explicitly configured
    if (fm.reminders && typeof fm.reminders === 'object') {
      index[name].reminders = fm.reminders;
    } else if (typeof fm.reminders === 'string' && fm.reminders.length > 0) {
      index[name].reminders = {
        listName: fm.reminders
      };
    }
  }
}

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`Wrote ${indexPath}`);


