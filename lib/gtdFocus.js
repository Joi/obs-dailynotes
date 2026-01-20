/**
 * GTD Focus Section Builder
 * 
 * Builds a "Focus" section for the daily note showing:
 * - Flagged items (!! urgent)
 * - High priority items (priority 1)
 * - Due today
 * - Overdue items
 */

const path = require('path');
const { loadRemindersCache } = require('./services/gtdService');

/**
 * Check if a date is today
 * @param {string|Date} dateStr - Date to check
 * @returns {boolean}
 */
function isToday(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Check if a date is before today (overdue)
 * @param {string|Date} dateStr - Date to check
 * @returns {boolean}
 */
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date is within this week
 * @param {string|Date} dateStr - Date to check
 * @returns {boolean}
 */
function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  return date <= endOfWeek && date >= today;
}

/**
 * Format a due date for display
 * @param {string|Date} dateStr - Date to format
 * @returns {string}
 */
function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  
  if (isToday(dateStr)) {
    return 'today';
  }
  
  if (isOverdue(dateStr)) {
    const days = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    return `${days}d overdue`;
  }
  
  // Format as "Jan 10"
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get focus items from reminders
 * @param {Array} reminders - All reminders from cache
 * @returns {Object} - Categorized focus items
 */
function getFocusItems(reminders) {
  const focus = {
    urgent: [],      // Flagged or has !! in title
    highPriority: [], // Priority 1
    dueToday: [],    // Due today
    overdue: [],     // Past due
    thisWeek: []     // Due this week (not today)
  };

  for (const r of reminders) {
    if (r.completed) continue;

    const isUrgent = r.flagged || (r.title && r.title.includes('!!'));
    const isHighPri = r.priority === 1;
    const dueToday = isToday(r.dueDate);
    const overdue = isOverdue(r.dueDate);
    const thisWeek = isThisWeek(r.dueDate) && !dueToday;

    // Categorize (item can appear in multiple categories)
    if (isUrgent) {
      focus.urgent.push(r);
    } else if (isHighPri) {
      focus.highPriority.push(r);
    }

    if (overdue) {
      focus.overdue.push(r);
    } else if (dueToday) {
      focus.dueToday.push(r);
    } else if (thisWeek) {
      focus.thisWeek.push(r);
    }
  }

  return focus;
}

/**
 * Format a reminder as a markdown task
 * @param {Object} r - Reminder object
 * @param {boolean} showDue - Whether to show due date
 * @returns {string}
 */
function formatTask(r, showDue = true) {
  let line = `- [ ] ${r.title}`;
  
  if (r.list && r.list !== 'Inbox') {
    line += ` *(${r.list})*`;
  }
  
  if (showDue && r.dueDate) {
    const dueStr = formatDueDate(r.dueDate);
    if (dueStr) {
      line += ` — ${dueStr}`;
    }
  }
  
  // Add reminder ID as HTML comment for potential completion sync
  line += ` <!--reminders-id:${r.id}-->`;
  
  return line;
}

/**
 * Build the GTD Focus section for daily note
 * @param {string} dailyDir - Path to daily notes directory
 * @returns {string} - Markdown section content
 */
function buildGTDFocusSection(dailyDir) {
  const reminders = loadRemindersCache(dailyDir);
  
  if (!reminders || reminders.length === 0) {
    return '';
  }

  const focus = getFocusItems(reminders);
  const lines = ['', '## ⚡ Focus'];

  // Urgent items (flagged or !!)
  if (focus.urgent.length > 0) {
    lines.push('### 🔴 Urgent');
    for (const r of focus.urgent) {
      lines.push(formatTask(r));
    }
  }

  // Overdue items
  if (focus.overdue.length > 0) {
    lines.push('### ⚠️ Overdue');
    for (const r of focus.overdue.slice(0, 5)) { // Limit to 5
      lines.push(formatTask(r));
    }
    if (focus.overdue.length > 5) {
      lines.push(`*...and ${focus.overdue.length - 5} more overdue items*`);
    }
  }

  // Due today
  if (focus.dueToday.length > 0) {
    lines.push('### 📅 Due Today');
    for (const r of focus.dueToday) {
      lines.push(formatTask(r, false)); // Don't show "today" - redundant
    }
  }

  // High priority (if not already in urgent)
  const highPriNotUrgent = focus.highPriority.filter(
    r => !focus.urgent.some(u => u.id === r.id)
  );
  if (highPriNotUrgent.length > 0) {
    lines.push('### ❗ High Priority');
    for (const r of highPriNotUrgent) {
      lines.push(formatTask(r));
    }
  }

  // This week (compact)
  if (focus.thisWeek.length > 0) {
    lines.push('### 📆 This Week');
    for (const r of focus.thisWeek.slice(0, 5)) { // Limit to 5
      lines.push(formatTask(r));
    }
    if (focus.thisWeek.length > 5) {
      lines.push(`*...and ${focus.thisWeek.length - 5} more this week*`);
    }
  }

  // If nothing in focus, say so
  if (lines.length === 2) {
    lines.push('*No urgent, overdue, or due-today items. Check [[GTD Dashboard]] for next actions.*');
  }

  return lines.join('\n');
}

module.exports = {
  buildGTDFocusSection,
  getFocusItems,
  isToday,
  isOverdue,
  isThisWeek,
  formatDueDate
};
