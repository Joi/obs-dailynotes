const inquirer = require('inquirer');
const chalk = require('chalk');
const presentations = require('./presentations');
const { spawn } = require('child_process');

/**
 * Main menu
 */
async function mainMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\n<¯ Work Management\n'));

  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: 'What would you like to do?',
    choices: [
      { name: '<¤ Presentations', value: 'presentations' },
      { name: '=Ú Papers / Reading (Coming in Phase 2)', value: 'papers', disabled: true },
      { name: '=Ê View Dashboard', value: 'dashboard' },
      { name: ' Morning Routine', value: 'morning' },
      new inquirer.Separator(),
      { name: 'L Exit', value: 'exit' }
    ]
  }]);

  if (choice === 'presentations') {
    await presentationsMenu();
  } else if (choice === 'dashboard') {
    console.log(chalk.cyan('\n=Â Opening GTD dashboard...\n'));
    spawn('open', ['GTD/dashboard.md'], { detached: true, stdio: 'ignore' });
    await mainMenu();
  } else if (choice === 'morning') {
    console.log(chalk.cyan('\n< Running morning routine...\n'));
    const { execSync } = require('child_process');
    try {
      execSync('bash tools/gtd_morning.sh', { stdio: 'inherit' });
    } catch (err) {
      console.error(chalk.red('Error running morning routine'));
    }
    console.log('\n');
    await mainMenu();
  } else if (choice === 'exit') {
    console.log(chalk.green('\n=K Goodbye!\n'));
    process.exit(0);
  }
}

/**
 * Presentations submenu
 */
async function presentationsMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\n<¤ Presentations\n'));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Choose an action:',
    choices: [
      { name: '• Add new presentation', value: 'add' },
      { name: '=Ë List all presentations', value: 'list' },
      { name: '  Update presentation status', value: 'update' },
      { name: '= Open presentation', value: 'open' },
      new inquirer.Separator(),
      { name: '  Back to main menu', value: 'back' }
    ]
  }]);

  if (action === 'add') {
    await addPresentationInteractive();
  } else if (action === 'list') {
    await listPresentationsInteractive();
  } else if (action === 'update') {
    await updatePresentationInteractive();
  } else if (action === 'open') {
    await openPresentationInteractive();
  } else if (action === 'back') {
    await mainMenu();
  }
}

/**
 * Add presentation interactively
 */
