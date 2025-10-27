const fs = require('fs');
const path = require('path');

function resolveDailyDir() {
  const p = (process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote').replace('~', process.env.HOME || '~');
  return p;
}

function loadRemindersCache(dailyDirOptional) {
  const dailyDir = dailyDirOptional || resolveDailyDir();
  const remindersDir = path.resolve(dailyDir, '..', 'reminders');
  const cachePath = path.join(remindersDir, 'reminders_cache.json');
  if (!fs.existsSync(cachePath)) return [];
  const raw = fs.readFileSync(cachePath, 'utf8');
  const cache = JSON.parse(raw);
  const reminders = [];
  if (cache.byList) {
    Object.entries(cache.byList).forEach(([listName, items]) => {
      items.forEach(item => {
        reminders.push({
          id: item.id,
          title: item.title,
          list: listName,
          notes: item.notes,
          flagged: item.flagged,
          priority: item.priority,
          dueDate: item.due,
          completed: item.completed,
          tags: Array.isArray(item.tags) ? item.tags : [],
        });
      });
    });
  }
  return reminders;
}

/**
 * Extract tags from text
 */
function extractTags(text) {
  if (!text || typeof text !== 'string') return [];
  const re = /#([A-Za-z0-9_-]+(?::[A-Za-z0-9_-]+)?)/g;
  const tags = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.push(m[1].toLowerCase());
  }
  return tags;
}

/**
 * Parse GTD elements from task text
 */
function parseGTDElements(text) {
  const titleTags = extractTags(text);
  return {
    tags: titleTags,
    hasPriority: text.includes('!'),
    isUrgent: text.includes('!!')
  };
}

/**
 * Categorize reminders by GTD categories
 */
function categorizeReminders(reminders) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    inbox: reminders.filter(r => r.list === 'Inbox' && !r.completed),
    today: reminders.filter(r => {
      if (r.completed) return false;
      if (!r.dueDate) return false;
      const due = new Date(r.dueDate);
      return due.toDateString() === today.toDateString();
    }),
    waiting: reminders.filter(r => {
      if (r.completed) return false;
      return r.tags?.includes('waiting');
    }),
    someday: reminders.filter(r => {
      if (r.completed) return false;
      return r.tags?.includes('someday');
    }),
    active: reminders.filter(r => {
      if (r.completed) return false;
      if (r.tags?.includes('someday')) return false;
      if (r.tags?.includes('waiting')) return false;
      return true;
    })
  };
}

module.exports = {
  loadRemindersCache,
  parseGTDElements,
  categorizeReminders,
  extractTags
};


