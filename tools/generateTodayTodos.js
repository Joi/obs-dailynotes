#!/usr/bin/env node
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env beside project, fallback silently
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const outputPath = path.join(dailyDir, 'reminders', 'todo-today.md');
const cachePath = path.join(dailyDir, 'reminders', 'reminders_cache.json');
const CACHE_TTL_MIN = Number(process.env.TODO_CACHE_TTL_MIN || '0');

// No JXA/system tag enrichment for stability; keep logic strictly reminders-cli based

function extractTags(text) {
  if (!text || typeof text !== 'string') return [];
  const tags = new Set();
  const re = /#([A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?)/g;
  let m;
  while ((m = re.exec(text)) !== null) tags.add(m[1].toLowerCase());
  return Array.from(tags);
}

// Helper to check if a reminder is due today or urgent
function isDueToday(reminder) {
  if (!reminder.dueDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dueDate = new Date(reminder.dueDate);
  return dueDate >= today && dueDate < tomorrow;
}

function isPriority(reminder) {
  const title = String(reminder.title || '');
  const notes = String(reminder.notes || '');
  const tags = new Set([...(reminder._tags || []), ...extractTags(title), ...extractTags(notes)]);
  // Explicit markers
  if (title.includes('!!')) return true; // urgent marker
  if (/\burgent\b|\basap\b|\bimportant\b|\bcritical\b/i.test(title + ' ' + notes)) return true;
  if (tags.has('urgent') || tags.has('today')) return true;
  // Apple Reminders numeric priority: treat any non-zero as priority
  if (typeof reminder.priority === 'number' && reminder.priority > 0) return true;
  // Allow single '!' as high priority
  if (/\s!\s?|!$/.test(title)) return true;
  return false;
}

function isWaiting(reminder) {
  const list = String(reminder.list || '');
  const title = String(reminder.title || '');
  const notes = String(reminder.notes || '');
  if (/waiting/i.test(list)) return true;
  if (/#waiting\b/i.test(title)) return true;
  if (/#waiting\b/i.test(notes)) return true;
  return false;
}

function isNext(reminder) {
  const title = String(reminder.title || '');
  const notes = String(reminder.notes || '');
  const tags = new Set([...(reminder._tags || []), ...extractTags(title), ...extractTags(notes)]);
  return tags.has('next') || /\bnext action\b/i.test(title + ' ' + notes);
}

function isToday(reminder) {
  const title = String(reminder.title || '');
  const notes = String(reminder.notes || '');
  const tags = new Set([...(reminder._tags || []), ...extractTags(title), ...extractTags(notes)]);
  if (tags.has('today')) return true;
  if (/\btoday\b/i.test(title) || /\btoday\b/i.test(notes)) return true;
  return false;
}

async function generateTodayTodos() {
  // First try to use the cache if it exists and is recent
  let items = [];
  let useCache = false;
  
  try {
    if (CACHE_TTL_MIN > 0) {
      const stats = fs.statSync(cachePath);
      const ageInMinutes = (Date.now() - stats.mtime.getTime()) / 1000 / 60;
      if (ageInMinutes < CACHE_TTL_MIN) {
        const cacheData = fs.readFileSync(cachePath, 'utf8');
        items = JSON.parse(cacheData);
        useCache = true;
      }
    }
  } catch (e) {
    // Cache doesn't exist or is invalid
  }
  
  if (!useCache) {
    // Fetch fresh data from reminders CLI
    await new Promise((resolve, reject) => {
      execFile('reminders', ['show-all', '--format', 'json'], (err, stdout, stderr) => {
        if (err) {
          console.error('Failed to read reminders:', stderr || err.message);
          reject(err);
          return;
        }
        try {
          items = JSON.parse(stdout);
          // Save to cache for other scripts to use
          fs.mkdirSync(path.dirname(cachePath), { recursive: true });
          fs.writeFileSync(cachePath, stdout, 'utf8');
          resolve();
        } catch (e) {
          console.error('Invalid JSON from reminders CLI');
          reject(e);
        }
      });
    });
  }
  // No system tag enrichment
  
  // Filter for today's items, urgent, or next actions
  const todayItems = items.filter(item => 
    !item.isCompleted &&
    !isWaiting(item) &&
    (isDueToday(item) || isToday(item) || isPriority(item) || isNext(item))
  );
  
  // Sort by priority and due date
  todayItems.sort((a, b) => {
    // Priority items first
    if (isPriority(a) && !isPriority(b)) return -1;
    if (!isPriority(a) && isPriority(b)) return 1;
    
    // Then by due date (earlier first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    
    return 0;
  });
  
  // Format the output
  const lines = [];
  
  if (todayItems.length > 0) {
    lines.push('## To Do Today');
    lines.push('');
    
    for (const item of todayItems) {
      const title = item.title || '';
      const list = item.list || '';
      const id = item.externalId || '';
      
      // Add emoji indicators
      let prefix = '';
      if (isPriority(item)) prefix = '🔴 ';
      else if (isDueToday(item)) prefix = '📅 ';
      
      // Format due time if available
      let timeStr = '';
      if (item.dueDate) {
        const due = new Date(item.dueDate);
        const hours = due.getHours();
        const mins = due.getMinutes();
        if (hours > 0 || mins > 0) {
          timeStr = ` @ ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        }
      }
      
      // Embed ID as an HTML comment for syncing
      lines.push(`- [ ] ${prefix}${title}${timeStr} *(${list})* <!--reminders-id:${id}-->`);
    }
    lines.push('');
  }
  
  // Create output directory and write file
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
  
  return todayItems.length;
}

// Run if called directly
if (require.main === module) {
  generateTodayTodos()
    .then(count => {
      if (count > 0) {
        console.log(`Generated todo-today.md with ${count} items`);
      }
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { generateTodayTodos };