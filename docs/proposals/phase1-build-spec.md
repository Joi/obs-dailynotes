# Phase 1: Build Spec - Work CLI Core
## Presentations Tracking System

**Goal**: Build minimal viable `work` CLI with presentations tracking
**Timeline**: Week 1
**Priority**: Presentations only (papers in Phase 2)

---

## Deliverables

1. ✅ `work` CLI command (globally installable)
2. ✅ Data structure (`data/presentations.json`)
3. ✅ Core commands: add, start, complete, archive, list, open
4. ✅ Interactive mode for all commands
5. ✅ Basic presentations dashboard generation
6. ✅ Integration with morning routine

---

## File Structure

```
obs-dailynotes/
├── data/
│   └── presentations.json          # NEW: Presentations data
│
├── tools/
│   ├── work-cli.js                 # NEW: Main CLI entry point
│   │
│   ├── lib/
│   │   ├── presentations.js        # NEW: Presentation business logic
│   │   ├── storage.js              # NEW: JSON file I/O
│   │   └── interactive.js          # NEW: Interactive menus
│   │
│   ├── presentations/              # NEW: Individual command scripts
│   │   ├── add.js
│   │   ├── update.js
│   │   ├── list.js
│   │   ├── open.js
│   │   └── generateDashboard.js
│   │
│   └── gtd_morning.sh              # MODIFY: Add dashboard generation
│
├── GTD/
│   └── presentations.md            # NEW: Generated dashboard
│
└── package.json                    # MODIFY: Add bin, dependencies
```

---

## Data Schema

### presentations.json

```json
{
  "version": "1.0",
  "presentations": [
    {
      "id": "pres-20251027-001",
      "title": "Q4 Board Presentation",
      "url": "https://docs.google.com/presentation/d/ABC123/edit",
      "status": "in-progress",
      "priority": "high",
      "deadline": "2025-11-15",
      "createdDate": "2025-10-27T10:00:00Z",
      "startedDate": "2025-10-28T09:00:00Z",
      "completedDate": null,
      "archivedDate": null,
      "tags": ["board", "quarterly"],
      "notes": "Need to add financial slides by Nov 10",
      "reminderTaskId": null,
      "estimatedHours": 8,
      "actualHours": 3
    }
  ],
  "nextId": 2
}
```

**Field Types:**
- `id`: string (format: pres-YYYYMMDD-NNN)
- `status`: enum (planned, in-progress, completed, archived)
- `priority`: enum (low, medium, high, urgent)
- Dates: ISO 8601 strings
- Arrays: tags
- Numbers: hours

---

## CLI Commands

### Installation

```bash
cd ~/obs-dailynotes

# Install dependencies
npm install commander inquirer chalk

# Link globally
npm link

# Now 'work' command is available anywhere
work
```

### Command Syntax

#### Interactive Mode

```bash
work               # Main menu
work pres          # Presentations menu
```

#### Direct Commands

```bash
work pres add <url> [options]
work pres start <id>
work pres complete <id> [options]
work pres archive <id>
work pres list [options]
work pres open <id>
work pres update <id> [options]
```

---

## Implementation Details

### 1. Main CLI Entry Point

**File**: `tools/work-cli.js`

