#!/usr/bin/env node
/**
 * Find all people who have Apple Reminder lists and add #list tag to their pages
 * This enables faster sync by only checking people with lists
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const vaultRoot = '/Users/<Owner>/switchboard';

console.log('Finding people with Apple Reminder lists...\n');

// Get all reminder lists
let allLists;
try {
  const listsOutput = execFileSync('reminders', ['show-lists'], { encoding: 'utf8' });
  allLists = listsOutput.split('\n').filter(l => l.trim()).map(l => l.trim());
  console.log(`Found ${allLists.length} Apple Reminder lists\n`);
} catch (e) {
  console.error('Failed to get reminder lists:', e.message);
  process.exit(1);
}

// Load people index
const peopleIndexPath = path.join(vaultRoot, 'people.index.json');
let peopleIndex = {};
if (fs.existsSync(peopleIndexPath)) {
  peopleIndex = JSON.parse(fs.readFileSync(peopleIndexPath, 'utf8'));
}

// Track updates
const updates = {
  tagged: [],
  alreadyTagged: [],
  notFound: [],
  sharedLists: []
};

// Check each person in the index
for (const [name, info] of Object.entries(peopleIndex)) {
  const personPath = path.join(vaultRoot, info.pagePath);
  
  // Check if this person has a list
  let hasPersonalList = allLists.includes(name);
  let hasSharedList = false;
  let sharedListName = null;
  
  // Check for shared lists (e.g., "<Owner>/FirstName To Do")
  const firstName = name.split(' ')[0];
  const possibleSharedLists = [
    `<Owner>/${firstName} To Do`,
    `<Owner>/${name} To Do`
  ];
  
  for (const listName of possibleSharedLists) {
    if (allLists.includes(listName)) {
      hasSharedList = true;
      sharedListName = listName;
      break;
    }
  }
  
  if (hasPersonalList || hasSharedList) {
    // Read the person's page
    if (!fs.existsSync(personPath)) {
      updates.notFound.push(name);
      continue;
    }
    
    let content = fs.readFileSync(personPath, 'utf8');
    
    // Parse frontmatter
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      console.log(`Warning: ${name} has no frontmatter, skipping`);
      continue;
    }
    
    const frontmatterRaw = fmMatch[1];
    const body = content.substring(fmMatch[0].length);
    
    // Parse tags from frontmatter
    let needsUpdate = false;
    let newFrontmatter = '';
    let hasListTag = false;
    let updatedRemindersConfig = false;
    
    const lines = frontmatterRaw.split(/\r?\n/);
    let inTags = false;
    let inReminders = false;
    let remindersLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle tags section
      if (line.startsWith('tags:')) {
        inTags = true;
        newFrontmatter += line + '\n';
        
        // Check if it's inline array
        if (line.includes('[') && line.includes(']')) {
          hasListTag = line.includes('list');
          if (!hasListTag) {
            // Add list tag to inline array
            newFrontmatter = newFrontmatter.replace(line, line.replace(']', ', list]'));
            needsUpdate = true;
            hasListTag = true;
          }
          inTags = false;
        }
      } else if (inTags && line.startsWith('  - ')) {
        if (line.includes('list')) {
          hasListTag = true;
        }
        newFrontmatter += line + '\n';
      } else if (inTags && !line.startsWith('  ')) {
        // End of tags section
        if (!hasListTag) {
          // Add list tag
          newFrontmatter = newFrontmatter.slice(0, -1); // Remove last newline
          newFrontmatter += '  - list\n' + line + '\n';
          needsUpdate = true;
          hasListTag = true;
        } else {
          newFrontmatter += line + '\n';
        }
        inTags = false;
        
        // Check if this line starts reminders section
        if (line.startsWith('reminders:')) {
          inReminders = true;
          remindersLines = [line];
        }
      } else if (line.startsWith('reminders:')) {
        inReminders = true;
        remindersLines = [line];
        newFrontmatter += line + '\n';
      } else if (inReminders && line.startsWith('  ')) {
        remindersLines.push(line);
        newFrontmatter += line + '\n';
      } else if (inReminders) {
        inReminders = false;
        newFrontmatter += line + '\n';
      } else {
        newFrontmatter += line + '\n';
      }
    }
    
    // If no tags section exists, add it
    if (!frontmatterRaw.includes('tags:')) {
      newFrontmatter = `tags:\n  - people\n  - list\n${newFrontmatter}`;
      needsUpdate = true;
    }
    
    // Update reminders configuration if needed
    if (!frontmatterRaw.includes('reminders:')) {
      // Add reminders configuration
      const remindersConfig = ['reminders:'];
      if (hasPersonalList) {
        remindersConfig.push(`  listName: "${name}"`);
      }
      if (hasSharedList) {
        if (!hasPersonalList) {
          remindersConfig.push(`  listName: "${name}"`);
        }
        remindersConfig.push(`  sharedListName: "${sharedListName}"`);
        remindersConfig.push(`  isShared: true`);
      }
      newFrontmatter += remindersConfig.join('\n') + '\n';
      updatedRemindersConfig = true;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      // Write updated content
      const newContent = `---\n${newFrontmatter}---${body}`;
      fs.writeFileSync(personPath, newContent);
      
      if (hasSharedList) {
        updates.sharedLists.push(`${name} (${sharedListName})`);
      } else {
        updates.tagged.push(name);
      }
      
      console.log(`✓ Updated ${name}${hasSharedList ? ' (shared list)' : ''}`);
    } else {
      updates.alreadyTagged.push(name);
    }
  }
}

// Report results
console.log('\n=== Summary ===\n');

if (updates.tagged.length > 0) {
  console.log(`Tagged ${updates.tagged.length} people with #list:`);
  updates.tagged.forEach(name => console.log(`  - ${name}`));
  console.log();
}

if (updates.sharedLists.length > 0) {
  console.log(`Tagged ${updates.sharedLists.length} people with shared lists:`);
  updates.sharedLists.forEach(name => console.log(`  - ${name}`));
  console.log();
}

if (updates.alreadyTagged.length > 0) {
  console.log(`Already tagged: ${updates.alreadyTagged.length} people`);
}

if (updates.notFound.length > 0) {
  console.log(`\nWarning: Person pages not found for:`);
  updates.notFound.forEach(name => console.log(`  - ${name}`));
}

// Update people index
console.log('\nUpdating people index...');
try {
  execFileSync('npm', ['run', 'people:index'], { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
} catch (e) {
  console.log('Failed to update people index');
}

console.log('\nDone!');