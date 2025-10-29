const inquirer = require('inquirer');
const chalk = require('chalk');
const { execSync, spawn } = require('child_process');
const path = require('path');
const presentations = require('./presentations');
const reading = require('./reading');

/**
 * Main interactive menu
 */
async function mainMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\nWork CLI - Interactive Menu\n'));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Presentations', value: 'presentations' },
        { name: 'Reading Queue', value: 'reading' },
        new inquirer.Separator(),
        { name: 'Generate Daily Note', value: 'daily' },
        { name: 'Refresh GTD Dashboard', value: 'refresh' },
        { name: 'View GTD Dashboard', value: 'dashboard-gtd' },
        { name: 'View Presentations Dashboard', value: 'dashboard-pres' },
        { name: 'View Reading Queue', value: 'dashboard-read' },
        new inquirer.Separator(),
        { name: chalk.gray('Exit'), value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'presentations':
      await presentationsMenu();
      break;
    case 'reading':
      await readingMenu();
      break;
    case 'daily':
      await generateDailyNote();
      break;
    case 'refresh':
      await refreshDashboard();
      break;
    case 'dashboard-gtd':
      await openGtdDashboard();
      break;
    case 'dashboard-pres':
      await openPresentationsDashboard();
      break;
    case 'dashboard-read':
      await openReadingDashboard();
      break;
    case 'exit':
      console.log(chalk.green('\nGoodbye!\n'));
      process.exit(0);
  }
}

/**
 * Generate daily note
 */
async function generateDailyNote() {
  console.log(chalk.cyan('\nGenerating daily note...\n'));
  try {
    execSync('npm run daily', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
    console.log(chalk.green('\nDaily note generated!\n'));

    const today = new Date().toLocaleDateString('en-CA');
    const obsidianUri = `obsidian://open?vault=switchboard&file=dailynote%2F${today}.md`;
    spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
    console.log(chalk.cyan('Opening in Obsidian...\n'));
  } catch (err) {
    console.error(chalk.red('Error generating daily note'));
  }
  await mainMenu();
}

/**
 * Refresh GTD dashboard
 */
async function refreshDashboard() {
  console.log(chalk.cyan('\nRefreshing GTD dashboard...\n'));
  try {
    execSync('node tools/updateRemindersCache.js', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
    execSync('node lib/gtd-simple/dashboard.js', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
    console.log(chalk.green('\nDashboard refreshed!\n'));
  } catch (err) {
    console.error(chalk.red('Error refreshing dashboard'));
  }
  await mainMenu();
}

/**
 * Open GTD dashboard
 */
async function openGtdDashboard() {
  const obsidianUri = 'obsidian://open?vault=switchboard&file=GTD%20Dashboard.md';
  spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
  console.log(chalk.cyan('\nOpening GTD dashboard in Obsidian...\n'));
  await mainMenu();
}

/**
 * Open presentations dashboard
 */
async function openPresentationsDashboard() {
  const obsidianUri = 'obsidian://open?vault=switchboard&file=GTD%2Fpresentations.md';
  spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
  console.log(chalk.cyan('\nOpening presentations dashboard in Obsidian...\n'));
  await mainMenu();
}

/**
 * Open reading dashboard
 */
async function openReadingDashboard() {
  const obsidianUri = 'obsidian://open?vault=switchboard&file=GTD%2Freading-queue.md';
  spawn('open', [obsidianUri], { detached: true, stdio: 'ignore' });
  console.log(chalk.cyan('\nOpening reading queue in Obsidian...\n'));
  await mainMenu();
}

/**
 * Reading queue submenu
 */
async function readingMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\nReading Queue\n'));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Choose an action:',
    choices: [
      { name: 'List reading queue', value: 'list' },
      { name: 'Add URL to reading queue', value: 'add-url' },
      { name: 'Add PDF to reading queue', value: 'add-pdf' },
      new inquirer.Separator(),
      { name: chalk.gray('Back to main menu'), value: 'back' }
    ]
  }]);

  if (action === 'back') {
    await mainMenu();
    return;
  }

  switch (action) {
    case 'list':
      await listReadingQueue();
      break;
    case 'add-url':
      await addUrlToReadingQueue();
      break;
    case 'add-pdf':
      await addPdfToReadingQueue();
      break;
  }
}

/**
 * List reading queue
 */
async function listReadingQueue() {
  console.log(chalk.cyan('\nFetching reading queue...\n'));
  try {
    execSync('work read list', { stdio: 'inherit' });
  } catch (err) {
    console.error(chalk.red('Error listing reading queue'));
  }
  await pressEnterToContinue();
  await readingMenu();
}

/**
 * Add URL to reading queue
 */
async function addUrlToReadingQueue() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'URL:',
      validate: input => input.length > 0 || 'URL is required'
    },
    {
      type: 'input',
      name: 'title',
      message: 'Title:',
      validate: input => input.length > 0 || 'Title is required'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority:',
      choices: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated, optional):',
    },
    {
      type: 'input',
      name: 'estimate',
      message: 'Estimated time (minutes, optional):',
    }
  ]);

  try {
    await reading.addReading(answers.url, {
      title: answers.title,
      priority: answers.priority,
      tags: answers.tags,
      estimate: answers.estimate ? parseInt(answers.estimate) : null
    });
    console.log(chalk.green('\n✅ Added to reading queue!\n'));
  } catch (err) {
    console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
  }

  await pressEnterToContinue();
  await readingMenu();
}

/**
 * Add PDF to reading queue
 */
async function addPdfToReadingQueue() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'path',
      message: 'PDF path:',
      validate: input => input.length > 0 || 'Path is required'
    },
    {
      type: 'input',
      name: 'title',
      message: 'Title:',
      validate: input => input.length > 0 || 'Title is required'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority:',
      choices: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated, optional):',
    },
    {
      type: 'input',
      name: 'estimate',
      message: 'Estimated time (minutes, optional):',
    }
  ]);

  try {
    await reading.addReading(answers.path, {
      title: answers.title,
      priority: answers.priority,
      tags: answers.tags,
      estimate: answers.estimate ? parseInt(answers.estimate) : null
    });
    console.log(chalk.green('\n✅ Added to reading queue!\n'));
  } catch (err) {
    console.error(chalk.red('\n❌ Error: ' + err.message + '\n'));
  }

  await pressEnterToContinue();
  await readingMenu();
}

/**
 * Presentations submenu
 */
async function presentationsMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\nPresentations\n'));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Choose an action:',
    choices: [
      { name: 'Add new presentation', value: 'add' },
      { name: 'List all presentations', value: 'list' },
      { name: 'Update presentation status', value: 'update' },
      { name: 'Open presentation', value: 'open' },
      new inquirer.Separator(),
      { name: chalk.gray('Back to main menu'), value: 'back' }
    ]
  }]);

  if (action === 'back') {
    await mainMenu();
    return;
  }

  console.log(chalk.yellow('\nInteractive presentations actions coming soon!\n'));
  console.log('Use direct commands: ' + chalk.cyan('work pres add, work pres list, etc.\n'));
  await mainMenu();
}

/**
 * Helper to pause for user input
 */
async function pressEnterToContinue() {
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...',
  }]);
}

module.exports = {
  mainMenu,
  presentationsMenu,
  readingMenu
};