```javascript
#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

// Import command modules
const presAdd = require('./presentations/add');
const presUpdate = require('./presentations/update');
const presList = require('./presentations/list');
const presOpen = require('./presentations/open');
const { presentationsMenu } = require('./lib/interactive');

program
  .name('work')
  .description('Manage presentations and papers')
  .version(pkg.version);

// Presentations command group
const pres = program.command('pres').description('Manage presentations');

// If no subcommand, show interactive menu
pres.action(async () => {
  await presentationsMenu();
});

// Subcommands
pres
  .command('add <url>')
  .description('Add a new presentation')
  .option('-t, --title <title>', 'Presentation title')
  .option('-d, --deadline <date>', 'Deadline (YYYY-MM-DD)')
  .option('-p, --priority <level>', 'Priority (low|medium|high|urgent)', 'medium')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--notes <text>', 'Additional notes')
  .option('--estimate <hours>', 'Estimated hours', parseFloat)
  .action(presAdd);

pres
  .command('start <id>')
  .description('Start working on presentation')
  .action(async (id) => {
    await presUpdate.start(id);
  });

pres
  .command('complete <id>')
  .description('Mark presentation as complete')
  .option('--hours <hours>', 'Actual hours spent', parseFloat)
  .option('--notes <text>', 'Completion notes')
  .action(async (id, options) => {
    await presUpdate.complete(id, options);
  });

pres
  .command('archive <id>')
  .description('Archive presentation')
  .action(async (id) => {
    await presUpdate.archive(id);
  });

pres
  .command('list')
  .description('List presentations')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('--tag <tag>', 'Filter by tag')
  .option('--all', 'Include archived', false)
  .action(presList);

pres
  .command('open <id>')
  .description('Open presentation in browser')
  .action(presOpen);

pres
  .command('update <id>')
  .description('Update presentation metadata')
  .option('-t, --title <title>', 'Update title')
  .option('--url <url>', 'Update URL')
  .option('-d, --deadline <date>', 'Update deadline')
  .option('-p, --priority <level>', 'Update priority')
  .option('--notes <text>', 'Update notes')
  .option('--add-tag <tag>', 'Add a tag')
  .option('--remove-tag <tag>', 'Remove a tag')
  .action(async (id, options) => {
    await presUpdate.update(id, options);
  });

// Morning routine shortcut
program
  .command('morning')
  .description('Run morning routine')
  .action(async () => {
    const { execSync } = require('child_process');
    execSync('bash tools/gtd_morning.sh', { stdio: 'inherit' });
  });

// Parse arguments
program.parse(process.argv);

// If no arguments, show main menu
if (!process.argv.slice(2).length) {
  const { mainMenu } = require('./lib/interactive');
  mainMenu();
}
```

### 2. Storage Layer

**File**: `tools/lib/storage.js`

```javascript
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const PRESENTATIONS_FILE = path.join(DATA_DIR, 'presentations.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Directory exists, that's fine
  }
}

// Load presentations
async function loadPresentations() {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(PRESENTATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, create it
      const initial = {
        version: '1.0',
        presentations: [],
        nextId: 1
      };
      await savePresentations(initial);
      return initial;
    }
    throw err;
  }
}

// Save presentations
async function savePresentations(data) {
  await ensureDataDir();
  await fs.writeFile(
    PRESENTATIONS_FILE,
    JSON.stringify(data, null, 2),
    'utf-8'
  );
}

module.exports = {
  loadPresentations,
  savePresentations
};
```

### 3. Presentation Business Logic

**File**: `tools/lib/presentations.js`

