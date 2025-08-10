#!/usr/bin/env node
/**
 * Enhanced Two-Way Sync for Apple Reminders
 * 
 * Features:
 * - Syncs completed tasks (existing)
 * - Syncs edited task text (new)
 * - Creates new reminders from Obsidian (new)
 * - Detects tasks in meeting sections without IDs (new)
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const crypto = require('crypto');

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');
const remindersDir = path.join(vaultRoot, 'reminders');
const syncStatePath = path.join(remindersDir, '.sync-state.json');

// Load or initialize sync state
function loadSyncState() {
  try {
    if (fs.existsSync(syncStatePath)) {
      return JSON.parse(fs.readFileSync(syncStatePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading sync state:', e.message);
  }
  return { tasks: {}, lastSync: null };
}

function saveSyncState(state) {
  try {
    fs.mkdirSync(remindersDir, { recursive: true });
    state.lastSync = new Date().toISOString();
    fs.writeFileSync(syncStatePath, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Error saving sync state:', e.message);
  }
}

/**
 * Parse tasks from content, including new tasks without IDs
 */
function parseTasksFromContent(content, filePath = '') {
  const lines = content.split(/\r?\n/);
  const tasks = [];
  
  // Track if we're in a meeting section
  let currentMeeting = null;
  let currentPerson = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect meeting headers
    if (line.match(/^###.*#mtg/)) {
      currentMeeting = line.replace(/^###\s*/, '').replace(/\s*#mtg.*$/, '');
      currentPerson = null;
      continue;
    }
    
    // Detect agenda sections for specific people
    if (line.match(/^-?\s*Agenda for \[\[([^\]]+)\]\]/)) {
      const personMatch = line.match(/\[\[([^\]]+)\]\]/);
      currentPerson = personMatch ? personMatch[1] : null;
      continue;
    }
    
    // Reset context on major headers
    if (line.match(/^##[^#]/)) {
      currentMeeting = null;
      currentPerson = null;
    }
    
    // Parse task with existing ID
    const existingTask = line.match(/^[\t ]*- \[( |x)\] (.*?)(?:\s*\(([^)]+)\))?\s*<!--reminders-id:([^\s>]+)[^>]*-->$/);
    if (existingTask) {
      const [, status, title, list, id] = existingTask;
      tasks.push({
        done: status === 'x',
        title: title.trim(),
        list: list || (currentPerson ? currentPerson : 'Reminders'),
        id,
        line: i + 1,
        filePath,
        hasId: true,
        context: { meeting: currentMeeting, person: currentPerson }
      });
      continue;
    }
    
    // Parse new task without ID (but looks like a task)
    const newTask = line.match(/^[\t ]*- \[( |x)\] (.+?)$/);
    if (newTask) {
      const [, status, fullText] = newTask;
      
      // Skip if it already has an ID (shouldn't happen but be safe)
      if (fullText.includes('<!--reminders-id:')) continue;
      
      // Try to extract list from parentheses if present
      const listMatch = fullText.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      let title = fullText;
      let list = currentPerson || 'Inbox'; // Default to person's list or Inbox
      
      if (listMatch) {
        title = listMatch[1].trim();
        list = listMatch[2];
      }
      
      // Generate a temporary ID for tracking
      const tempId = 'NEW-' + crypto.randomBytes(8).toString('hex');
      
      tasks.push({
        done: status === 'x',
        title: title.trim(),
        list,
        id: tempId,
        line: i + 1,
        filePath,
        hasId: false,
        isNew: true,
        originalLine: line,
        context: { meeting: currentMeeting, person: currentPerson }
      });
    }
  }
  
  return tasks;
}

/**
 * Get today's daily note path
 */
function getTodayDailyNotePath() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
}

/**
 * Find task in Apple Reminders by ID
 */
