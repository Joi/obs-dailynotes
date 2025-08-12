#!/usr/bin/env node
/**
 * Enhanced pullReminders with support for shared lists
 * Handles both personal reminder lists and shared lists (e.g., "<Owner>/Daum To Do")
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');
const remindersDir = path.join(vaultRoot, 'reminders');
const peopleIndexPath = path.join(vaultRoot, 'people.index.json');

// Ensure reminders directory exists
fs.mkdirSync(remindersDir, { recursive: true });

function extractTags(text) {
  if (!text || typeof text !== 'string') return [];
  const tags = new Set();
  const re = /#([A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.add(m[1]);
  }
  return Array.from(tags);
}

/**
 * Optional mock support for tests: if REMINDERS_MOCK_FILE is set, read from it.
 * The mock JSON format should be: { "byList": { "List Name": [ {id,title,notes,completed,externalId,dueDate,priority} ] } }
 */
const MOCK_FILE = process.env.REMINDERS_MOCK_FILE;

async function getAllLists() {
  if (MOCK_FILE) {
    try {
      const raw = fs.readFileSync(MOCK_FILE, 'utf8');
      const mock = JSON.parse(raw);
      return Object.keys(mock.byList || {});
    } catch (e) {
      console.error('Invalid REMINDERS_MOCK_FILE:', e.message);
      return [];
    }
  }
  try {
    const { stdout } = await execFileAsync('reminders', ['show-lists']);
    return stdout.split('\n').filter(l => l.trim()).map(l => l.trim());
  } catch (e) {
    console.error('Error getting reminder lists:', e.message);
    return [];
  }
}

async function getRemindersFromList(listName) {
  if (MOCK_FILE) {
    try {
      const raw = fs.readFileSync(MOCK_FILE, 'utf8');
      const mock = JSON.parse(raw);
      return (mock.byList && mock.byList[listName]) ? mock.byList[listName] : [];
    } catch (e) {
      return [];
    }
  }
  try {
    const { stdout } = await execFileAsync('reminders', ['show', listName, '--format', 'json']);
    return JSON.parse(stdout);
  } catch (e) {
    // List might not exist or be empty
    return [];
  }
}

/**
 * Load people index with shared list support
 */
function loadPeopleIndex() {
  if (!fs.existsSync(peopleIndexPath)) {
    console.log('Warning: people.index.json not found. Run: npm run people:index');
    return {};
  }
  
  const index = JSON.parse(fs.readFileSync(peopleIndexPath, 'utf8'));
  
  // Build a map of list names to people
  const listToPerson = {};
  
  for (const [name, info] of Object.entries(index)) {
    // Map personal list
    if (info.reminders?.listName) {
      listToPerson[info.reminders.listName] = {
        ...info,
        isShared: false,
        listType: 'personal'
      };
    }
    
    // Map shared list
    if (info.reminders?.sharedListName) {
      listToPerson[info.reminders.sharedListName] = {
        ...info,
        isShared: true,
        listType: 'shared'
      };
    }
  }
  
  return { index, listToPerson };
}

/**
 * Main function to pull and organize reminders
 */
async function pullReminders() {
  console.log('Pulling reminders with shared list support...');
  
  // Load people index
  const { index: peopleIndex, listToPerson } = loadPeopleIndex();
  
  // Get all lists
  const allLists = await getAllLists();
  console.log(`Found ${allLists.length} reminder lists`);
  
  // Collect all reminders
  const allReminders = [];
  const byPerson = {};
  const sharedLists = [];
  const byList = {}; // maintain byList for compatibility/tests
  
  for (const listName of allLists) {
    // Check if this is a shared list
    const isSharedList = listName.includes('/');
    
    // Get reminders from this list
    const reminders = await getRemindersFromList(listName);
    if (reminders.length === 0) continue;
    
    // Find associated person
    const personInfo = listToPerson[listName];
    
    for (const reminder of reminders) {
      if (reminder.completed || reminder.isCompleted) continue;
      
      const extId = reminder.externalId || reminder.id;
      const reminderData = {
        id: extId,
        title: reminder.title,
        list: listName,
        notes: reminder.notes || '',
        dueDate: reminder.dueDate || reminder.due,
        priority: reminder.priority,
        isShared: isSharedList || personInfo?.isShared || false,
        tags: (() => {
          // Only use tags present in the title for stability across systems
          return extractTags(reminder.title || '');
        })()
      };
      
      allReminders.push(reminderData);

      // byList collection
      if (!byList[listName]) byList[listName] = [];
      byList[listName].push({
        id: reminderData.id,
        title: reminderData.title,
        list: listName,
        notes: reminderData.notes,
        due: reminderData.dueDate || null,
        completed: false,
        flagged: Boolean(reminder.flagged),
        tags: reminderData.tags
      });
      
      // Organize by person
      if (personInfo) {
        const personKey = personInfo.name;
        if (!byPerson[personKey]) {
          byPerson[personKey] = {
            name: personInfo.name,
            pagePath: personInfo.pagePath,
            items: [],
            personalList: [],
            sharedList: [],
            aliases: personInfo.aliases || [],
            emails: Array.isArray(personInfo.emails) ? personInfo.emails : []
          };
        }
        
        if (isSharedList || personInfo.isShared) {
          byPerson[personKey].sharedList.push(reminderData);
        } else {
          byPerson[personKey].personalList.push(reminderData);
        }
        byPerson[personKey].items.push(reminderData);
      }
    }
    
    // Track shared lists
    if (isSharedList) {
      sharedLists.push({
        name: listName,
        count: reminders.filter(r => !r.completed).length,
        person: personInfo?.name
      });
    }
  }
  
  // Write main reminders file
  const mainContent = generateMainRemindersContent(allReminders, sharedLists);
  fs.writeFileSync(path.join(remindersDir, 'reminders.md'), mainContent);
  
  // Write inbox file (non-person reminders)
  const inboxContent = generateInboxContent(allReminders, listToPerson);
  fs.writeFileSync(path.join(remindersDir, 'reminders_inbox.md'), inboxContent);
  
  // Write person-specific agenda files
  const agendasDir = path.join(remindersDir, 'agendas');
  fs.mkdirSync(agendasDir, { recursive: true });
  
  for (const [personName, data] of Object.entries(byPerson)) {
    const agendaContent = generatePersonAgenda(personName, data);
    const fileName = personName.replace(/[\/\\:]/g, '-') + '.md';
    fs.writeFileSync(path.join(agendasDir, fileName), agendaContent);
    
    // Also update the person's page if it exists
    const personPagePath = path.join(vaultRoot, data.pagePath);
    if (fs.existsSync(personPagePath)) {
      updatePersonPageAgenda(personPagePath, data);
    }
  }
  
  // Save cache with metadata
  const cache = {
    timestamp: new Date().toISOString(),
    totalReminders: allReminders.length,
    sharedLists: sharedLists,
    lists: allLists,
    byList,
    byPerson
  };
  fs.writeFileSync(path.join(remindersDir, 'reminders_cache.json'), JSON.stringify(cache, null, 2));
  
  console.log(`✓ Processed ${allReminders.length} reminders from ${allLists.length} lists`);
  console.log(`✓ Found ${sharedLists.length} shared lists`);
  console.log(`✓ Generated agendas for ${Object.keys(byPerson).length} people`);
}