```javascript
const { loadPresentations, savePresentations } = require('./storage');

// Generate unique ID
function generateId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return dateStr; // Will append counter in addPresentation
}

// Add presentation
async function addPresentation(url, options) {
  const data = await loadPresentations();
  
  // Validate required fields
  if (!options.title) {
    throw new Error('Title is required');
  }
  
  // Generate ID
  const dateStr = generateId();
  const id = `pres-${dateStr}-${String(data.nextId).padStart(3, '0')}`;
  
  const presentation = {
    id,
    title: options.title,
    url,
    status: 'planned',
    priority: options.priority || 'medium',
    deadline: options.deadline || null,
    createdDate: new Date().toISOString(),
    startedDate: null,
    completedDate: null,
    archivedDate: null,
    tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
    notes: options.notes || '',
    reminderTaskId: null,
    estimatedHours: options.estimate || null,
    actualHours: 0
  };
  
  data.presentations.push(presentation);
  data.nextId++;
  
  await savePresentations(data);
  
  return presentation;
}

// Find presentation by ID
async function findPresentation(id) {
  const data = await loadPresentations();
  const pres = data.presentations.find(p => p.id === id);
  
  if (!pres) {
    throw new Error(`Presentation ${id} not found`);
  }
  
  return { data, pres };
}

// Start presentation
async function startPresentation(id) {
  const { data, pres } = await findPresentation(id);
  
  if (pres.status !== 'planned') {
    throw new Error(`Cannot start presentation in '${pres.status}' status`);
  }
  
  pres.status = 'in-progress';
  pres.startedDate = new Date().toISOString();
  
  await savePresentations(data);
  
  return pres;
}

// Complete presentation
async function completePresentation(id, options = {}) {
  const { data, pres } = await findPresentation(id);
  
  if (pres.status !== 'in-progress') {
    throw new Error(`Cannot complete presentation in '${pres.status}' status`);
  }
  
  pres.status = 'completed';
  pres.completedDate = new Date().toISOString();
  
  if (options.hours) {
    pres.actualHours = options.hours;
  }
  
  if (options.notes) {
    pres.notes += (pres.notes ? '\n\n' : '') + 
                  `Completion notes (${new Date().toISOString().slice(0,10)}): ${options.notes}`;
  }
  
  await savePresentations(data);
  
  return pres;
}

// Archive presentation
async function archivePresentation(id) {
  const { data, pres } = await findPresentation(id);
  
  pres.status = 'archived';
  pres.archivedDate = new Date().toISOString();
  
  await savePresentations(data);
  
  return pres;
}

// Update presentation
async function updatePresentation(id, updates) {
  const { data, pres } = await findPresentation(id);
  
  if (updates.title) pres.title = updates.title;
  if (updates.url) pres.url = updates.url;
  if (updates.deadline) pres.deadline = updates.deadline;
  if (updates.priority) pres.priority = updates.priority;
  if (updates.notes) pres.notes = updates.notes;
  if (updates.addTag) {
    if (!pres.tags.includes(updates.addTag)) {
      pres.tags.push(updates.addTag);
    }
  }
  if (updates.removeTag) {
    pres.tags = pres.tags.filter(t => t !== updates.removeTag);
  }
  
  await savePresentations(data);
  
  return pres;
}

// List presentations
async function listPresentations(filters = {}) {
  const data = await loadPresentations();
  let presentations = data.presentations;
  
  // Filter by status
  if (filters.status) {
    presentations = presentations.filter(p => p.status === filters.status);
  }
  
  // Filter by priority
  if (filters.priority) {
    presentations = presentations.filter(p => p.priority === filters.priority);
  }
  
  // Filter by tag
  if (filters.tag) {
    presentations = presentations.filter(p => p.tags.includes(filters.tag));
  }
  
  // Exclude archived unless explicitly requested
  if (!filters.all) {
    presentations = presentations.filter(p => p.status !== 'archived');
  }
  
  // Sort: urgent first, then by deadline, then by status
  presentations.sort((a, b) => {
    // Priority order
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // Deadline order (soonest first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    
    // Status order
    const statusOrder = { 'in-progress': 0, planned: 1, completed: 2, archived: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  return presentations;
}

module.exports = {
  addPresentation,
  startPresentation,
  completePresentation,
  archivePresentation,
  updatePresentation,
  findPresentation,
  listPresentations
};
```

### 4. Interactive Menus

**File**: `tools/lib/interactive.js`

