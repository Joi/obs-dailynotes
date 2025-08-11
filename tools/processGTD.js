#!/usr/bin/env node

/**
 * GTD Processor Script
 * Processes Apple Reminders with GTD tags and contexts
 * Generates context-specific lists and GTD dashboard
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const DAILY_NOTE_PATH = process.env.DAILY_NOTE_PATH?.replace('~', process.env.HOME) || '/Users/<Owner>/switchboard/dailynote';
const GTD_PATH = path.join(DAILY_NOTE_PATH, '..', 'GTD');
const REMINDERS_PATH = path.join(DAILY_NOTE_PATH, '..', 'reminders');
const VAULT_ROOT = path.join(DAILY_NOTE_PATH, '..');
const REMINDERS_CLI = '/opt/homebrew/bin/reminders';

// Contexts removed from workflow; keep empty for compatibility
const CONTEXTS = {};

// GTD Tags
const GTD_TAGS = {
  inbox: '#inbox',
  next: '#next',
  waiting: '#waiting',
  someday: '#someday',
  email: '#email',
  'email-reply': '#email-reply',
  'email-waiting': '#email-waiting',
  call: '#call',
  meeting: '#meeting'
};

// Priority markers
const PRIORITY_URGENT = '!!';
const PRIORITY_HIGH = '!';

// Fuzzy tag synonyms
const TAG_SYNONYMS = [
  { keywords: ['email', 'mail', 'reply', 'respond', 'response'], tag: 'email' },
  { keywords: ['call', 'phone', 'ring', 'dial'], tag: 'call' },
];

// Simple natural language date parsing (limited built-in; avoids adding deps)
function parseNaturalLanguageDue(input) {
  const text = input.toLowerCase();
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let deltaDays = null;
  if (/(^|\s)today(\s|$)/.test(text)) deltaDays = 0;
  else if (/(^|\s)tomorrow(\s|$)/.test(text)) deltaDays = 1;
  else if (/in\s+(\d+)\s+day/.test(text)) deltaDays = parseInt(text.match(/in\s+(\d+)\s+day/)[1], 10);
  else if (/in\s+(\d+)\s+week/.test(text)) deltaDays = parseInt(text.match(/in\s+(\d+)\s+week/)[1], 10) * 7;
  else if (/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(text)) {
    const map = {sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
    const m = text.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    const target = map[m[1]];
    const todayDow = base.getDay();
    let days = (target - todayDow + 7) % 7;
    if (days === 0) days = 7;
    deltaDays = days;
  }
  if (deltaDays === null) return null;
  const due = new Date(base);
  due.setDate(base.getDate() + deltaDays);
  return due.toISOString();
}

/**
 * Load people index from vault if present
 */
function loadPeopleIndex() {
  try {
    const peopleIndexPath = path.join(VAULT_ROOT, 'people.index.json');
    if (fs.existsSync(peopleIndexPath)) {
      return JSON.parse(fs.readFileSync(peopleIndexPath, 'utf8'));
    }
  } catch (_) {}
  return {};
}

/**
 * Auto-link person names/aliases in a task title using [[wikilinks]]
 */