/**
 * Generate main reminders content with shared list indicators
 */
function generateMainRemindersContent(reminders, sharedLists) {
  let content = `# All Reminders\n`;
  content += `*Generated: ${new Date().toLocaleString()}*\n\n`;
  
  if (sharedLists.length > 0) {
    content += `## Shared Lists\n`;
    for (const list of sharedLists) {
      content += `- **${list.name}**: ${list.count} items`;
      if (list.person) content += ` (with [[${list.person}]])`;
      content += `\n`;
    }
    content += `\n`;
  }
  
  content += `## Tasks\n\n`;
  
  // Group by list
  const byList = {};
  for (const r of reminders) {
    if (!byList[r.list]) byList[r.list] = [];
    byList[r.list].push(r);
  }
  
  for (const [listName, items] of Object.entries(byList)) {
    const isShared = listName.includes('/');
    content += `### ${listName}${isShared ? ' 🔄' : ''}\n`;
    
    for (const item of items) {
      content += `- [ ] ${item.title} (${listName}) <!--reminders-id:${item.id}-->\n`;
    }
    content += `\n`;
  }
  
  return content;
}

/**
 * Generate inbox content (non-person reminders)
 */
function generateInboxContent(reminders, listToPerson) {
  const inbox = reminders.filter(r => !listToPerson[r.list]);
  
  let content = `# Reminders Inbox\n`;
  content += `*Items not associated with specific people*\n\n`;
  
  for (const item of inbox) {
    content += `- [ ] ${item.title} (${item.list}) <!--reminders-id:${item.id}-->\n`;
  }
  
  return content;
}

/**
 * Generate person-specific agenda with shared list indicators
 */
function generatePersonAgenda(personName, data) {
  let content = `# Agenda\n\n`;
  content += `Person: ${personName}\n\n`;
  
  if (data.sharedList.length > 0) {
    for (const item of data.sharedList) {
      // Keep the actual list name for proper syncing
      content += `- [ ] ${item.title} (${item.list}) <!--reminders-id:${item.id} list:${item.list} person:${personName}-->\n`;
    }
  }
  
  if (data.personalList.length > 0) {
    for (const item of data.personalList) {
      content += `- [ ] ${item.title} (${item.list}) <!--reminders-id:${item.id} list:${item.list} person:${personName}-->\n`;
    }
  }
  
  content += `\n`;
  
  return content;
}

/**
 * Update person page with agenda including shared list indicator
 */
function updatePersonPageAgenda(pagePath, data) {
  let content = fs.readFileSync(pagePath, 'utf8');
  
  // Generate new agenda section
  let agendaSection = '\n<!-- BEGIN REMINDERS AGENDA -->\n';
  agendaSection += '## Agenda (from Apple Reminders)\n\n';
  
  if (data.sharedList.length > 0) {
    agendaSection += '### Shared Tasks 🔄\n';
    for (const item of data.sharedList) {
      // Keep the actual list name (e.g., "<Owner>/Daum To Do") for proper syncing
      agendaSection += `- [ ] ${item.title} (${item.list}) <!--reminders-id:${item.id}-->\n`;
    }
    agendaSection += '\n';
  }
  
  if (data.personalList.length > 0) {
    agendaSection += '### Personal Tasks\n';
    for (const item of data.personalList) {
      agendaSection += `- [ ] ${item.title} (${item.list}) <!--reminders-id:${item.id}-->\n`;
    }
  }
  
  agendaSection += '<!-- END REMINDERS AGENDA -->\n';
  
  // Replace existing agenda or append
  if (content.includes('<!-- BEGIN REMINDERS AGENDA -->')) {
    const start = content.indexOf('<!-- BEGIN REMINDERS AGENDA -->');
    const end = content.indexOf('<!-- END REMINDERS AGENDA -->');
    if (end > start) {
      content = content.substring(0, start) + agendaSection + content.substring(end + 28);
    }
  } else {
    content += agendaSection;
  }
  
  fs.writeFileSync(pagePath, content);
}

// Run if called directly
if (require.main === module) {
  pullReminders().catch(console.error);
}

module.exports = { pullReminders };