```javascript
const inquirer = require('inquirer');
const chalk = require('chalk');
const presentations = require('./presentations');

async function mainMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\n🎯 Work Management\n'));
  
  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: 'What would you like to do?',
    choices: [
      { name: '🎤 Presentations', value: 'presentations' },
      { name: '📚 Papers / Reading (Coming Soon)', value: 'papers', disabled: true },
      { name: '📊 View Dashboard', value: 'dashboard' },
      { name: '✅ Morning Routine', value: 'morning' },
      new inquirer.Separator(),
      { name: '❌ Exit', value: 'exit' }
    ]
  }]);
  
  if (choice === 'presentations') {
    await presentationsMenu();
  } else if (choice === 'morning') {
    const { execSync } = require('child_process');
    execSync('bash tools/gtd_morning.sh', { stdio: 'inherit' });
  } else if (choice === 'exit') {
    console.log(chalk.green('\n👋 Goodbye!\n'));
    process.exit(0);
  }
}

async function presentationsMenu() {
  console.clear();
  console.log(chalk.bold.cyan('\n🎤 Presentations\n'));
  
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Choose an action:',
    choices: [
      { name: '➕ Add new presentation', value: 'add' },
      { name: '📋 List all presentations', value: 'list' },
      { name: '✏️  Update presentation status', value: 'update' },
      { name: '🔗 Open presentation in browser', value: 'open' },
      new inquirer.Separator(),
      { name: '⬅️  Back to main menu', value: 'back' }
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

async function addPresentationInteractive() {
  console.log(chalk.bold.cyan('\n➕ Add New Presentation\n'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: '📎 Google Slides URL:',
      validate: (input) => input.includes('docs.google.com/presentation') || 
                          'Please enter a valid Google Slides URL'
    },
    {
      type: 'input',
      name: 'title',
      message: '📝 Title:',
      validate: (input) => input.length > 0 || 'Title is required'
    },
    {
      type: 'input',
      name: 'deadline',
      message: '📅 Deadline (YYYY-MM-DD, or leave blank):',
      default: ''
    },
    {
      type: 'list',
      name: 'priority',
      message: '🎯 Priority:',
      choices: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'tags',
      message: '🏷️  Tags (comma-separated, or leave blank):',
      default: ''
    },
    {
      type: 'input',
      name: 'notes',
      message: '📝 Notes (or leave blank):',
      default: ''
    },
    {
      type: 'number',
      name: 'estimate',
      message: '⏱️  Estimated hours (or leave blank):',
      default: null
    }
  ]);
  
  try {
    const pres = await presentations.addPresentation(answers.url, answers);
    
    console.log(chalk.green('\n✅ Presentation created!\n'));
    console.log(`ID: ${chalk.bold(pres.id)}`);
    console.log(`Title: ${pres.title}`);
    console.log(`Status: ${pres.status}`);
    
    const { next } = await inquirer.prompt([{
      type: 'list',
      name: 'next',
      message: '\nWhat would you like to do next?',
      choices: [
        { name: '🚀 Start working on it now', value: 'start' },
        { name: '📋 View all presentations', value: 'list' },
        { name: '➕ Add another presentation', value: 'add' },
        { name: '⬅️  Back to menu', value: 'back' }
      ]
    }]);
    
    if (next === 'start') {
      await presentations.startPresentation(pres.id);
      console.log(chalk.green(`\n✅ Started: ${pres.title}`));
      console.log(chalk.gray('Status: planned → in-progress\n'));
      await presentationsMenu();
    } else if (next === 'list') {
      await listPresentationsInteractive();
    } else if (next === 'add') {
      await addPresentationInteractive();
    } else {
      await presentationsMenu();
    }
    
  } catch (err) {
    console.error(chalk.red(`\n❌ Error: ${err.message}\n`));
    await presentationsMenu();
  }
}

async function listPresentationsInteractive() {
  const presList = await presentations.listPresentations();
  
  console.log(chalk.bold.cyan(`\n📊 Presentations (${presList.length})\n`));
  
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
  
  // Display
  if (byStatus['in-progress'].length > 0) {
    console.log(chalk.yellow.bold('🟡 IN PROGRESS\n'));
    byStatus['in-progress'].forEach(p => printPresentation(p));
  }
  
  if (byStatus['planned'].length > 0) {
    console.log(chalk.blue.bold('\n🟢 PLANNED\n'));
    byStatus['planned'].forEach(p => printPresentation(p));
  }
  
  if (byStatus['completed'].length > 0) {
    console.log(chalk.green.bold('\n✅ COMPLETED\n'));
    byStatus['completed'].forEach(p => printPresentation(p));
  }
  
  const { next } = await inquirer.prompt([{
    type: 'list',
    name: 'next',
    message: '\nWhat next?',
    choices: [
      { name: '⬅️  Back to menu', value: 'back' }
    ]
  }]);
  
  await presentationsMenu();
}

function printPresentation(p) {
  console.log(`[${chalk.bold(p.id)}] ${chalk.bold(p.title)}`);
  console.log(`  Status: ${p.status} | Priority: ${p.priority}`);
  if (p.deadline) {
    const daysUntil = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`  Due: ${p.deadline} ${daysUntil > 0 ? `(${daysUntil} days)` : '(OVERDUE)'}`);
  }
  console.log(`  ${chalk.gray(p.url)}`);
  console.log();
}

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
      name: `${p.title} (${p.status})`,
      value: p.id
    }))
  }]);
  
  const { data, pres } = await presentations.findPresentation(id);
  
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: `What would you like to do with "${pres.title}"?`,
    choices: [
      { name: '🚀 Start working (→ in-progress)', value: 'start', disabled: pres.status !== 'planned' },
      { name: '✅ Mark complete (→ completed)', value: 'complete', disabled: pres.status !== 'in-progress' },
      { name: '📦 Archive', value: 'archive' },
      { name: '✏️  Edit details', value: 'edit' },
      { name: '⬅️  Back', value: 'back' }
    ]
  }]);
  
  if (action === 'start') {
    await presentations.startPresentation(id);
    console.log(chalk.green(`\n✅ Started: ${pres.title}\n`));
  } else if (action === 'complete') {
    await presentations.completePresentation(id);
    console.log(chalk.green(`\n✅ Completed: ${pres.title}\n`));
  } else if (action === 'archive') {
    await presentations.archivePresentation(id);
    console.log(chalk.green(`\n✅ Archived: ${pres.title}\n`));
  }
  
  await presentationsMenu();
}

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
    choices: presList.map(p => ({
      name: `${p.title}`,
      value: p.id
    }))
  }]);
  
  const { data, pres } = await presentations.findPresentation(id);
  
  console.log(chalk.green(`\n🔗 Opening: ${pres.title}`));
  console.log(chalk.gray(pres.url + '\n'));
  
  const { spawn } = require('child_process');
  spawn('open', [pres.url], { detached: true });
  
  await presentationsMenu();
}

module.exports = {
  mainMenu,
  presentationsMenu,
  addPresentationInteractive,
  listPresentationsInteractive,
  updatePresentationInteractive,
  openPresentationInteractive
};
```

---

## package.json Updates

```json
{
  "name": "obs-dailynotes",
  "version": "1.0.0",
  "bin": {
    "work": "./tools/work-cli.js"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "inquirer": "^8.2.5",
    "chalk": "^4.1.2"
  },
  "scripts": {
    "work": "node tools/work-cli.js"
  }
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Install: `npm install && npm link`
- [ ] Interactive menu: `work`
- [ ] Add presentation (interactive): `work pres`
- [ ] Add presentation (direct): `work pres add "URL" -t "Title" -d 2025-11-15`
- [ ] List presentations: `work pres list`
- [ ] Start presentation: `work pres start <id>`
- [ ] Complete presentation: `work pres complete <id>`
- [ ] Archive presentation: `work pres archive <id>`
- [ ] Open in browser: `work pres open <id>`
- [ ] Update metadata: `work pres update <id> -t "New Title"`
- [ ] Verify data persists: Check `data/presentations.json`

---

## Next Steps

1. **Build Phase 1** (this spec)
2. **Test with real use** (add 2-3 presentations)
3. **Create Phase 2 spec** (papers)
4. **Iterate based on feedback**

Ready to start coding? 🚀
