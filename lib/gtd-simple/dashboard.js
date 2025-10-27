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

// Import presentations and reading modules
let presentations, reading;
try {
  presentations = require('../../tools/lib/presentations');
  reading = require('../../tools/lib/reading');
} catch (err) {
  // Modules might not exist yet, gracefully degrade
  presentations = null;
  reading = null;
}

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

  // Detect and format file paths as links
  const filePathRegex = /(\/Users\/[^\s]+\.(?:pdf|docx?|xlsx?|pptx?|txt|md))/gi;
  const filePaths = title.match(filePathRegex);

  if (filePaths) {
    filePaths.forEach(filePath => {
      const filename = path.basename(filePath);
      // Replace file path with clickable link
      title = title.replace(filePath, `[${filename}](file://${filePath})`);
    });
  }

  // Detect and format URLs as links (if not already linked)
  if (!title.includes('](http') && !title.includes('](file://')) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = title.match(urlRegex);

    if (urls) {
      urls.forEach(url => {
        // Extract domain for link text
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace('www.', '');
          title = title.replace(url, `[link](${url})`);
        } catch (e) {
          // If URL parsing fails, just make it clickable
          title = title.replace(url, `[link](${url})`);
        }
      });
    }
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
async function generateDashboard(reminders) {
  const now = new Date();
  const { dueToday, dueThisWeek, noDate, active } = getTasksByTimeframe(reminders);

  let markdown = `# GTD Dashboard\n\n`;
  markdown += `*Updated: ${now.toLocaleString()}*\n`;

  // Show cache age warning
  const cachePath = path.join(VAULT_ROOT, 'reminders', 'reminders_cache.json');
  try {
    const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    if (cacheData.timestamp) {
      const cacheDate = new Date(cacheData.timestamp);
      const ageHours = Math.floor((now - cacheDate) / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);
      if (ageHours > 24) {
        markdown += `*⚠️ Cache is ${ageDays} days old - data may be stale*\n`;
      } else if (ageHours > 2) {
        markdown += `*Cache is ${ageHours} hours old*\n`;
      }
    }
  } catch (err) {
    // Ignore if can't read cache
  }

  markdown += '\n';

  // 0. WORK MATERIALS (presentations + reading)
  let hasWorkMaterials = false;

  // Presentations section
  if (presentations) {
    try {
      const presList = await presentations.listPresentations({ all: false });
      const presStats = await presentations.getStats();

      if (presList.length > 0) {
        if (!hasWorkMaterials) {
          markdown += `## 📊 Work Materials\n\n`;
          hasWorkMaterials = true;
        }

        markdown += `### 🎤 Presentations (${presStats.inProgress + presStats.planned} active)\n\n`;

        const urgent = presList.filter(p => {
          if (p.status === 'archived' || p.status === 'completed') return false;
          const days = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24)) : null;
          return p.priority === 'urgent' || p.priority === 'high' || (days !== null && days <= 7);
        });

        const inProgress = presList.filter(p => p.status === 'in-progress');
        const planned = presList.filter(p => p.status === 'planned' && !urgent.includes(p));

        if (urgent.length > 0) {
          urgent.slice(0, 3).forEach(p => {
            const dueStr = p.deadline ? ` (due ${p.deadline})` : '';
            markdown += `- 🔴 [[${p.title}]]${dueStr}\n`;
          });
        }
        if (inProgress.length > 0) {
          const showCount = Math.min(3 - urgent.length, inProgress.length);
          inProgress.slice(0, showCount).forEach(p => {
            const dueStr = p.deadline ? ` (due ${p.deadline})` : '';
            markdown += `- 🟡 [[${p.title}]]${dueStr}\n`;
          });
        }
        // Show planned presentations too
        if (planned.length > 0 && (urgent.length + inProgress.length) < 3) {
          planned.slice(0, 3 - urgent.length - inProgress.length).forEach(p => {
            const dueStr = p.deadline ? ` (due ${p.deadline})` : '';
            markdown += `- 📋 [[${p.title}]]${dueStr}\n`;
          });
        }

        if (presList.length > 3) {
          markdown += `\n*... and ${presList.length - 3} more presentations*\n`;
        }
        markdown += '\n';
      }
    } catch (err) {
      // Ignore if presentations module fails
    }
  }

  // Reading queue section
  if (reading) {
    try {
      const readingList = await reading.listReading({ all: false });
      const readStats = await reading.getStats();

      if (readingList.length > 0) {
        if (!hasWorkMaterials) {
          markdown += `## 📊 Work Materials\n\n`;
          hasWorkMaterials = true;
        }

        markdown += `### 📚 Reading Queue (${readStats.toRead + readStats.reading} items)\n\n`;

        const urgent = readingList.filter(i => {
          if (i.status === 'archived' || i.status === 'read') return false;
          const days = i.deadline ? Math.ceil((new Date(i.deadline) - new Date()) / (1000*60*60*24)) : null;
          return i.priority === 'urgent' || i.priority === 'high' || (days !== null && days <= 7);
        });

        const currentlyReading = readingList.filter(i => i.status === 'reading');
        const toRead = readingList.filter(i => i.status === 'to-read' && !urgent.includes(i));

        if (urgent.length > 0) {
          urgent.slice(0, 3).forEach(i => {
            const icon = i.type === 'pdf' ? '📄' : '🔗';
            markdown += `- 🔥 ${icon} [[${i.title}]] (due ${i.deadline})\n`;
          });
        }
        if (currentlyReading.length > 0) {
          currentlyReading.slice(0, 3).forEach(i => {
            const icon = i.type === 'pdf' ? '📄' : '🔗';
            // For URLs, link directly
            if (i.type === 'url' && i.url) {
              markdown += `- 📖 ${icon} [${i.title}](${i.url})\n`;
            } else {
              markdown += `- 📖 ${icon} [[${i.title}]]\n`;
            }
          });
        }
        // Show first few to-read items
        if (toRead.length > 0 && (urgent.length + currentlyReading.length) < 3) {
          toRead.slice(0, 3 - urgent.length - currentlyReading.length).forEach(i => {
            const icon = i.type === 'pdf' ? '📄' : '🔗';
            const estStr = i.estimatedMinutes ? ` (~${i.estimatedMinutes}min)` : '';
            // For URLs, link directly. For PDFs, use wiki link
            if (i.type === 'url' && i.url) {
              markdown += `- ${icon} [${i.title}](${i.url})${estStr}\n`;
            } else {
              markdown += `- ${icon} [[${i.title}]]${estStr}\n`;
            }
          });
        }

        if (readingList.length > 3) {
          markdown += `\n*... and ${readingList.length - 3} more items*\n`;
        }
        markdown += '\n';
      }
    } catch (err) {
      // Ignore if reading module fails
    }
  }

  if (hasWorkMaterials) {
    markdown += `---\n\n`;
  }

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

  // Generate dashboard (now async)
  const dashboard = await generateDashboard(reminders);

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