function linkPeopleInTitle(originalTitle, peopleIndex) {
  let title = originalTitle;
  if (!peopleIndex || typeof peopleIndex !== 'object') return title;
  // Build variant ownership map to detect ambiguous aliases
  const variantToOwners = new Map(); // variant -> Set(personName)
  const personToVariants = new Map(); // personName -> variant[]
  for (const [personName, info] of Object.entries(peopleIndex)) {
    const rawAliases = (info && Array.isArray(info.aliases)) ? info.aliases : [];
    const variants = [personName, ...rawAliases]
      .map(v => (typeof v === 'string' ? v : (v == null ? '' : String(v))))
      .map(v => v.trim())
      .filter(v => v.length > 0);
    personToVariants.set(personName, variants);
    for (const v of variants) {
      if (!variantToOwners.has(v)) variantToOwners.set(v, new Set());
      variantToOwners.get(v).add(personName);
    }
  }
  // Prepare a de-ambiguous list of (personName, variant) pairs, longer variants first
  const pairs = [];
  for (const [personName, variants] of personToVariants.entries()) {
    for (const v of variants) {
      const owners = variantToOwners.get(v) || new Set();
      if (owners.size > 1 && v === v.replace(/\s*\([^)]*\)\s*$/, '') ) {
        // Skip plain ambiguous variants shared by multiple people (e.g., "Michelle Lee")
        continue;
      }
      pairs.push([personName, v]);
    }
  }
  pairs.sort((a, b) => b[1].length - a[1].length);
  for (const [personName, variant] of pairs) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^\[])(\\b${escaped}\\b)(?!\])`, 'g');
    title = title.replace(re, (m, p1, p2) => `${p1}[[${personName}]]`);
  }
  return title;
}

/**
 * Parse GTD tags and contexts from reminder title
 */
function parseGTDElements(title) {
  const elements = {
    contexts: [], // deprecated
    tags: [],
    priority: 'normal',
    cleanTitle: title,
    project: null
  };

  // Extract priority
  if (title.includes(PRIORITY_URGENT)) {
    elements.priority = 'urgent';
    elements.cleanTitle = elements.cleanTitle.replace(PRIORITY_URGENT, '').trim();
  } else if (title.includes(PRIORITY_HIGH)) {
    elements.priority = 'high';
    elements.cleanTitle = elements.cleanTitle.replace(PRIORITY_HIGH, '').trim();
  }

  // Contexts no longer used
  const contextRegex = /@(\w+)/g;

  // Extract tags (#word)
  const tagRegex = /#([\w-]+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(title)) !== null) {
    const tag = tagMatch[1];
    elements.tags.push(tag);
    
    // Check for project tags
    if (tag.startsWith('project:')) {
      elements.project = tag.replace('project:', '');
    }
  }

  // Fuzzy tag enrichment from synonyms
  const lowered = title.toLowerCase();
  for (const rule of TAG_SYNONYMS) {
    if (rule.keywords.some(k => lowered.includes(k))) {
      if (!elements.tags.includes(rule.tag)) elements.tags.push(rule.tag);
    }
  }

  // Clean title from tags and contexts
  elements.cleanTitle = elements.cleanTitle
    .replace(contextRegex, '')
    .replace(tagRegex, '')
    .replace(/\s+/g, ' ')
    .trim();

  return elements;
}

/**
 * Load reminders from cache
 */
function loadReminders() {
  const cachePath = path.join(REMINDERS_PATH, 'reminders_cache.json');
  
  if (!fs.existsSync(cachePath)) {
    console.log('No reminders cache found. Running reminders:pull first...');
    execSync('npm run reminders:pull', { cwd: path.join(__dirname, '..') });
  }

  const cacheContent = fs.readFileSync(cachePath, 'utf8');
  const cache = JSON.parse(cacheContent);
  
  // Flatten all reminders from all lists into a single array
  const reminders = [];
  if (cache.byList) {
    Object.entries(cache.byList).forEach(([listName, items]) => {
      items.forEach(item => {
        reminders.push({
          id: item.id,
          name: item.title,
          list: listName,
          notes: item.notes,
          flagged: item.flagged,
          priority: item.priority,
          dueDate: item.due,
          completed: item.completed
        });
      });
    });
  }
  
  return reminders;
}

/**
 * Group reminders by GTD categories
 */
function categorizeReminders(reminders, peopleIndexOptional) {
  const categories = {
    inbox: [],
    nextActions: [],
    waiting: [],
    someday: [],
    byProject: {},
    email: {
      reply: [],
      waiting: [],
      action: []
    },
    urgent: [],
    high: []
  };

  // Context buckets removed

  const peopleIndex = peopleIndexOptional || loadPeopleIndex();

  reminders.forEach(reminder => {
    if (reminder.completed) return;

    const elements = parseGTDElements(reminder.name);
    const task = {
      title: linkPeopleInTitle(elements.cleanTitle, peopleIndex),
      originalTitle: reminder.name,
      id: reminder.id,
      dueDate: reminder.dueDate || parseNaturalLanguageDue(reminder.name),
      priority: elements.priority,
      contexts: elements.contexts,
      tags: elements.tags,
      project: elements.project,
      list: reminder.list
    };

    // Categorize by priority
    if (elements.priority === 'urgent') {
      categories.urgent.push(task);
    } else if (elements.priority === 'high') {
      categories.high.push(task);
    }

    // Categorize by GTD state
    if (elements.tags.includes('inbox')) {
      categories.inbox.push(task);
    } else if (elements.tags.includes('waiting')) {
      categories.waiting.push(task);
    } else if (elements.tags.includes('someday')) {
      categories.someday.push(task);
    } else if (elements.tags.includes('next')) {
      categories.nextActions.push(task);
    } else {
      // Default uncategorized items to inbox so the dashboard is not empty
      categories.inbox.push(task);
    }

    // Context categorization removed

    // Categorize by project
    if (elements.project) {
      if (!categories.byProject[elements.project]) {
        categories.byProject[elements.project] = [];
      }
      categories.byProject[elements.project].push(task);
    }

    // Categorize email tasks
    if (elements.tags.includes('email')) {
      if (elements.tags.includes('email-reply')) {
        categories.email.reply.push(task);
      } else if (elements.tags.includes('email-waiting')) {
        categories.email.waiting.push(task);
      } else {
        categories.email.action.push(task);
      }
    }
  });

  return categories;
}

/**
 * Format task for markdown
 */
function formatTask(task) {
  let formatted = `- [ ] ${task.title}`;
  
  if (task.priority === 'urgent') {
    formatted += ' !!';
  } else if (task.priority === 'high') {
    formatted += ' !';
  }
  
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate.toDateString() === today.toDateString()) {
      formatted += ' 📅 Today';
    } else {
      formatted += ` 📅 ${dueDate.toLocaleDateString()}`;
    }
  }
  // Always include the source list for clarity and reliable syncing
  if (task.list) {
    formatted += ` (${task.list})`;
  }

  formatted += ` <!--reminders-id:${task.id}-->`;
  
  return formatted;
}

/**
 * Generate GTD Dashboard
 */
function generateDashboard(categories) {
  const now = new Date();
  let content = `---
