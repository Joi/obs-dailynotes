#!/usr/bin/env node

/**
 * GTD Dashboard Generator - Redesigned for Action
 * Shows actual tasks (not stats) following ruthless simplicity
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const gtdService = require('../services/gtdService');

// Configuration from environment
const DAILY_NOTE_PATH = (process.env.DAILY_NOTE_PATH || '/Users/joi/switchboard/dailynote').replace('~', process.env.HOME);
const VAULT_ROOT = path.resolve(DAILY_NOTE_PATH, '..');
const DASHBOARD_PATH = path.join(VAULT_ROOT, 'GTD Dashboard.md');

/**
 * Extract project name from tags
 */
function extractProject(tags) {
  if (!tags) return null;
  const projectTag = tags.find(t => t?.startsWith('project:'));
  return projectTag ? projectTag.replace('project:', '') : null;
}

/**
 * Format task for display
 */
function formatTask(task, options = {}) {
  let title = task.title;

  // Remove tags for cleaner display (optional)
  if (options.removeTags) {
    title = title.replace(/#[A-Za-z0-9_:-]+/g, '').trim();
  }

  // Add due date
  if (task.dueDate && !title.includes('📅')) {
    const due = new Date(task.dueDate);
    const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    title += ` (due ${formatted})`;
  }

  // Add priority indicator at start
  let prefix = '';
  if (task.title.includes('!!')) prefix = '⚠️ ';
  else if (task.title.includes('!')) prefix = '❗';

  // Add person if from shared list
  if (task.list && task.list.includes('/')) {
    const person = task.list.split('/')[1].replace(' To Do', '');
    title += ` (${person})`;
  }

  return `- [ ] ${prefix}${title}`;
}

/**
 * Get tasks due today or this week
 */
function getTasksByTimeframe(reminders) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const active = reminders.filter(r =>
    !r.completed &&
    !r.tags?.includes('someday') &&
    !r.tags?.includes('waiting')
  );

  const dueToday = active.filter(r => {
    if (!r.dueDate) return false;
    const due = new Date(r.dueDate);
    return due.toDateString() === today.toDateString();
  });

  const dueThisWeek = active.filter(r => {
    if (!r.dueDate) return false;
    const due = new Date(r.dueDate);
    return due > today && due <= weekFromNow;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const noDate = active.filter(r => !r.dueDate);

  return { dueToday, dueThisWeek, noDate, active };
}

/**
 * Get project statistics
 */
function getProjectStats(reminders) {
  const active = reminders.filter(r => !r.completed && !r.tags?.includes('someday'));
  const projects = {};

  active.forEach(task => {
    const project = extractProject(task.tags);
    if (!project) return;

    if (!projects[project]) {
      projects[project] = { total: 0, thisWeek: 0, waiting: 0, future: 0, today: 0 };
    }

    projects[project].total++;

    if (task.tags?.includes('waiting')) {
      projects[project].waiting++;
    } else if (task.dueDate) {
      const due = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      if (due.toDateString() === today.toDateString()) {
        projects[project].today++;
      } else if (due <= weekFromNow) {
        projects[project].thisWeek++;
      } else {
        projects[project].future++;
      }
    }
  });

  return projects;
}

/**
 * Generate dashboard markdown
 */
function generateDashboard(reminders) {
  const now = new Date();
  const { dueToday, dueThisWeek, noDate, active } = getTasksByTimeframe(reminders);

  let markdown = `# GTD Dashboard\n\n`;
  markdown += `*Updated: ${now.toLocaleString()}*\n\n`;

  // 1. TODAY'S NEXT ACTIONS (3-5 most important)
  markdown += `## 🎯 Today's Next Actions\n\n`;

  const nextActions = [
    ...dueToday,
    ...dueThisWeek.slice(0, 2),
    ...noDate.filter(t => t.title.includes('!')).slice(0, 2)
  ].slice(0, 5);

  if (nextActions.length > 0) {
    nextActions.forEach(task => {
      markdown += formatTask(task) + '\n';
    });
  } else {
    markdown += `*No urgent actions - check Inbox or This Week*\n`;
  }
  markdown += '\n';

  // 2. THIS WEEK (all tasks due this week)
  if (dueThisWeek.length > 0) {
    markdown += `## 📋 This Week (${dueThisWeek.length} tasks)\n\n`;
    dueThisWeek.slice(0, 10).forEach(task => {
      markdown += formatTask(task) + '\n';
    });
    if (dueThisWeek.length > 10) {
      markdown += `\n*... and ${dueThisWeek.length - 10} more*\n`;
    }
    markdown += '\n';
  }

  // 2.5 COMING UP (next 2-4 weeks)
  const comingUp = active.filter(r => {
    if (!r.dueDate) return false;
    const due = new Date(r.dueDate);
    const weekFromNow = new Date();
    weekFromNow.setHours(0, 0, 0, 0);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const monthFromNow = new Date();
    monthFromNow.setDate(monthFromNow.getDate() + 30);
    return due > weekFromNow && due <= monthFromNow;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (comingUp.length > 0) {
    markdown += `## 📅 Coming Up (next 2-4 weeks)\n\n`;
    comingUp.slice(0, 10).forEach(task => {
      markdown += formatTask(task) + '\n';
    });
    if (comingUp.length > 10) {
      markdown += `\n*... and ${comingUp.length - 10} more*\n`;
    }
    markdown += '\n';
  }

  // 3. INBOX (needs processing)
  const inbox = reminders.filter(r => r.list === 'Inbox' && !r.completed);
  markdown += `## 📥 Inbox (${inbox.length} items)\n\n`;

  if (inbox.length > 0) {
    const inboxNonSomeday = inbox.filter(r => !r.tags?.includes('someday'));
    const showCount = Math.min(10, inboxNonSomeday.length);

    inboxNonSomeday.slice(0, showCount).forEach(task => {
      markdown += formatTask(task) + '\n';
    });

    if (inboxNonSomeday.length > showCount) {
      markdown += `\n*... and ${inboxNonSomeday.length - showCount} more items*\n`;
    }

    markdown += `\n*Process during weekly review: Add dates or #someday tag*\n`;
  } else {
    markdown += `*Inbox empty - nice!*\n`;
  }
  markdown += '\n';

  // 4. WAITING FOR
  const waiting = reminders.filter(r => r.tags?.includes('waiting') && !r.completed);
  if (waiting.length > 0) {
    markdown += `## ⏸️ Waiting For (${waiting.length} items)\n\n`;
    waiting.forEach(task => {
      markdown += formatTask(task) + '\n';
    });
    markdown += '\n';
  }

  // 5. ACTIVE PROJECTS (stats only)
  const projects = getProjectStats(reminders);
  if (Object.keys(projects).length > 0) {
    markdown += `## 🗂️ Active Projects\n\n`;
    Object.entries(projects).sort((a, b) => b[1].total - a[1].total).forEach(([name, stats]) => {
      markdown += `### #project/${name} (${stats.total} tasks)\n`;
      const details = [];
      if (stats.today > 0) details.push(`${stats.today} due today`);
      if (stats.thisWeek > 0) details.push(`${stats.thisWeek} this week`);
      if (stats.waiting > 0) details.push(`${stats.waiting} waiting`);
      if (stats.future > 0) details.push(`${stats.future} future`);

      if (details.length > 0) {
        markdown += `- ${details.join(', ')}\n`;
      }
      markdown += '\n';
    });
  }

  // 6. SOMEDAY (show count, hide details to reduce noise)
  const someday = reminders.filter(r => r.tags?.includes('someday') && !r.completed);
  if (someday.length > 0) {
    markdown += `## 💭 Someday/Maybe (${someday.length} items)\n\n`;
    markdown += `*Review during weekly review - not actionable right now*\n\n`;

    // Show first 5 as preview
    someday.slice(0, 5).forEach(task => {
      markdown += formatTask(task) + '\n';
    });

    if (someday.length > 5) {
      markdown += `\n*... and ${someday.length - 5} more someday items*\n`;
    }
    markdown += '\n';
  }

  // 7. QUICK STATS (at bottom)
  const unassigned = active.filter(r => !extractProject(r.tags));

  markdown += `---\n\n`;
  markdown += `## 📊 Stats\n\n`;
  markdown += `- **Total active**: ${active.length} tasks\n`;
  markdown += `- **Unassigned to projects**: ${unassigned.length} tasks\n`;
  if (unassigned.length > 20) {
    markdown += `  - *This is OK - assign projects during weekly review as patterns emerge*\n`;
  }
  markdown += `- **Someday/Maybe**: ${someday.length} tasks\n`;

  // Person lists summary
  const personLists = {};
  reminders.forEach(r => {
    if (r.list && r.list.includes('/') && !r.completed) {
      personLists[r.list] = (personLists[r.list] || 0) + 1;
    }
  });

  if (Object.keys(personLists).length > 0) {
    markdown += `- **Person lists**: ${Object.entries(personLists).map(([list, count]) => `${list} (${count})`).join(', ')}\n`;
  }

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Generating GTD dashboard...');

  // Load reminders from cache
  const reminders = gtdService.loadRemindersCache();
  console.log(`  Found ${reminders.length} total reminders`);

  // Generate dashboard
  const dashboard = generateDashboard(reminders);

  // Write dashboard file
  fs.writeFileSync(DASHBOARD_PATH, dashboard);
  console.log(`✅ Dashboard written to: ${DASHBOARD_PATH}`);
  console.log(`📂 Open with: work dash`);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { generateDashboard };
