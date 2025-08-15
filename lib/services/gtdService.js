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

// Reuse categorization logic from existing tool to avoid drift
const legacy = require('../../tools/processGTD.js');

module.exports = {
  loadRemindersCache,
  parseGTDElements: legacy.parseGTDElements,
  categorizeReminders: legacy.categorizeReminders,
};