type: gtd-dashboard
generated: ${now.toISOString()}
---

# GTD Dashboard
*Generated: ${now.toLocaleString()}*

## 🎯 Focus (Urgent & High Priority)

### Urgent Tasks (Do Today)
${categories.urgent.length === 0 ? '*No urgent tasks*' : categories.urgent.map(formatTask).join('\n')}

### High Priority (This Week)
${categories.high.length === 0 ? '*No high priority tasks*' : categories.high.map(formatTask).join('\n')}

## 📥 Inbox (Needs Processing)
${categories.inbox.length === 0 ? '*Inbox is empty*' : categories.inbox.map(formatTask).join('\n')}

## ⏭️ Next Actions
${categories.nextActions.length === 0 ? '*No next actions*' : categories.nextActions.map(formatTask).join('\n')}

## ⏸️ Waiting For
${categories.waiting.length === 0 ? '*Not waiting on anything*' : categories.waiting.map(formatTask).join('\n')}

## 💭 Someday/Maybe
${categories.someday.length === 0 ? '*No someday items*' : categories.someday.map(formatTask).join('\n')}

## 📧 Email Tasks

### Reply Required
${categories.email.reply.length === 0 ? '*No emails to reply to*' : categories.email.reply.map(formatTask).join('\n')}

### Waiting for Response
${categories.email.waiting.length === 0 ? '*Not waiting on any emails*' : categories.email.waiting.map(formatTask).join('\n')}

### Other Email Actions
${categories.email.action.length === 0 ? '*No email actions*' : categories.email.action.map(formatTask).join('\n')}

## Quick Stats
- Inbox: ${categories.inbox.length}
- Next Actions: ${categories.nextActions.length}
- Waiting: ${categories.waiting.length}
- Urgent: ${categories.urgent.length}
- High Priority: ${categories.high.length}
`;

  return content;
}

/**
 * Generate context-specific lists
 */
function generateContextLists(categories) {
  // Context lists are deprecated in the current workflow
  return {};
}

/**
 * Generate project lists
 */
function generateProjectLists(categories) {
  const lists = {};
  
  Object.entries(categories.byProject).forEach(([project, tasks]) => {
    if (tasks.length === 0) return;
    
    let content = `---
type: gtd-project
project: ${project}
generated: ${new Date().toISOString()}
---

# Project: ${project}

## Active Tasks (${tasks.length})
${tasks.map(formatTask).join('\n')}
`;
    
    lists[`project-${project}.md`] = content;
  });
  
  return lists;
}

/**
 * Generate next actions summary
 */
function generateNextActions(categories) {
  let content = `---
type: gtd-next-actions
generated: ${new Date().toISOString()}
---

# Next Actions

`;

  if (categories.nextActions.length > 0) {
    content += categories.nextActions.map(formatTask).join('\n') + '\n';
  } else {
    content += '*No next actions*\n';
  }

  return content;
}

/**
 * Generate email tasks list
 */
function generateEmailTasks(categories) {
  const { email } = categories;
  
  let content = `---
type: gtd-email-tasks
generated: ${new Date().toISOString()}
---

# Email Tasks

## 📬 Reply Required (${email.reply.length})
${email.reply.length === 0 ? '*No emails to reply to*' : email.reply.map(formatTask).join('\n')}

## ⏳ Waiting for Response (${email.waiting.length})
${email.waiting.length === 0 ? '*Not waiting on any emails*' : email.waiting.map(formatTask).join('\n')}

## ✉️ Other Email Actions (${email.action.length})
${email.action.length === 0 ? '*No email actions*' : email.action.map(formatTask).join('\n')}

---
*Tip: Use #email-reply for emails needing response, #email-waiting for sent emails awaiting reply*
`;

  return content;
}

/**
 * Generate waiting for list
 */
function generateWaitingFor(categories) {
  const waiting = categories.waiting;
  
  // Group by list (person)
  const byPerson = {};
  waiting.forEach(task => {
    if (!byPerson[task.list]) {
      byPerson[task.list] = [];
    }
    byPerson[task.list].push(task);
  });
  
  let content = `---
