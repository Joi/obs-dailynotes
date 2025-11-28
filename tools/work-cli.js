#!/usr/bin/env node

/**
 * Work CLI - Unified interface for presentations and workflow management
 *
 * PRODUCTION-READY FEATURES:
 * - All 'work pres' commands (presentations tracking - fully functional)
 * - work daily (generate daily note with calendar events)
 * - work dash (open dashboards)
 *
 * REMOVED FEATURES:
 * - GTD sync commands (scripts moved to _archived/, removed to prevent errors)
 * - Morning routine automation (depends on archived scripts)
 *
 * The presentations system is standalone and fully functional.
 * Papers tracking (Phase 2) coming soon.
 */

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get package.json for version
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// Import modules
const presentations = require('./lib/presentations');
const reading = require('./lib/reading');
const { mainMenu, presentationsMenu } = require('./lib/interactive');

program
  .name('work')
  .description('Manage presentations, papers, and GTD workflow')
  .version(pkg.version)
  .action(() => {
    // Default action when no command given
    mainMenu();
  });

// ====================
// PRESENTATIONS COMMANDS
// ====================

const pres = program.command('pres').description('Manage presentations');

// If no subcommand, show interactive menu
pres.action(async () => {
  await presentationsMenu();
});

// Add presentation
pres
  .command('add <url>')
  .description('Add a new presentation')
  .option('-t, --title <title>', 'Presentation title (required)')
  .option('-d, --deadline <date>', 'Deadline (YYYY-MM-DD)')
  .option('-p, --priority <level>', 'Priority (low|medium|high|urgent)', 'medium')
  .option('--notion <url>', 'Notion brief URL')
  .option('--slack <url>', 'Slack conversation URL')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--notes <text>', 'Additional notes')
  .option('--estimate <hours>', 'Estimated hours', parseFloat)
  .action(async (url, options) => {
    try {
      const pres = await presentations.addPresentation(url, options);
      console.log(chalk.green('\n✅ Presentation created!\n'));
      console.log('ID: ' + chalk.bold(pres.id));
      console.log('Title: ' + pres.title);
      console.log('Status: ' + pres.status);
      if (pres.deadline) console.log('Deadline: ' + pres.deadline);
      if (pres.notionUrl) console.log('Notion: ✓');
      console.log('\nRun: ' + chalk.cyan('work pres list') + ' to see all presentations\n');
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Start presentation
pres
  .command('start <id>')
  .description('Start working on presentation (marks as started)')
  .action(async (id) => {
    try {
      const pres = await presentations.startPresentation(id);
      console.log(chalk.green('\n✅ Started: ' + pres.title));
      console.log(chalk.gray('Status: marked as started\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Complete presentation
pres
  .command('complete <id>')
  .description('Mark presentation as complete (todo → done)')
  .option('--hours <hours>', 'Actual hours spent', parseFloat)
  .option('--notes <text>', 'Completion notes')
  .action(async (id, options) => {
    try {
      const pres = await presentations.completePresentation(id, options);
      console.log(chalk.green('\n✅ Completed: ' + pres.title));
      console.log(chalk.gray('Status: todo → done'));
      if (options.hours && pres.estimatedHours) {
        console.log(chalk.gray('Time: ' + pres.estimatedHours + 'h estimated, ' + options.hours + 'h actual'));
      }
      console.log();
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Archive presentation
pres
  .command('archive <id>')
  .description('Archive presentation (any status → archived)')
  .action(async (id) => {
    try {
      const pres = await presentations.archivePresentation(id);
      console.log(chalk.green('\n✅ Archived: ' + pres.title + '\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// List presentations
pres
  .command('list')
  .description('List presentations')
  .option('-s, --status <status>', 'Filter by status (todo|done|archived)')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('--tag <tag>', 'Filter by tag')
  .option('--all', 'Include archived', false)
  .action(async (options) => {
    try {
      const presList = await presentations.listPresentations(options);
      const stats = await presentations.getStats();

      console.log(chalk.bold.cyan('\n📊 Presentations\n'));
      console.log(chalk.gray('Total: ' + stats.total + ' | To Do: ' + stats.todo + ' | Done: ' + stats.done + '\n'));

      if (presList.length === 0) {
        console.log(chalk.gray('No presentations found.\n'));
        return;
      }

      // Group by status
      const byStatus = {
        'todo': [],
        'done': [],
        'archived': []
      };

      presList.forEach(p => {
        if (byStatus[p.status]) {
          byStatus[p.status].push(p);
        }
      });

      // Print each group
      const groups = [
        { status: 'todo', title: '📋 TO DO', color: chalk.blue },
        { status: 'done', title: '✅ DONE', color: chalk.green },
        { status: 'archived', title: '📦 ARCHIVED', color: chalk.gray }
      ];

      groups.forEach(({ status, title, color }) => {
        const items = byStatus[status];
        if (items && items.length > 0) {
          console.log(color.bold(title + '\n'));
          items.forEach(p => {
            const priorityIcon = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p.priority];
            console.log(priorityIcon + ' [' + chalk.bold(p.id) + '] ' + p.title);
            if (p.deadline) {
              const daysUntil = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
              // Only show OVERDUE if status is 'todo' (not done yet)
              if (p.status === 'done') {
                console.log('   Completed: ' + p.deadline);
              } else {
                console.log('   Due: ' + p.deadline + ' (' + (daysUntil > 0 ? daysUntil + ' days' : 'OVERDUE') + ')');
              }
            }
            if (p.notionUrl) console.log(chalk.gray('   📝 Notion brief available'));
            if (p.slackUrl) console.log(chalk.gray('   💬 Slack conversation available'));
            console.log();
          });
        }
      });

    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Open presentation
pres
  .command('open <id>')
  .description('Open presentation in browser')
  .option('--notion', 'Open Notion brief instead of slides')
  .option('--slack', 'Open Slack conversation instead of slides')
  .action(async (id, options) => {
    try {
      const { pres } = await presentations.findPresentation(id);

      if (options.notion) {
        if (!pres.notionUrl) {
          console.error(chalk.red('\n❌ No Notion URL set for this presentation\n'));
          process.exit(1);
        }
        const { spawn } = require('child_process');
        spawn('open', [pres.notionUrl], { detached: true, stdio: 'ignore' });
        console.log(chalk.green('\n📝 Opening Notion brief: ' + pres.title + '\n'));
      } else if (options.slack) {
        if (!pres.slackUrl) {
          console.error(chalk.red('\n❌ No Slack URL set for this presentation\n'));
          process.exit(1);
        }
        const { spawn } = require('child_process');
        spawn('open', [pres.slackUrl], { detached: true, stdio: 'ignore' });
        console.log(chalk.green('\n💬 Opening Slack conversation: ' + pres.title + '\n'));
      } else {
        const { spawn } = require('child_process');
        spawn('open', [pres.url], { detached: true, stdio: 'ignore' });
        console.log(chalk.green('\n🔗 Opening slides: ' + pres.title + '\n'));
      }
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Update presentation
pres
  .command('update <id>')
  .description('Update presentation metadata')
  .option('-t, --title <title>', 'Update title')
  .option('--url <url>', 'Update Google Slides URL')
  .option('-d, --deadline <date>', 'Update deadline')
  .option('-p, --priority <level>', 'Update priority')
  .option('--notion <url>', 'Update Notion URL')
  .option('--slack <url>', 'Update Slack URL')
  .option('--notes <text>', 'Update notes')
  .option('--estimate <hours>', 'Update estimated hours', parseFloat)
  .option('--add-tag <tag>', 'Add a tag')
  .option('--remove-tag <tag>', 'Remove a tag')
  .action(async (id, options) => {
    try {
      const pres = await presentations.updatePresentation(id, options);
      console.log(chalk.green('\n✅ Updated: ' + pres.title + '\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// ====================
// READING QUEUE COMMANDS
// ====================

const read = program.command('read').description('Manage reading queue');

// If no subcommand, show interactive menu (placeholder for now)
read.action(async () => {
  console.log(chalk.yellow('\n📚 Reading queue interactive menu coming soon!\n'));
  console.log('Run: ' + chalk.cyan('work read list') + ' to see your reading queue\n');
});

// Add reading item
read
  .command('add <url-or-pdf>')
  .description('Add a new item to reading queue')
  .option('-t, --title <title>', 'Item title (required)')
  .option('-d, --deadline <date>', 'Deadline (YYYY-MM-DD)')
  .option('-p, --priority <level>', 'Priority (low|medium|high|urgent)', 'medium')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--source <source>', 'Source (e.g., newsletter, recommendation)')
  .option('--notes <text>', 'Additional notes')
  .option('--estimate <hours>', 'Estimated hours', parseFloat)
  .action(async (input, options) => {
    try {
      const item = await reading.addReading(input, options);
      console.log(chalk.green('\n✅ Reading item added!\n'));
      console.log('ID: ' + chalk.bold(item.id));
      console.log('Title: ' + item.title);
      console.log('Type: ' + item.type);
      console.log('Status: ' + item.status);
      if (item.deadline) console.log('Deadline: ' + item.deadline);
      console.log('\nRun: ' + chalk.cyan('work read list') + ' to see your reading queue\n');
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Start reading
read
  .command('start <id>')
  .description('Start reading (opens URL in browser or PDF in viewer)')
  .action(async (id) => {
    try {
      const item = await reading.startReading(id);
      console.log(chalk.green('\n✅ Started: ' + item.title));
      console.log(chalk.gray('Status: queued → in-progress\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Finish reading
read
  .command('finish <id>')
  .description('Mark reading as finished (in-progress → completed)')
  .option('--notes <text>', 'Completion notes')
  .action(async (id, options) => {
    try {
      const item = await reading.finishReading(id, options);
      console.log(chalk.green('\n✅ Finished: ' + item.title));
      console.log(chalk.gray('Status: in-progress → completed\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Archive reading
read
  .command('archive <id>')
  .description('Archive reading item (any status → archived)')
  .action(async (id) => {
    try {
      const item = await reading.archiveReading(id);
      console.log(chalk.green('\n✅ Archived: ' + item.title + '\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// List reading queue
read
  .command('list')
  .description('List reading queue')
  .option('-s, --status <status>', 'Filter by status (queued|in-progress|completed|archived)')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('--type <type>', 'Filter by type (url|pdf)')
  .option('--tag <tag>', 'Filter by tag')
  .option('--all', 'Include archived', false)
  .action(async (options) => {
    try {
      const readingList = await reading.listReading(options);
      const stats = await reading.getStats();

      console.log(chalk.bold.cyan('\n📚 Reading Queue\n'));
      console.log(chalk.gray('Total: ' + stats.total + ' | To Read: ' + stats.toRead + ' | Reading: ' + stats.reading + ' | Read: ' + stats.read + '\n'));

      if (readingList.length === 0) {
        console.log(chalk.gray('No reading items found.\n'));
        return;
      }

      // Group by status
      const byStatus = {
        'reading': [],
        'to-read': [],
        'read': [],
        'archived': []
      };

      readingList.forEach(item => {
        if (byStatus[item.status]) {
          byStatus[item.status].push(item);
        }
      });

      // Print each group
      const groups = [
        { status: 'reading', title: '📖 CURRENTLY READING', color: chalk.yellow },
        { status: 'to-read', title: '📚 TO READ', color: chalk.blue },
        { status: 'read', title: '✅ READ', color: chalk.green },
        { status: 'archived', title: '📦 ARCHIVED', color: chalk.gray }
      ];

      groups.forEach(({ status, title, color }) => {
        const items = byStatus[status];
        if (items && items.length > 0) {
          console.log(color.bold(title + '\n'));
          items.forEach(item => {
            const priorityIcon = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[item.priority];
            const typeIcon = item.type === 'pdf' ? '📄' : '🔗';
            console.log(priorityIcon + ' ' + typeIcon + ' [' + chalk.bold(item.id) + '] ' + item.title);
            if (item.deadline) {
              const daysUntil = Math.ceil((new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24));
              console.log('   Due: ' + item.deadline + ' (' + (daysUntil > 0 ? daysUntil + ' days' : 'OVERDUE') + ')');
            }
            if (item.source) console.log(chalk.gray('   Source: ' + item.source));
            console.log();
          });
        }
      });

    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Open reading item
read
  .command('open <id>')
  .description('Open URL in browser or PDF in viewer')
  .action(async (id) => {
    try {
      const { item } = await reading.findReading(id);

      const { spawn } = require('child_process');
      spawn('open', [item.url], { detached: true, stdio: 'ignore' });

      const typeLabel = item.type === 'pdf' ? 'PDF' : 'URL';
      console.log(chalk.green('\n🔗 Opening ' + typeLabel + ': ' + item.title + '\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Update reading item
read
  .command('update <id>')
  .description('Update reading item metadata')
  .option('-t, --title <title>', 'Update title')
  .option('--url <url>', 'Update URL or PDF path')
  .option('-d, --deadline <date>', 'Update deadline')
  .option('-p, --priority <level>', 'Update priority')
  .option('--notes <text>', 'Update notes')
  .option('--estimate <hours>', 'Update estimated hours', parseFloat)
  .option('--add-tag <tag>', 'Add a tag')
  .option('--remove-tag <tag>', 'Remove a tag')
  .action(async (id, options) => {
    try {
      const item = await reading.updateReading(id, options);
      console.log(chalk.green('\n✅ Updated: ' + item.title + '\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// ====================
// OTHER COMMANDS
// ====================

// Generate daily note (this one works - index.js exists)
program
  .command('daily')
  .description('Generate today\'s daily note with calendar events and open in Obsidian')
  .action(async () => {
    const { execSync, spawn } = require('child_process');
    const cwd = path.join(__dirname, '..');

    console.log(chalk.cyan('\n📅 Generating daily note...\n'));

    try {
      execSync('npm run daily', { stdio: 'inherit', cwd });
      console.log(chalk.green('\n✅ Daily note generated!\n'));

      // Use local date (not UTC) to match daily note filename
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone

      // Use Obsidian URI to open today's daily note
      const obsidianUri = `obsidian://open?vault=switchboard&file=dailynote%2F${today}.md`;

      console.log(chalk.cyan('📂 Opening in Obsidian...\n'));
      spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
    } catch (err) {
      console.error(chalk.red('Error generating daily note'));
      process.exit(1);
    }
  });

// Refresh GTD dashboard
program
  .command('refresh')
  .description('Update reminders cache and regenerate GTD dashboard')
  .option('--skip-cache', 'Skip updating reminders cache')
  .action(async (options) => {
    const { execSync } = require('child_process');
    const cwd = path.join(__dirname, '..');

    console.log(chalk.cyan('\n🔄 Refreshing GTD dashboard...\n'));

    try {
      // Update reminders cache first (unless skipped)
      if (!options.skipCache) {
        console.log(chalk.gray('📥 Pulling from Apple Reminders...'));
        execSync('node tools/updateRemindersCache.js', { stdio: 'inherit', cwd });
        console.log();
      }

      // Generate dashboard
      console.log(chalk.gray('📊 Generating dashboard...'));
      execSync('node lib/gtd-simple/dashboard.js', { stdio: 'inherit', cwd });

      console.log(chalk.green('\n✅ Dashboard refreshed!\n'));
      console.log('Open with: ' + chalk.cyan('work dash') + '\n');
    } catch (err) {
      console.error(chalk.red('Error refreshing dashboard'));
      process.exit(1);
    }
  });

// Dashboard shortcuts
program
  .command('dash')
  .description('Open GTD dashboard in Obsidian')
  .option('--pres', 'Open presentations dashboard instead')
  .option('--read', 'Open reading queue dashboard instead')
  .option('--refresh', 'Refresh dashboard before opening')
  .action(async (options) => {
    const { spawn, execSync } = require('child_process');
    const cwd = path.join(__dirname, '..');

    // Refresh if requested
    if (options.refresh) {
      console.log(chalk.gray('🔄 Refreshing dashboard...'));
      try {
        execSync('node lib/gtd-simple/dashboard.js', { stdio: 'inherit', cwd });
        if (options.pres) {
          execSync('npm run pres:refresh', { stdio: 'inherit', cwd });
        }
        if (options.read) {
          execSync('npm run read:refresh', { stdio: 'inherit', cwd });
        }
      } catch (err) {
        console.error(chalk.red('Error refreshing dashboard'));
      }
    }

    if (options.pres) {
      // Use Obsidian URI to open specific file
      const obsidianUri = 'obsidian://open?vault=switchboard&file=GTD%2Fpresentations.md';
      spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
      console.log(chalk.cyan('\n📂 Opening presentations dashboard in Obsidian...\n'));
    } else if (options.read) {
      // Use Obsidian URI to open reading queue
      const obsidianUri = 'obsidian://open?vault=switchboard&file=GTD%2Freading-queue.md';
      spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
      console.log(chalk.cyan('\n📂 Opening reading queue in Obsidian...\n'));
    } else {
      // Use Obsidian URI to open GTD Dashboard
      const obsidianUri = 'obsidian://open?vault=switchboard&file=GTD%20Dashboard.md';
      spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
      console.log(chalk.cyan('\n📂 Opening GTD dashboard in Obsidian...\n'));
    }
  });

// Parse arguments
program.parse(process.argv);
