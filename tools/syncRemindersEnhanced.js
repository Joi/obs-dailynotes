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

// Simplification flags (defaults favor safety/minimal changes to avoid duplication)
const SYNC_CREATE_NEW = process.env.SYNC_CREATE_NEW === 'true'; // default false
const SYNC_EDIT_EXISTING = process.env.SYNC_EDIT_EXISTING === 'true'; // default false
const SYNC_MINIMAL_SOURCES = process.env.SYNC_MINIMAL_SOURCES !== 'false'; // default true

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
    
  // Parse task with existing ID (allow optional italic parens like *(List)*)
  const existingTask = line.match(/^[\t ]*- \[( |x)\] (.*?)(?:\s*\*?\(([^)]+)\)\*?)?\s*<!--reminders-id:([^\s>]+)[^>]*-->$/);
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
      
      // Try to extract list from parentheses if present (allow optional italics around parens)
      const listMatch = fullText.match(/^(.*?)\s*\*?\(([^)]+)\)\*?\s*$/);
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
 * Get a daily note path for a specific date string (YYYY-MM-DD)
 */
function getDailyNotePathForDateString(dateStr) {
  try {
    if (!dateStr || typeof dateStr !== 'string') return null;
    // Expect YYYY-MM-DD; fall back to Date parsing if needed
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let yyyy, mm, dd;
    if (m) {
      yyyy = m[1];
      mm = m[2];
      dd = m[3];
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      yyyy = String(d.getFullYear());
      mm = String(d.getMonth() + 1).padStart(2, '0');
      dd = String(d.getDate()).padStart(2, '0');
    }
    return path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
  } catch (_) {
    return null;
  }
}

/**
 * Parse CLI args for extra sources (yesterday, specific date, or file)
 */
function parseExtraSourcesFromArgs() {
  const args = process.argv.slice(2);
  const extraSources = [];

  const hasFlag = (flag) => args.includes(flag);
  const getValue = (key) => {
    const idx = args.indexOf(key);
    if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
    const prefixed = args.find(a => a.startsWith(key + '='));
    if (prefixed) return prefixed.split('=').slice(1).join('=');
    return null;
  };

  if (hasFlag('--help') || hasFlag('-h')) {
    const usage = [
      'Usage: node tools/syncRemindersEnhanced.js [options]',
      '',
      'Options:',
      '  --yesterday              Include yesterday\'s daily note as a source',
      '  --date YYYY-MM-DD        Include the specified daily note date',
      '  --daily YYYY-MM-DD       Alias for --date',
      '  --file /abs/path.md      Include an arbitrary markdown file as a source',
      '  -h, --help               Show this help',
      ''
    ].join('\n');
    // eslint-disable-next-line no-console
    console.log(usage);
    process.exit(0);
  }

  if (hasFlag('--yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const p = path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
    extraSources.push(p);
  }

  const dateStr = getValue('--date') || getValue('--daily');
  if (dateStr) {
    const p = getDailyNotePathForDateString(dateStr);
    if (p) extraSources.push(p);
  }

  const filePath = getValue('--file');
  if (filePath) {
    extraSources.push(filePath);
  }

  return extraSources;
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
      if ((r.externalId && r.externalId === id) || (r.notes && r.notes.includes(`ID: ${id}`))) {
        return { index: i, reminder: r };
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Complete a reminder by ID
 */
async function completeReminder(list, id) {
  try {
    // Try in the provided list first
    let found = await findReminderById(list, id);
    let effectiveList = list;
    if (!found) {
      // Fallback: search all reminders to locate the correct list
      try {
        const { stdout } = await execFileAsync('reminders', ['show-all', '--format', 'json']);
        const all = JSON.parse(stdout);
        const hit = all.find(r => (r.externalId && r.externalId === id) || (r.notes && r.notes.includes(`ID: ${id}`)));
        if (hit && hit.list) {
          effectiveList = hit.list;
          found = await findReminderById(effectiveList, id);
        }
      } catch (_) {}
    }
    if (!found) {
      console.error(`Task with ID ${id} not found in any list (starting from ${list})`);
      return false;
    }
    const { index } = found;
    // Complete using 1-based index (edit uses 1-based; align for consistency)
    await execFileAsync('reminders', ['complete', effectiveList, String(index + 1)]);
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
      // If the task lost high priority or moved to waiting, ensure it's not duplicated in priority caches
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
  // Minimal default: only sync today's note and todo-today to reduce duplication
  const sources = SYNC_MINIMAL_SOURCES ? [
    path.join(remindersDir, 'todo-today.md'),
    getTodayDailyNotePath()
  ] : [
    path.join(remindersDir, 'reminders_inbox.md'),
    path.join(remindersDir, 'reminders.md'),
    path.join(remindersDir, 'todo-today.md'),
    getTodayDailyNotePath(),
    path.join(vaultRoot, 'GTD', 'dashboard.md')
  ];

  // Add any extra sources requested via CLI
  const extraSources = parseExtraSourcesFromArgs();
  for (const s of extraSources) {
    if (typeof s === 'string' && s.trim()) sources.push(s);
  }
  
  // Also check person pages with reminders
  if (!SYNC_MINIMAL_SOURCES) {
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
        if (task.isNew && SYNC_CREATE_NEW) {
          // Create new reminder (opt-in only)
          console.log(`Creating new task: "${task.title}" in ${task.list}`);
          const realId = crypto.randomBytes(16).toString('hex');
          if (await createReminder(task.list, task.title, realId)) {
            const updates = fileUpdates.get(task.filePath) || [];
            const updateIndex = updates.findIndex(u => u.id === task.id);
            if (updateIndex >= 0) {
              updates[updateIndex].id = realId;
            }
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
          if (SYNC_EDIT_EXISTING && stateTask && stateTask.title !== task.title && !isReminderCompleted) {
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

module.exports = { syncReminders, parseTasksFromContent, findReminderById, completeReminder };