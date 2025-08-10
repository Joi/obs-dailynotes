#!/usr/bin/env node
/**
 * Fast sync that only checks people with #list tag
 * This is much faster than checking all person pages
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

// Load sync functions from enhanced sync
const { parseTasksFromContent } = require('./syncRemindersEnhanced');

/**
 * Get today's daily note path
 */
function getTodayDailyNotePath() {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(dailyDir, `${today}.md`);
}

/**
 * Load sync state
 */
function loadSyncState() {
  const statePath = path.join(remindersDir, '.sync-state.json');
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }
  return { tasks: {}, lastSync: null };
}

/**
 * Save sync state
 */
function saveSyncState(state) {
  const statePath = path.join(remindersDir, '.sync-state.json');
  state.lastSync = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Find reminder by ID
 */
async function findReminderById(list, id) {
  try {
    const { stdout } = await execFileAsync('reminders', ['show', list, '--format', 'json']);
    const reminders = JSON.parse(stdout);
    
    for (let i = 0; i < reminders.length; i++) {
      const r = reminders[i];
      if ((r.externalId && r.externalId === id) || 
          (r.notes && r.notes.includes(`ID: ${id}`))) {
        return { index: i, reminder: r };
      }
    }
  } catch (e) {
    // List might not exist
  }
  return null;
}

/**
 * Complete a reminder by ID
 */
async function completeReminder(list, id) {
  try {
    const { stdout } = await execFileAsync('reminders', ['show', list, '--format', 'json']);
    const reminders = JSON.parse(stdout);
    
    let targetIndex = -1;
    for (let i = 0; i < reminders.length; i++) {
      if (reminders[i].externalId === id) {
        targetIndex = i;
        break;
      }
    }
    
    if (targetIndex === -1) {
      console.error(`Task with ID ${id} not found in non-completed list ${list}`);
      return false;
    }
    
    await execFileAsync('reminders', ['complete', list, String(targetIndex)]);
    return true;
  } catch (e) {
    console.error(`Failed to complete reminder in ${list} with ID ${id}:`, e.message);
    return false;
  }
}

/**
 * Main sync function - optimized for people with #list tag
 */
async function syncRemindersFast() {
  console.log('Starting fast sync (people with #list tag only)...');
  
  const syncState = loadSyncState();
  const allTasks = new Map();
  
  // Load people index
  const peopleIndexPath = path.join(vaultRoot, 'people.index.json');
  if (!fs.existsSync(peopleIndexPath)) {
    console.log('People index not found. Run: npm run people:index');
    return;
  }
  
  const peopleIndex = JSON.parse(fs.readFileSync(peopleIndexPath, 'utf8'));
  
  // Build list of sources to check
  const sources = [
    path.join(remindersDir, 'reminders_inbox.md'),
    path.join(remindersDir, 'reminders.md'),
    path.join(remindersDir, 'todo-today.md'),
    getTodayDailyNotePath()
  ];
  
  // Only add person pages that have #list tag or reminders configuration
  let peopleWithLists = 0;
  for (const [name, info] of Object.entries(peopleIndex)) {
    // Check if person has reminders configuration or list tag
    if (info.reminders && (info.reminders.listName || info.reminders.sharedListName)) {
      const personPath = path.join(vaultRoot, info.pagePath);
      if (fs.existsSync(personPath)) {
        // Quick check if page has #list tag (faster than full parse)
        const content = fs.readFileSync(personPath, 'utf8');
        const hasFrontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (hasFrontmatter) {
          const fm = hasFrontmatter[1];
          if (fm.includes('- list') || fm.includes('reminders:')) {
            sources.push(personPath);
            peopleWithLists++;
          }
        }
      }
    }
  }
  
  console.log(`Checking ${peopleWithLists} people with lists + ${sources.length - peopleWithLists} other sources`);
  
  // Collect tasks from sources
  for (const source of sources) {
    if (!fs.existsSync(source)) continue;
    
    try {
      const content = fs.readFileSync(source, 'utf8');
      const tasks = parseTasksFromContent(content, source);
      
      for (const task of tasks) {
        const key = `${task.list}|${task.id}`;
        
        // For existing tasks, prefer done state
        if (allTasks.has(key)) {
          const existing = allTasks.get(key);
          if (task.done && !existing.done) {
            allTasks.set(key, task);
          }
        } else {
          allTasks.set(key, task);
        }
      }
    } catch (e) {
      console.error(`Error processing ${source}:`, e.message);
    }
  }
  
  // Process task completions
  let completions = 0;
  for (const [key, task] of allTasks.entries()) {
    if (!task.hasId || !task.done) continue;
    
    const stateTask = syncState.tasks[key];
    if (stateTask && !stateTask.done) {
      // Task was marked complete in Obsidian
      try {
        const found = await findReminderById(task.list, task.id);
        if (found) {
          const isReminderCompleted = found.reminder.completed || found.reminder.isCompleted;
          if (!isReminderCompleted) {
            console.log(`Completing: "${task.title}" in list "${task.list}"`);
            await completeReminder(task.list, task.id);
            completions++;
          }
        }
      } catch (e) {
        console.error(`Error syncing task "${task.title}":`, e.message);
      }
    }
    
    // Update sync state
    syncState.tasks[key] = {
      title: task.title,
      list: task.list,
      done: task.done
    };
  }
  
  saveSyncState(syncState);
  
  console.log(`Fast sync complete! Processed ${allTasks.size} tasks, completed ${completions}`);
}

// Run if called directly
if (require.main === module) {
  syncRemindersFast().catch(console.error);
}

module.exports = { syncRemindersFast };