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

// Get package.json for version
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// Import modules
const presentations = require('./lib/presentations');
const { mainMenu, presentationsMenu } = require('./lib/interactive');

program
  .name('work')
  .description('Manage presentations, papers, and GTD workflow')
  .version(pkg.version);

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
  .description('Start working on presentation (planned → in-progress)')
  .action(async (id) => {
    try {
      const pres = await presentations.startPresentation(id);
      console.log(chalk.green('\n✅ Started: ' + pres.title));
      console.log(chalk.gray('Status: planned → in-progress\n'));
    } catch (err) {
      console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
      process.exit(1);
    }
  });

// Complete presentation
pres
  .command('complete <id>')
  .description('Mark presentation as complete (in-progress → completed)')
  .option('--hours <hours>', 'Actual hours spent', parseFloat)
  .option('--notes <text>', 'Completion notes')
  .action(async (id, options) => {
    try {
      const pres = await presentations.completePresentation(id, options);
      console.log(chalk.green('\n✅ Completed: ' + pres.title));
      console.log(chalk.gray('Status: in-progress → completed'));
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
  .option('-s, --status <status>', 'Filter by status (planned|in-progress|completed|archived)')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('--tag <tag>', 'Filter by tag')
  .option('--all', 'Include archived', false)
  .action(async (options) => {
    try {
      const presList = await presentations.listPresentations(options);
      const stats = await presentations.getStats();

      console.log(chalk.bold.cyan('\n📊 Presentations\n'));
      console.log(chalk.gray('Total: ' + stats.total + ' | Active: ' + (stats.inProgress + stats.planned) + ' | Completed: ' + stats.completed + '\n'));

      if (presList.length === 0) {
        console.log(chalk.gray('No presentations found.\n'));
        return;
      }

      // Group by status
      const byStatus = {
        'in-progress': [],
        'planned': [],
        'completed': [],
        'archived': []
      };

      presList.forEach(p => {
        if (byStatus[p.status]) {
          byStatus[p.status].push(p);
        }
      });

      // Print each group
      const groups = [
        { status: 'in-progress', title: '🟡 IN PROGRESS', color: chalk.yellow },
        { status: 'planned', title: '🟢 PLANNED', color: chalk.blue },
        { status: 'completed', title: '✅ COMPLETED', color: chalk.green },
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
              console.log('   Due: ' + p.deadline + ' (' + (daysUntil > 0 ? daysUntil + ' days' : 'OVERDUE') + ')');
            }
            if (p.notionUrl) console.log(chalk.gray('   📝 Notion brief available'));
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
// OTHER COMMANDS
// ====================

// Generate daily note (this one works - index.js exists)
program
  .command('daily')
  .description('Generate today\'s daily note with calendar events')
  .action(async () => {
    const { execSync } = require('child_process');
    const cwd = path.join(__dirname, '..');

    console.log(chalk.cyan('\n📅 Generating daily note...\n'));

    try {
      execSync('npm run daily', { stdio: 'inherit', cwd });
      console.log(chalk.green('\n✅ Daily note generated!\n'));
    } catch (err) {
      console.error(chalk.red('Error generating daily note'));
      process.exit(1);
    }
  });

// Dashboard shortcuts
program
  .command('dash')
  .description('Open GTD dashboard in Obsidian')
  .option('--pres', 'Open presentations dashboard instead')
  .action((options) => {
    const { spawn } = require('child_process');

    if (options.pres) {
      const presPath = path.join(__dirname, '../GTD/presentations.md');
      // Open with Obsidian using obsidian:// URI
      spawn('open', ['-a', 'Obsidian', presPath], { detached: true, stdio: 'ignore' });
      console.log(chalk.cyan('\n📂 Opening presentations dashboard in Obsidian...\n'));
    } else {
      const dashPath = path.join(process.env.HOME, 'switchboard/GTD Dashboard.md');
      // Open with Obsidian using obsidian:// URI
      spawn('open', ['-a', 'Obsidian', dashPath], { detached: true, stdio: 'ignore' });
      console.log(chalk.cyan('\n📂 Opening GTD dashboard in Obsidian...\n'));
    }
  });

// Parse arguments
program.parse(process.argv);

// If no arguments, show main menu
if (!process.argv.slice(2).length) {
  mainMenu();
}