async function addPresentationInteractive() {
  console.log(chalk.bold.cyan('\n• Add New Presentation\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: '=Î Google Slides URL:',
      validate: (input) => {
        if (!input) return 'URL is required';
        if (!input.includes('docs.google.com/presentation')) {
          return 'Please enter a valid Google Slides URL';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'title',
      message: '=Ý Title:',
      validate: (input) => input.length > 0 || 'Title is required'
    },
    {
      type: 'input',
      name: 'notionUrl',
      message: '=Ý Notion brief URL (or leave blank):',
      default: ''
    },
    {
      type: 'input',
      name: 'deadline',
      message: '=Å Deadline (YYYY-MM-DD, or leave blank):',
      default: '',
      validate: (input) => {
        if (!input) return true;
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return dateRegex.test(input) || 'Format must be YYYY-MM-DD';
      }
    },
    {
      type: 'list',
      name: 'priority',
      message: '<¯ Priority:',
      choices: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'tags',
      message: '<÷  Tags (comma-separated, or leave blank):',
      default: ''
    },
    {
      type: 'input',
      name: 'notes',
      message: '=Ý Notes (or leave blank):',
      default: ''
    },
    {
      type: 'number',
      name: 'estimate',
      message: 'ñ  Estimated hours (or leave blank):',
      default: null
    }
  ]);

  try {
    const pres = await presentations.addPresentation(answers.url, answers);

    console.log(chalk.green('\n Presentation created!\n'));
    console.log('ID: ' + chalk.bold(pres.id));
    console.log('Title: ' + pres.title);
    console.log('Status: ' + pres.status);
    if (pres.deadline) {
      console.log('Deadline: ' + pres.deadline);
    }
    if (pres.notionUrl) {
      console.log('Notion brief: ');
    }

    const { next } = await inquirer.prompt([{
      type: 'list',
      name: 'next',
      message: '\nWhat would you like to do next?',
      choices: [
        { name: '=€ Start working on it now', value: 'start' },
        { name: '= Open in browser', value: 'open' },
        { name: '=Ë View all presentations', value: 'list' },
        { name: '• Add another presentation', value: 'add' },
        { name: '  Back to menu', value: 'back' }
      ]
    }]);

    if (next === 'start') {
      await presentations.startPresentation(pres.id);
      console.log(chalk.green('\n Started: ' + pres.title));
      console.log(chalk.gray('Status: planned ’ in-progress\n'));
      await presentationsMenu();
    } else if (next === 'open') {
      spawn('open', [pres.url], { detached: true, stdio: 'ignore' });
      console.log(chalk.green('\n= Opening: ' + pres.title + '\n'));
      await presentationsMenu();
    } else if (next === 'list') {
      await listPresentationsInteractive();
    } else if (next === 'add') {
      await addPresentationInteractive();
    } else {
      await presentationsMenu();
    }

  } catch (err) {
    console.error(chalk.red('\nL Error: ' + err.message + '\n'));
    await presentationsMenu();
  }
}

/**
 * List presentations interactively
 */
async function listPresentationsInteractive() {
  const presList = await presentations.listPresentations();
  const stats = await presentations.getStats();

  console.clear();
  console.log(chalk.bold.cyan('\n=Ê Presentations\n'));
  console.log(chalk.gray('Total: ' + stats.total + ' | Active: ' + (stats.inProgress + stats.planned) + ' | Completed: ' + stats.completed + '\n'));

  if (presList.length === 0) {
    console.log(chalk.gray('No presentations yet. Add one to get started!\n'));
    await presentationsMenu();
    return;
  }

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

  // Display in-progress
  if (byStatus['in-progress'].length > 0) {
    console.log(chalk.yellow.bold('=á IN PROGRESS\n'));
    byStatus['in-progress'].forEach(p => printPresentation(p));
  }

  // Display planned
  if (byStatus['planned'].length > 0) {
    console.log(chalk.blue.bold('=â PLANNED\n'));
    byStatus['planned'].forEach(p => printPresentation(p));
  }

  // Display completed
  if (byStatus['completed'].length > 0) {
    console.log(chalk.green.bold('\n RECENTLY COMPLETED\n'));
    byStatus['completed'].forEach(p => printPresentation(p));
  }

  const { next } = await inquirer.prompt([{
    type: 'list',
    name: 'next',
    message: '\nWhat next?',
    choices: [
      { name: '  Back to menu', value: 'back' }
    ]
  }]);

  await presentationsMenu();
}

/**
 * Print presentation details
 */
function printPresentation(p) {
  const priorityIcons = { urgent: '=4', high: '=à', medium: '=á', low: '=â' };
  const icon = priorityIcons[p.priority] || '';

  console.log(icon + ' [' + chalk.bold(p.id) + '] ' + chalk.bold(p.title));
  console.log('   Status: ' + p.status + ' | Priority: ' + p.priority);

  if (p.deadline) {
    const daysUntil = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const deadlineColor = daysUntil < 7 ? chalk.red : daysUntil < 14 ? chalk.yellow : chalk.gray;
    const dueDateStr = daysUntil > 0 ? daysUntil + ' days' : 'OVERDUE';
    console.log('   Due: ' + deadlineColor(p.deadline) + ' (' + dueDateStr + ')');
  }

  if (p.notionUrl) {
    console.log(chalk.gray('   =Ý Has Notion brief'));
  }

  if (p.tags.length > 0) {
    console.log(chalk.gray('   Tags: ' + p.tags.join(', ')));
  }

  console.log(chalk.gray('   ' + p.url));
  console.log();
}

/**
 * Update presentation interactively
 */
async function updatePresentationInteractive() {
  const presList = await presentations.listPresentations();

  if (presList.length === 0) {
    console.log(chalk.gray('\nNo presentations yet.\n'));
    await presentationsMenu();
    return;
  }

  const { id } = await inquirer.prompt([{
    type: 'list',
    name: 'id',
    message: 'Select presentation:',
    choices: presList.map(p => ({
      name: p.title + ' (' + p.status + ')',
      value: p.id
    }))
  }]);

  const { data, pres } = await presentations.findPresentation(id);

  console.log(chalk.cyan('\nCurrent: ' + pres.title));
  console.log(chalk.gray('Status: ' + pres.status + '\n'));

  const choices = [];

  if (pres.status === 'planned') {
    choices.push({ name: '=€ Start working (’ in-progress)', value: 'start' });
  }
  if (pres.status === 'in-progress') {
    choices.push({ name: ' Mark complete (’ completed)', value: 'complete' });
  }
  choices.push({ name: '=æ Archive', value: 'archive' });
  choices.push({ name: '  Edit details', value: 'edit' });
  choices.push({ name: '= Open in browser', value: 'open' });
  if (pres.notionUrl) {
    choices.push({ name: '=Ý Open Notion brief', value: 'open-notion' });
  }
  choices.push(new inquirer.Separator());
  choices.push({ name: '  Back', value: 'back' });

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices
  }]);

  try {
    if (action === 'start') {
      await presentations.startPresentation(id);
      console.log(chalk.green('\n Started: ' + pres.title));
      console.log(chalk.gray('Status: planned ’ in-progress\n'));
    } else if (action === 'complete') {
      const { hours, notes } = await inquirer.prompt([
        {
          type: 'number',
          name: 'hours',
          message: 'Actual hours spent (or leave blank):',
          default: null
        },
        {
          type: 'input',
          name: 'notes',
          message: 'Completion notes (or leave blank):',
          default: ''
        }
      ]);

      await presentations.completePresentation(id, { hours, notes });
      console.log(chalk.green('\n Completed: ' + pres.title));
      console.log(chalk.gray('Status: in-progress ’ completed\n'));
    } else if (action === 'archive') {
      await presentations.archivePresentation(id);
      console.log(chalk.green('\n Archived: ' + pres.title + '\n'));
    } else if (action === 'open') {
      spawn('open', [pres.url], { detached: true, stdio: 'ignore' });
      console.log(chalk.green('\n= Opening slides: ' + pres.title + '\n'));
    } else if (action === 'open-notion') {
      spawn('open', [pres.notionUrl], { detached: true, stdio: 'ignore' });
      console.log(chalk.green('\n=Ý Opening Notion brief: ' + pres.title + '\n'));
    } else if (action === 'edit') {
      await editPresentationInteractive(id);
      return;
    }
  } catch (err) {
    console.error(chalk.red('\nL Error: ' + err.message + '\n'));
  }

  await presentationsMenu();
}

