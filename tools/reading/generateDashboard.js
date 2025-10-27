#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const reading = require('../lib/reading');

const GTD_DIR = path.join(__dirname, '../../GTD');
const DASHBOARD_FILE = path.join(GTD_DIR, 'reading-queue.md');

/**
 * Format date
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toISOString().slice(0, 10);
}

/**
 * Days until deadline
 */
function daysUntil(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

/**
 * Generate reading queue dashboard
 */
async function generateDashboard() {
  const items = await reading.listReading({ all: false });
  const stats = await reading.getStats();

  let content = '# Reading Queue\n\n';
  content += '*Generated: ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '*\n\n';

  // Summary
  content += '## Summary\n';
  content += '- **To Read**: ' + stats.toRead + ' items\n';
  content += '- **Currently Reading**: ' + stats.reading + ' items\n';
  content += '- **Read this month**: ' + stats.read + ' items\n';
  content += '- **URLs**: ' + stats.urls + ' | **PDFs**: ' + stats.pdfs + '\n';
  content += '\n---\n\n';

  // Group by status
  const byStatus = {
    'reading': [],
    'to-read': [],
    'read': []
  };

  items.forEach(i => {
    if (byStatus[i.status]) {
      byStatus[i.status].push(i);
    }
  });

  // Urgent section
  const urgentItems = items.filter(i => {
    if (i.status === 'archived' || i.status === 'read') return false;
    const days = daysUntil(i.deadline);
    return (i.priority === 'urgent' || i.priority === 'high') || (days !== null && days <= 7);
  });

  if (urgentItems.length > 0) {
    content += '## 🔥 Priority Reading\n\n';
    urgentItems.forEach(i => {
      content += formatItem(i, true);
    });
  }

  // Currently Reading
  if (byStatus['reading'].length > 0) {
    content += '## 📖 Currently Reading\n\n';
    byStatus['reading'].forEach(i => {
      content += formatItem(i);
    });
  }

  // To Read
  if (byStatus['to-read'].length > 0) {
    content += '## 📚 To Read\n\n';
    byStatus['to-read'].forEach(i => {
      if (!urgentItems.includes(i)) {
        content += formatItem(i);
      }
    });
  }

  // Recently Read
  if (byStatus['read'].length > 0) {
    content += '## ✅ Recently Read\n\n';
    byStatus['read'].slice(0, 10).forEach(i => {
      content += formatItem(i, false, true);
    });
    if (byStatus['read'].length > 10) {
      content += `\n*... and ${byStatus['read'].length - 10} more in archive*\n\n`;
    }
  }

  // Commands reference
  content += '\n---\n\n';
  content += '## 💡 Quick Commands\n\n';
  content += '```bash\n';
  content += '# Add URL\n';
  content += 'work read add "URL" --title "..." --tags topic,theme\n\n';
  content += '# Start reading (copy ID from above)\n';
  content += 'work read start <id>\n\n';
  content += '# Finish reading\n';
  content += 'work read finish <id> --notes "Key insights..."\n\n';
  content += '# List all\n';
  content += 'work read list\n\n';
  content += '# Filter\n';
  content += 'work read list --type url\n';
  content += 'work read list --status reading\n';
  content += '```\n';

  // Write file
  await fs.mkdir(GTD_DIR, { recursive: true });
  await fs.writeFile(DASHBOARD_FILE, content, 'utf-8');

  return { count: items.length, file: DASHBOARD_FILE };
}

/**
 * Format single reading item
 */
function formatItem(item, showWarnings = false, isRead = false) {
  const typeIcon = item.type === 'pdf' ? '📄' : '🔗';
  
  let content = `### ${typeIcon} [[${item.title}]]\n`;
  content += '- **ID**: `' + item.id + '`\n';
  content += '- **Type**: ' + item.type.toUpperCase() + '\n';
  content += '- **Status**: ' + capitalize(item.status);

  if (item.status === 'reading' && item.startedDate) {
    content += ' (started ' + formatDate(item.startedDate) + ')';
  }

  content += '\n';

  if (item.deadline) {
    const days = daysUntil(item.deadline);
    let deadlineStr = '- **Due**: ' + item.deadline;
    if (days !== null) {
      if (days < 0) {
        deadlineStr += ' ⚠️ **OVERDUE**';
      } else if (days <= 7 && showWarnings) {
        deadlineStr += ' (' + days + ' days) 🔥';
      } else {
        deadlineStr += ' (' + days + ' days)';
      }
    }
    content += deadlineStr + '\n';
  }

  if (item.priority !== 'medium') {
    content += '- **Priority**: ' + capitalize(item.priority) + '\n';
  }

  if (item.estimatedMinutes) {
    content += '- **Estimated**: ' + item.estimatedMinutes + ' minutes\n';
  }

  if (item.url) {
    content += '- [🔗 Open Link](' + item.url + ')\n';
  } else if (item.path) {
    content += '- [📄 Open PDF](' + item.path + ')\n';
  }

  if (item.tags.length > 0) {
    content += '- **Tags**: ' + item.tags.map(t => '#' + t).join(', ') + '\n';
  }

  if (item.source && item.source !== 'manual') {
    content += '- **Source**: ' + item.source + '\n';
  }

  if (item.notes) {
    content += '- **Notes**: ' + item.notes + '\n';
  }

  if (isRead && item.finishedDate) {
    content += '- **Read**: ' + formatDate(item.finishedDate) + '\n';
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
      console.log('✅ Generated reading queue dashboard');
      console.log('   Items: ' + result.count);
      console.log('   File: ' + result.file);
    })
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { generateDashboard };
