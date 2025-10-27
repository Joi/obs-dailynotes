#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const presentations = require('../lib/presentations');

const GTD_DIR = path.join(__dirname, '../../GTD');
const DASHBOARD_FILE = path.join(GTD_DIR, 'presentations.md');

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toISOString().slice(0, 10);
}

/**
 * Calculate days until deadline
 */
function daysUntil(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

/**
 * Generate presentations dashboard
 */
async function generateDashboard() {
  const presList = await presentations.listPresentations({ all: false });
  const stats = await presentations.getStats();

  let content = '# Presentations Dashboard\n\n';
  content += '*Generated: ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '*\n\n';

  // Summary
  content += '## Summary\n';
  content += '- **Active**: ' + (stats.inProgress + stats.planned) + ' presentations\n';
  content += '- **Completed this month**: ' + stats.completed + '\n';
  if (stats.urgent > 0) {
    content += '- **Urgent**: ' + stats.urgent + '\n';
  }
  if (stats.overdue > 0) {
    content += '- **  Overdue**: ' + stats.overdue + '\n';
  }
  content += '\n---\n\n';

  // Group by status
  const byStatus = {
    'in-progress': [],
    'planned': [],
    'completed': []
  };

  presList.forEach(p => {
    if (byStatus[p.status]) {
      byStatus[p.status].push(p);
    }
  });

  // Urgent section (high priority + deadline soon)
  const urgentItems = presList.filter(p => {
    if (p.status === 'archived' || p.status === 'completed') return false;
    const days = daysUntil(p.deadline);
    return (p.priority === 'urgent' || p.priority === 'high') || (days !== null && days <= 7);
  });

  if (urgentItems.length > 0) {
    content += '## =4 URGENT - Due This Week\n\n';
    urgentItems.forEach(p => {
      content += formatPresentation(p, true);
    });
  }

  // In Progress
  if (byStatus['in-progress'].length > 0) {
    content += '## =á IN PROGRESS\n\n';
    byStatus['in-progress'].forEach(p => {
      if (!urgentItems.includes(p)) {
        content += formatPresentation(p);
      }
    });
  }

  // Planned
  if (byStatus['planned'].length > 0) {
    content += '## =â PLANNED\n\n';
    byStatus['planned'].forEach(p => {
      if (!urgentItems.includes(p)) {
        content += formatPresentation(p);
      }
    });
  }

  // Recently completed
  if (byStatus['completed'].length > 0) {
    content += '##  RECENTLY COMPLETED\n\n';
    byStatus['completed'].forEach(p => {
      content += formatPresentation(p, false, true);
    });
  }

  // Commands reference
  content += '\n---\n\n';
  content += '## =¡ Quick Commands\n\n';
  content += '```bash\n';
  content += '# Add new presentation\n';
  content += 'work pres add <url> --title "..." --deadline YYYY-MM-DD\n\n';
  content += '# Start working (copy ID from above)\n';
  content += 'work pres start <id>\n\n';
  content += '# Mark complete\n';
  content += 'work pres complete <id>\n\n';
  content += '# List all\n';
  content += 'work pres list\n\n';
  content += '# Interactive menu\n';
  content += 'work pres\n';
  content += '```\n';

  // Write file
  await fs.mkdir(GTD_DIR, { recursive: true });
  await fs.writeFile(DASHBOARD_FILE, content, 'utf-8');

  return { count: presList.length, file: DASHBOARD_FILE };
}

/**
 * Format single presentation for dashboard
 */
function formatPresentation(p, showWarnings = false, isCompleted = false) {
  let content = '### [[' + p.title + ']]\n';
  content += '- **ID**: `' + p.id + '`\n';
  content += '- **Status**: ' + capitalize(p.status);

  if (p.status === 'in-progress' && p.startedDate) {
    const started = formatDate(p.startedDate);
    content += ' (started ' + started + ')';
  }

  content += '\n';

  if (p.deadline) {
    const days = daysUntil(p.deadline);
    let deadlineStr = '- **Due**: ' + p.deadline;
    if (days !== null) {
      if (days < 0) {
        deadlineStr += '   **OVERDUE**';
      } else if (days <= 7 && showWarnings) {
        deadlineStr += ' (' + days + ' days) =%';
      } else {
        deadlineStr += ' (' + days + ' days)';
      }
    }
    content += deadlineStr + '\n';
  }

  content += '- **Priority**: ' + capitalize(p.priority) + '\n';

  if (p.estimatedHours) {
    content += '- **Estimated**: ' + p.estimatedHours + ' hours';
    if (p.actualHours > 0) {
      content += ' | **Actual**: ' + p.actualHours + ' hours';
    }
    content += '\n';
  }

  content += '- **Links**:\n';
  content += '  - [<¤ Open Slides](' + p.url + ')\n';
  if (p.notionUrl) {
    content += '  - [=Ý Open Brief](' + p.notionUrl + ')\n';
  }

  if (p.tags.length > 0) {
    content += '- **Tags**: ' + p.tags.map(t => '#' + t).join(', ') + '\n';
  }

  if (p.notes) {
    content += '- **Notes**: ' + p.notes + '\n';
  }

  if (isCompleted && p.completedDate) {
    content += '- **Completed**: ' + formatDate(p.completedDate) + '\n';
  }

  content += '\n---\n\n';

  return content;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run if called directly
if (require.main === module) {
  generateDashboard()
    .then(result => {
      console.log(' Generated presentations dashboard');
      console.log('   Presentations: ' + result.count);
      console.log('   File: ' + result.file);
    })
    .catch(err => {
      console.error('L Error:', err.message);
      process.exit(1);
    });
}

module.exports = { generateDashboard };