/**
 * Edit presentation details
 */
async function editPresentationInteractive(id) {
  const { data, pres } = await presentations.findPresentation(id);

  console.log(chalk.cyan('\nEditing: ' + pres.title + '\n'));

  const { field } = await inquirer.prompt([{
    type: 'list',
    name: 'field',
    message: 'What would you like to update?',
    choices: [
      { name: 'Title (current: ' + pres.title + ')', value: 'title' },
      { name: 'Deadline (current: ' + (pres.deadline || 'none') + ')', value: 'deadline' },
      { name: 'Priority (current: ' + pres.priority + ')', value: 'priority' },
      { name: 'Notion URL (current: ' + (pres.notionUrl ? 'set' : 'none') + ')', value: 'notion' },
      { name: 'Notes', value: 'notes' },
      { name: 'Tags', value: 'tags' },
      new inquirer.Separator(),
      { name: '  Back', value: 'back' }
    ]
  }]);

  if (field === 'back') {
    await updatePresentationInteractive();
    return;
  }

  const updates = {};

  if (field === 'title') {
    const { title } = await inquirer.prompt([{
      type: 'input',
      name: 'title',
      message: 'New title:',
      default: pres.title
    }]);
    updates.title = title;
  } else if (field === 'deadline') {
    const { deadline } = await inquirer.prompt([{
      type: 'input',
      name: 'deadline',
      message: 'New deadline (YYYY-MM-DD, or blank to remove):',
      default: pres.deadline || '',
      validate: (input) => {
        if (!input) return true;
        return /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Format must be YYYY-MM-DD';
      }
    }]);
    updates.deadline = deadline || null;
  } else if (field === 'priority') {
    const { priority } = await inquirer.prompt([{
      type: 'list',
      name: 'priority',
      message: 'New priority:',
      choices: ['low', 'medium', 'high', 'urgent'],
      default: pres.priority
    }]);
    updates.priority = priority;
  } else if (field === 'notion') {
    const { notionUrl } = await inquirer.prompt([{
      type: 'input',
      name: 'notionUrl',
      message: 'Notion brief URL (or blank to remove):',
      default: pres.notionUrl || ''
    }]);
    updates.notion = notionUrl || null;
  } else if (field === 'notes') {
    const { notes } = await inquirer.prompt([{
      type: 'input',
      name: 'notes',
      message: 'Notes:',
      default: pres.notes
    }]);
    updates.notes = notes;
  }

  await presentations.updatePresentation(id, updates);
  console.log(chalk.green('\n Updated!\n'));

  await presentationsMenu();
}

/**
 * Open presentation interactively
 */
async function openPresentationInteractive() {
  const presList = await presentations.listPresentations();

  if (presList.length === 0) {
    console.log(chalk.gray('\nNo presentations yet.\n'));
    await presentationsMenu();
    return;
  }

  const { id } = await inquirer.prompt([{
    type: 'list',
    name: 'id',
    message: 'Select presentation to open:',
    choices: presList.map(p => {
      const hasNotion = p.notionUrl ? ' =Ý' : '';
      return {
        name: p.title + ' (' + p.status + ')' + hasNotion,
        value: p.id
      };
    })
  }]);

  const { data, pres } = await presentations.findPresentation(id);

  const choices = [
    { name: '<¤ Open Google Slides', value: 'slides' }
  ];

  if (pres.notionUrl) {
    choices.push({ name: '=Ý Open Notion Brief', value: 'notion' });
  }

  choices.push(new inquirer.Separator());
  choices.push({ name: '  Back', value: 'back' });

  const { target } = await inquirer.prompt([{
    type: 'list',
    name: 'target',
    message: 'What to open?',
    choices
  }]);

  if (target === 'slides') {
    spawn('open', [pres.url], { detached: true, stdio: 'ignore' });
    console.log(chalk.green('\n= Opening slides: ' + pres.title + '\n'));
  } else if (target === 'notion') {
    spawn('open', [pres.notionUrl], { detached: true, stdio: 'ignore' });
    console.log(chalk.green('\n=Ý Opening Notion brief: ' + pres.title + '\n'));
  }

  if (target !== 'back') {
    await presentationsMenu();
  } else {
    await presentationsMenu();
  }
}

module.exports = {
  mainMenu,
  presentationsMenu,
  addPresentationInteractive,
  listPresentationsInteractive,
  updatePresentationInteractive,
  openPresentationInteractive
};
