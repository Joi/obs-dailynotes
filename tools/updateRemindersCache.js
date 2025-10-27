#!/usr/bin/env node

/**
 * Update Reminders Cache
 * Pulls fresh data from Apple Reminders using reminders-cli
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env') });

const DAILY_NOTE_PATH = (process.env.DAILY_NOTE_PATH || '/Users/joi/switchboard/dailynote').replace('~', process.env.HOME);
const VAULT_ROOT = path.resolve(DAILY_NOTE_PATH, '..');
const CACHE_PATH = path.join(VAULT_ROOT, 'reminders', 'reminders_cache.json');

/**
 * Get all reminder lists
 */
function getReminderLists() {
  try {
    const output = execSync('reminders show-lists --format json', { encoding: 'utf-8' });
    return JSON.parse(output);
  } catch (err) {
    console.error('Error getting lists:', err.message);
    return [];
  }
}

/**
 * Get reminders from a list
 */
function getRemindersFromList(listName) {
  try {
    const escapedName = listName.replace(/"/g, '\\"');
    const output = execSync(`reminders show "${escapedName}" --include-completed --format json`, { encoding: 'utf-8' });
    const items = JSON.parse(output);

    // Transform to match cache format
    return items.map(item => ({
      id: item.externalId,
      title: item.title,
      list: listName,
      notes: item.notes || '',
      due: item.dueDate || null,
      completed: item.isCompleted || false,
      flagged: item.isFlagged || false,
      priority: item.priority || 0,
      tags: extractTags(item.title, item.notes)
    }));
  } catch (err) {
    console.error(`Error getting reminders from "${listName}":`, err.message);
    return [];
  }
}

/**
 * Extract hashtags from text
 */
function extractTags(title, notes) {
  const text = (title || '') + ' ' + (notes || '');
  const re = /#([A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?)/g;
  const tags = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.push(m[1].toLowerCase());
  }
  return tags;
}

/**
 * Update cache
 */
function updateCache() {
  console.log('📥 Updating reminders cache...');

  // Get all lists
  const lists = getReminderLists();
  console.log(`  Found ${lists.length} lists`);

  // Get reminders from each list
  const byList = {};
  let totalReminders = 0;
  const sharedLists = [];

  lists.forEach(listName => {
    const items = getRemindersFromList(listName);
    byList[listName] = items;
    totalReminders += items.length;

    // Detect shared lists (format: "Name1/Name2 To Do")
    if (listName.includes('/') && listName.includes('To Do')) {
      const person = listName.split('/')[1].replace(' To Do', '');
      const activeCount = items.filter(i => !i.completed).length;
      if (activeCount > 0) {
        sharedLists.push({
          name: listName,
          count: activeCount,
          person: person
        });
      }
    }
  });

  // Build cache object
  const cache = {
    timestamp: new Date().toISOString(),
    totalReminders,
    sharedLists,
    lists,
    byList
  };

  // Ensure directory exists
  const cacheDir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Write cache
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');

  console.log(`✅ Cache updated: ${CACHE_PATH}`);
  console.log(`   Total reminders: ${totalReminders}`);
  console.log(`   Active inbox: ${byList['Inbox']?.filter(i => !i.completed).length || 0}`);
  console.log(`   Shared lists: ${sharedLists.length}`);

  return cache;
}

// Run if called directly
if (require.main === module) {
  try {
    updateCache();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

module.exports = { updateCache };