async function findReminderById(list, id) {
  try {
    const { stdout } = await execFileAsync('reminders', ['show', list, '--format', 'json']);
    const reminders = JSON.parse(stdout);
    
    for (let i = 0; i < reminders.length; i++) {
      const r = reminders[i];
      // Check if ID matches externalId or in notes field
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
    // Get list of non-completed reminders to find the correct index
    const { stdout } = await execFileAsync('reminders', ['show', list, '--format', 'json']);
    const reminders = JSON.parse(stdout);
    
    // Find the task by ID in the non-completed list
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
    
    // Complete using 0-based index (reminders CLI seems to use 0-based despite docs)
    await execFileAsync('reminders', ['complete', list, String(targetIndex)]);
    return true;
  } catch (e) {
    console.error(`Failed to complete reminder in ${list} with ID ${id}:`, e.message);
    return false;
  }
}

/**
 * Edit a reminder's text
 */
async function editReminder(list, index, newTitle) {
  try {
    await execFileAsync('reminders', ['edit', list, String(index + 1), newTitle]);
    return true;
  } catch (e) {
    console.error(`Failed to edit reminder in ${list} at index ${index}:`, e.message);
    return false;
  }
}

/**
 * Create a new reminder
 */
async function createReminder(list, title, id) {
  try {
    // Add the task with ID in notes
    const titleWithId = title;
    const notes = `ID: ${id}`;
    
    // Create the reminder with notes
    await execFileAsync('reminders', ['add', list, titleWithId, '--notes', notes]);
    return true;
  } catch (e) {
    console.error(`Failed to create reminder in ${list}:`, e.message);
    return false;
  }
}

/**
 * Update a file with new reminder IDs
 */
function updateFileWithIds(filePath, updates) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  // Apply updates (in reverse order to maintain line numbers)
  updates.sort((a, b) => b.line - a.line);
  
  for (const update of updates) {
    const lineIndex = update.line - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      // Add the reminder ID to the end of the line
      if (!line.includes('<!--reminders-id:')) {
        lines[lineIndex] = line.replace(/\s*$/, ` <!--reminders-id:${update.id}-->`);
      }
    }
  }
  
  fs.writeFileSync(filePath, lines.join('\n'));
}

/**
 * Main sync function
 */
async function syncReminders() {
  console.log('Starting enhanced two-way sync...');
  
  const syncState = loadSyncState();
  const allTasks = new Map(); // key: list|id
  const fileUpdates = new Map(); // Track which files need ID updates
  
  // Collect tasks from all sources
  const sources = [
    path.join(remindersDir, 'reminders_inbox.md'),
    path.join(remindersDir, 'reminders.md'),
    path.join(remindersDir, 'todo-today.md'),
    getTodayDailyNotePath()
  ];
  
  // Also check person pages with reminders
  const peopleIndexPath = path.join(vaultRoot, 'people.index.json');
  if (fs.existsSync(peopleIndexPath)) {
    const peopleIndex = JSON.parse(fs.readFileSync(peopleIndexPath, 'utf8'));
    for (const [name, info] of Object.entries(peopleIndex)) {
      if (info.reminders && info.pagePath) {
        const personPath = path.join(vaultRoot, info.pagePath);
        if (fs.existsSync(personPath)) {
          sources.push(personPath);
        }
      }
    }
  }
  
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
        
        // Track new tasks that need IDs
        if (task.isNew) {
          if (!fileUpdates.has(source)) {
            fileUpdates.set(source, []);
          }
          fileUpdates.get(source).push(task);
        }
      }
    } catch (e) {
      console.error(`Error processing ${source}:`, e.message);
    }
  }
  
  // Process all tasks
  for (const task of allTasks.values()) {
    const stateKey = `${task.list}|${task.id}`;
    
    try {
      if (task.isNew) {
        // Create new reminder
        console.log(`Creating new task: "${task.title}" in ${task.list}`);
        
        // Generate a real ID
        const realId = crypto.randomBytes(16).toString('hex');
        
        // Create in Apple Reminders
        if (await createReminder(task.list, task.title, realId)) {
          // Update the file with the new ID
          const updates = fileUpdates.get(task.filePath) || [];
          const updateIndex = updates.findIndex(u => u.id === task.id);
          if (updateIndex >= 0) {
            updates[updateIndex].id = realId;
          }
          
          // Track in sync state
          syncState.tasks[`${task.list}|${realId}`] = {
            title: task.title,
            list: task.list,
            done: task.done
          };
        }
      } else if (task.hasId) {
        // Existing task - check for changes
        const found = await findReminderById(task.list, task.id);
        
        if (found) {
          const { index, reminder } = found;
          const stateTask = syncState.tasks[stateKey];
          
          // Check if completed (handle both completed and isCompleted)
          const isReminderCompleted = reminder.completed || reminder.isCompleted;
          if (task.done && !isReminderCompleted) {
            console.log(`Completing: "${task.title}" in list "${task.list}"`);
            await completeReminder(task.list, task.id);
          }
          
          // Check if text changed (compare with last known state)
          if (stateTask && stateTask.title !== task.title && !isReminderCompleted) {
            console.log(`Updating: "${stateTask.title}" → "${task.title}"`);
            await editReminder(task.list, index, task.title);
          }
          
          // Update sync state
          syncState.tasks[stateKey] = {
            title: task.title,
            list: task.list,
            done: task.done || isReminderCompleted
          };
        }
      }
    } catch (e) {
      console.error(`Error processing task "${task.title}":`, e.message);
    }
  }
  
  // Update files with new IDs
  for (const [filePath, updates] of fileUpdates.entries()) {
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} task IDs in ${path.basename(filePath)}`);
      updateFileWithIds(filePath, updates);
    }
  }
  
  // Save sync state
  saveSyncState(syncState);
  
  console.log('Sync complete!');
}

// Run if called directly
if (require.main === module) {
  syncReminders().catch(console.error);
}

module.exports = { syncReminders, parseTasksFromContent };