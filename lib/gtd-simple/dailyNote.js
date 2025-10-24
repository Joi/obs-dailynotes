#!/usr/bin/env node

/**
 * GTD Daily Note Generator - Radically Simple
 * Reads from Apple Reminders (read-only) and creates daily GTD view in Obsidian
 */

const fs = require('fs');
const path = require('path');
const gtdService = require('../services/gtdService');

// Configuration from environment
const DAILY_NOTE_PATH = (process.env.DAILY_NOTE_PATH || '/Users/joi/switchboard/dailynote').replace('~', process.env.HOME);

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a task is due today
 */
function isDueToday(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  return due.toDateString() === today.toDateString();
}

/**
 * Extract context from title (e.g., @work, @home)
 */
function extractContext(title) {
  const match = title.match(/@(\w+)/);
  return match ? match[1] : 'uncategorized';
}

/**
 * Format a task as markdown checkbox
 */
function formatTask(task) {
  let line = `- [ ] ${task.title}`;

  // Add project tag if present
  const projectTag = task.tags?.find(t => t?.startsWith('project:'));
  if (projectTag) {
    line += ` #${projectTag}`;
  }

  // Add area tag if present
  const areaTag = task.tags?.find(t => t?.startsWith('area:'));
  if (areaTag) {
    line += ` #${areaTag}`;
  }

  return line;
}

/**
 * Generate GTD tasks section for daily note
 */
function generateGTDSection(reminders) {
  // Filter for today's tasks (due today or no due date + not someday)
  const todayTasks = reminders.filter(r => {
    if (r.completed) return false;
    const hasSomeday = r.tags?.includes('someday');
    if (hasSomeday) return false;

    // Include if due today OR has no due date (current actions)
    return isDueToday(r.dueDate) || !r.dueDate;
  });

  if (todayTasks.length === 0) {
    return '## Tasks for Today\n\n*No tasks for today*\n';
  }

  // Group by context
  const byContext = {};
  todayTasks.forEach(task => {
    const context = extractContext(task.title);
    if (!byContext[context]) {
      byContext[context] = [];
    }
    byContext[context].push(task);
  });

  // Build markdown sections
  let markdown = '## Tasks for Today\n\n';

  // Sort contexts: specific ones first, then uncategorized
  const contexts = Object.keys(byContext).sort((a, b) => {
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    return a.localeCompare(b);
  });

  contexts.forEach(context => {
    const contextLabel = context === 'uncategorized' ? 'Tasks' : `@${context}`;
    markdown += `### ${contextLabel}\n`;
    byContext[context].forEach(task => {
      markdown += formatTask(task) + '\n';
    });
    markdown += '\n';
  });

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log('📝 Generating GTD daily note section...');

  // Load reminders from cache
  const reminders = gtdService.loadRemindersCache();
  console.log(`  Found ${reminders.length} total reminders`);

  // Generate GTD section
  const gtdSection = generateGTDSection(reminders);

  // Get today's daily note path
  const today = getTodayDate();
  const dailyNotePath = path.join(DAILY_NOTE_PATH, `${today}.md`);

  // Check if daily note exists
  if (!fs.existsSync(dailyNotePath)) {
    // Create new daily note with GTD section
    const content = `# ${today}\n\n${gtdSection}`;
    fs.writeFileSync(dailyNotePath, content);
    console.log(`✅ Created daily note: ${dailyNotePath}`);
  } else {
    // Read existing content
    let content = fs.readFileSync(dailyNotePath, 'utf8');

    // Check if GTD section already exists
    if (content.includes('## Tasks for Today')) {
      // Replace existing section
      const sectionStart = content.indexOf('## Tasks for Today');
      const nextSection = content.indexOf('\n## ', sectionStart + 1);

      if (nextSection !== -1) {
        content = content.substring(0, sectionStart) + gtdSection + content.substring(nextSection);
      } else {
        content = content.substring(0, sectionStart) + gtdSection;
      }
    } else {
      // Append GTD section after first heading
      const firstHeadingEnd = content.indexOf('\n\n');
      if (firstHeadingEnd !== -1) {
        content = content.substring(0, firstHeadingEnd + 2) + gtdSection + '\n' + content.substring(firstHeadingEnd + 2);
      } else {
        content += '\n\n' + gtdSection;
      }
    }

    fs.writeFileSync(dailyNotePath, content);
    console.log(`✅ Updated daily note: ${dailyNotePath}`);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { generateGTDSection };