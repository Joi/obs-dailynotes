#!/usr/bin/env node

/**
 * GTD Dashboard Generator - Radically Simple
 * Reads from Apple Reminders (read-only) and creates project dashboard in Obsidian
 */

const fs = require('fs');
const path = require('path');
const gtdService = require('../services/gtdService');

// Configuration from environment
const DAILY_NOTE_PATH = (process.env.DAILY_NOTE_PATH || '/Users/joi/switchboard/dailynote').replace('~', process.env.HOME);
const VAULT_ROOT = path.resolve(DAILY_NOTE_PATH, '..');
const DASHBOARD_PATH = path.join(VAULT_ROOT, 'GTD Dashboard.md');

/**
 * Check task status based on due date
 */
function getTaskStatus(task) {
  if (!task.dueDate) return 'active';

  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  if (due.toDateString() === today.toDateString()) return 'today';
  if (due < tomorrow) return 'overdue';
  if (due <= weekFromNow) return 'thisWeek';
  return 'future';
}

/**
 * Extract project name from tags
 */
function extractProject(tags) {
  if (!tags) return null;
  const projectTag = tags.find(t => t?.startsWith('project:'));
  return projectTag ? projectTag.replace('project:', '') : null;
}

/**
 * Generate dashboard markdown
 */
function generateDashboard(reminders) {
  const now = new Date();
  const active = reminders.filter(r => !r.completed && !r.tags?.includes('someday'));

  // Group by project
  const byProject = {};
  const noProject = [];

  active.forEach(task => {
    const project = extractProject(task.tags);
    if (project) {
      if (!byProject[project]) {
        byProject[project] = {
          today: 0,
          thisWeek: 0,
          future: 0,
          active: 0,
          overdue: 0
        };
      }
      const status = getTaskStatus(task);
      byProject[project][status] = (byProject[project][status] || 0) + 1;
    } else {
      noProject.push(task);
    }
  });

  // Group by context
  const byContext = {};
  active.forEach(task => {
    const match = task.title.match(/@(\w+)/);
    const context = match ? match[1] : null;
    if (context) {
      byContext[context] = (byContext[context] || 0) + 1;
    }
  });

  // Count by status
  const statusCounts = {
    today: 0,
    thisWeek: 0,
    future: 0,
    someday: reminders.filter(r => !r.completed && r.tags?.includes('someday')).length
  };

  active.forEach(task => {
    const status = getTaskStatus(task);
    if (status === 'today') statusCounts.today++;
    else if (status === 'thisWeek') statusCounts.thisWeek++;
    else if (status === 'future') statusCounts.future++;
  });

  // Build markdown
  let markdown = `# GTD Dashboard\n\n`;
  markdown += `Updated: ${now.toLocaleString()}\n\n`;

  // Active Projects
  markdown += `## Active Projects\n\n`;
  const projects = Object.keys(byProject).sort();

  if (projects.length > 0) {
    projects.forEach(project => {
      const stats = byProject[project];
      const total = Object.values(stats).reduce((sum, n) => sum + n, 0);
      markdown += `### #project/${project} (${total} tasks)\n`;

      const details = [];
      if (stats.overdue > 0) details.push(`${stats.overdue} overdue ⚠️`);
      if (stats.today > 0) details.push(`${stats.today} due today`);
      if (stats.thisWeek > 0) details.push(`${stats.thisWeek} this week`);
      if (stats.future > 0) details.push(`${stats.future} future`);
      if (stats.active > 0) details.push(`${stats.active} active`);

      details.forEach(detail => {
        markdown += `- ${detail}\n`;
      });
      markdown += '\n';
    });
  } else {
    markdown += `*No active projects*\n\n`;
  }

  // Tasks without projects
  if (noProject.length > 0) {
    markdown += `### Unassigned (${noProject.length} tasks)\n`;
    markdown += `- Consider assigning these to projects\n\n`;
  }

  // By Context
  markdown += `## By Context\n\n`;
  const contexts = Object.keys(byContext).sort();

  if (contexts.length > 0) {
    contexts.forEach(context => {
      markdown += `### @${context}: ${byContext[context]} tasks\n`;
    });
  } else {
    markdown += `*No context tags found*\n`;
  }
  markdown += '\n';

  // By Status
  markdown += `## By Status\n\n`;
  markdown += `### Due Today: ${statusCounts.today} tasks\n`;
  markdown += `### This Week: ${statusCounts.thisWeek} tasks\n`;
  markdown += `### Future: ${statusCounts.future} tasks\n`;
  markdown += `### Someday/Maybe: ${statusCounts.someday} tasks\n\n`;

  // Quick Actions
  markdown += `## Quick Actions\n\n`;
  markdown += `- [[GTD/inbox|📥 Process Inbox]]\n`;
  markdown += `- [[GTD/next-actions|⏭️ View Next Actions]]\n`;
  markdown += `- [[GTD/waiting-for|⏸️ Check Waiting For]]\n`;
  markdown += `- [[GTD/scheduled|📅 Review Scheduled]]\n`;

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
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { generateDashboard };