type: gtd-waiting-for
generated: ${new Date().toISOString()}
---

# Waiting For

Total items: ${waiting.length}

`;

  if (waiting.length === 0) {
    content += '*Not waiting on anything*\n';
  } else {
    // Group by person/list
    Object.entries(byPerson).forEach(([person, tasks]) => {
      content += `## ${person}
${tasks.map(task => {
        let formatted = `- [ ] ${task.title}`;
        if (task.dueDate) {
          formatted += ` (due: ${new Date(task.dueDate).toLocaleDateString()})`;
        }
        formatted += ` <!--reminders-id:${task.id}-->`;
        return formatted;
      }).join('\n')}

`;
    });
  }

  return content;
}

/**
 * Generate scheduled tasks view
 */
function generateScheduled(categories) {
  // Collect all tasks with due dates
  const allTasks = [
    ...categories.urgent,
    ...categories.high,
    ...categories.nextActions,
    ...categories.inbox
  ];
  
  const scheduled = allTasks.filter(task => task.dueDate);
  scheduled.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  
  // Group by date
  const byDate = {};
  scheduled.forEach(task => {
    const date = new Date(task.dueDate).toDateString();
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(task);
  });
  
  let content = `---
type: gtd-scheduled
generated: ${new Date().toISOString()}
---

# Scheduled Tasks

`;

  Object.entries(byDate).forEach(([date, tasks]) => {
    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (dateObj.toDateString() === today.toDateString()) {
      dateLabel = `📅 Today - ${dateLabel}`;
    }
    
    content += `## ${dateLabel}
${tasks.map(formatTask).join('\n')}

`;
  });

  if (scheduled.length === 0) {
    content += '*No scheduled tasks*\n';
  }

  return content;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting GTD Processing...');
  
  // Ensure GTD directory exists
  if (!fs.existsSync(GTD_PATH)) {
    fs.mkdirSync(GTD_PATH, { recursive: true });
    console.log(`📁 Created GTD directory: ${GTD_PATH}`);
  }

  // Load reminders
  console.log('📥 Loading reminders...');
  const reminders = loadReminders();
  console.log(`  Found ${reminders.length} total reminders`);

  // Categorize reminders
  console.log('🏷️  Categorizing by GTD methodology...');
  const categories = categorizeReminders(reminders);
  
  console.log(`  Urgent: ${categories.urgent.length}`);
  console.log(`  High Priority: ${categories.high.length}`);
  console.log(`  Next Actions: ${categories.nextActions.length}`);
  console.log(`  Waiting: ${categories.waiting.length}`);
  console.log(`  Inbox: ${categories.inbox.length}`);
  console.log(`  Someday: ${categories.someday.length}`);

  // Generate files
  console.log('📝 Generating GTD files...');
  
  // Dashboard
  const dashboard = generateDashboard(categories);
  fs.writeFileSync(path.join(GTD_PATH, 'dashboard.md'), dashboard);
  console.log('  ✓ dashboard.md');

  // Next Actions
  const nextActions = generateNextActions(categories);
  fs.writeFileSync(path.join(GTD_PATH, 'next-actions.md'), nextActions);
  console.log('  ✓ next-actions.md');

  // Email Tasks
  const emailTasks = generateEmailTasks(categories);
  fs.writeFileSync(path.join(GTD_PATH, 'email-tasks.md'), emailTasks);
  console.log('  ✓ email-tasks.md');

  // Waiting For
  const waitingFor = generateWaitingFor(categories);
  fs.writeFileSync(path.join(GTD_PATH, 'waiting-for.md'), waitingFor);
  console.log('  ✓ waiting-for.md');

  // Scheduled
  const scheduled = generateScheduled(categories);
  fs.writeFileSync(path.join(GTD_PATH, 'scheduled.md'), scheduled);
  console.log('  ✓ scheduled.md');

  // Context Lists
  const contextLists = generateContextLists(categories);
  Object.entries(contextLists).forEach(([filename, content]) => {
    fs.writeFileSync(path.join(GTD_PATH, filename), content);
    console.log(`  ✓ ${filename}`);
  });

  // Project Lists
  const projectLists = generateProjectLists(categories);
  Object.entries(projectLists).forEach(([filename, content]) => {
    fs.writeFileSync(path.join(GTD_PATH, filename), content);
    console.log(`  ✓ ${filename}`);
  });

  console.log('✅ GTD Processing complete!');
  console.log(`📂 Files written to: ${GTD_PATH}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { parseGTDElements, categorizeReminders };