# Command Triggering: Better Interaction Models

**Problem**: Too many commands to remember (`pnpm run pres:add`, `pnpm run papers:start`, etc.)

**Goal**: Make it easy to trigger actions without memorizing commands

---

## Option 1: Interactive Menu (Recommended)

**Single entry point with guided prompts:**

```bash
# Single command to rule them all
pnpm run work

# Or even shorter aliases
make work
work  # if added to PATH
```

**Interactive Flow:**

```
$ pnpm run work

🎯 Work Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What would you like to do?

  1. 🎤 Presentations
  2. 📚 Papers / Reading
  3. 📊 View Dashboard
  4. ✅ Morning Routine
  5. 🔄 Sync with Reminders
  6. ❌ Exit

> 1

🎤 Presentations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. ➕ Add new presentation
  2. 📋 List all presentations
  3. ✏️  Update presentation status
  4. 🔗 Open presentation
  5. ⬅️  Back to main menu

> 1

➕ Add New Presentation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📎 Google Slides URL: https://docs.google.com/presentation/d/ABC123/edit
📝 Title: Q4 Board Presentation
📅 Deadline (YYYY-MM-DD, or leave blank): 2025-11-15
🎯 Priority (low/medium/high/urgent): high
🏷️  Tags (comma-separated, or leave blank): board,quarterly
📝 Notes (or leave blank): Need financial slides

✅ Created: pres-20251027-001
   Title: Q4 Board Presentation
   Status: planned
   
What's next?
  1. 🚀 Start working on it now
  2. 📋 View all presentations
  3. ➕ Add another presentation
  4. ⬅️  Back to main menu
  
> 1

✅ Status updated: planned → in-progress
📂 Opening in browser...

Press Enter to continue...
```

**Implementation:**

```javascript
// tools/interactive/menu.js
const inquirer = require('inquirer');

async function mainMenu() {
  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: 'What would you like to do?',
    choices: [
      { name: '🎤 Presentations', value: 'presentations' },
      { name: '📚 Papers / Reading', value: 'papers' },
      { name: '📊 View Dashboard', value: 'dashboard' },
      { name: '✅ Morning Routine', value: 'morning' },
      { name: '🔄 Sync with Reminders', value: 'sync' },
      { name: '❌ Exit', value: 'exit' }
    ]
  }]);
  
  if (choice === 'presentations') {
    await presentationsMenu();
  } else if (choice === 'papers') {
    await papersMenu();
  }
  // etc.
}

async function presentationsMenu() {
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Presentations',
    choices: [
      { name: '➕ Add new presentation', value: 'add' },
      { name: '📋 List all', value: 'list' },
      { name: '✏️  Update status', value: 'update' },
      { name: '🔗 Open presentation', value: 'open' },
      { name: '⬅️  Back', value: 'back' }
    ]
  }]);
  
  if (action === 'add') {
    await addPresentation();
  } else if (action === 'update') {
    await updatePresentation();
  }
  // etc.
}
```

**Pros:**
- Zero memorization - just navigate menus
- Guided prompts for all required fields
- Contextual next actions ("What's next?")
- Forgiving (can go back, exit anytime)
- Works great for occasional use

**Cons:**
- Slower for power users
- Requires terminal interaction
- Can't script/automate easily

---

## Option 2: In-Dashboard Quick Actions

**Add clickable actions directly in the dashboard:**

### Obsidian URI Scheme

```markdown
# Presentations Dashboard

## 🎤 Quick Actions
- [➕ Add Presentation](obsidian://execute?command=work:pres:add)
- [📋 List All](obsidian://execute?command=work:pres:list)

## 🔴 URGENT

### [[Q4 Board Presentation]]
- Status: planned
- [🚀 Start Working](obsidian://execute?command=work:pres:start&id=pres-20251027-001)
- [✅ Mark Complete](obsidian://execute?command=work:pres:complete&id=pres-20251027-001)
- [🔗 Open Slides](https://docs.google.com/presentation/d/ABC123/edit)
```

**Implementation via Obsidian Plugin:**

Would require a custom Obsidian plugin to:
1. Register commands
2. Handle URI clicks
3. Show input prompts in Obsidian
4. Execute the Node scripts

**Pros:**
- Stay in Obsidian
- One-click actions
- Visual and contextual

**Cons:**
- Requires Obsidian plugin development
- More complex to build
- Obsidian-specific (doesn't work in terminal/other editors)

---

## Option 3: Keyboard Maestro Macros

**System-wide hotkeys and macros:**

```
⌘⌥P → Presentation menu
  ↳ Shows menu: Add / List / Update / Open
  
⌘⌥R → Reading menu
  ↳ Shows menu: Add Paper / Start Reading / Finish / List

⌘⌥M → Morning routine (one-press)

⌘⌥D → Open main dashboard in Obsidian
```

**Implementation:**

Keyboard Maestro macros that:
1. Show menu with choices
2. Prompt for inputs
3. Run terminal commands
4. Show results in notification

**Example Macro:**

```
Trigger: ⌘⌥P
Actions:
1. Prompt With List:
   - "Add Presentation"
   - "List Presentations"
   - "Update Presentation"
   
2. If choice = "Add Presentation":
   - Prompt for URL
   - Prompt for title
   - Prompt for deadline
   - Execute: cd ~/obs-dailynotes && pnpm run pres:add $URL --title "$TITLE" --deadline $DEADLINE
   - Display notification: "Presentation added!"
```

**Pros:**
- System-wide (works anywhere on Mac)
- No need to open terminal
- Can be triggered while in Obsidian
- Fast once configured

**Cons:**
- Mac-only
- Requires Keyboard Maestro ($36)
- Setup overhead
- Not portable to other machines easily

---

## Option 4: Hybrid: Simple CLI + Dashboard Helpers

**Combine simplified commands with dashboard shortcuts:**

### Simplified Top-Level Commands

Instead of `pnpm run pres:add`, use a single command with subcommands:

```bash
# Presentations
work pres add <url>           # instead of pnpm run pres:add
work pres start <id>          # instead of pnpm run pres:start
work pres list                # instead of pnpm run pres:list

# Papers  
work paper add <pdf>          # instead of pnpm run papers:add
work paper start <id>         # instead of pnpm run papers:start

# Shortcuts
work morning                  # morning routine
work sync                     # sync reminders
work dash                     # open dashboard
```

**Implementation:**

```javascript
#!/usr/bin/env node
// tools/work-cli.js

const args = process.argv.slice(2);
const [category, action, ...params] = args;

if (category === 'pres') {
  if (action === 'add') {
    const url = params[0];
    await addPresentation(url);
  } else if (action === 'start') {
    const id = params[0];
    await startPresentation(id);
  }
  // etc.
}
```

**Install globally:**

```bash
# Add to package.json
"bin": {
  "work": "./tools/work-cli.js"
}

# Install globally
npm link

# Now use anywhere:
work pres add "https://docs.google.com/..."
```

**Plus: Dashboard Command Reference**

At bottom of each dashboard:

```markdown
---

## 💡 Quick Commands

### Presentations
```bash
work pres add <url>           # Add new
work pres start <id>          # Start working
work pres complete <id>       # Mark done
work pres list                # View all
```

### Papers
```bash
work paper add <pdf-path>     # Add to queue
work paper start <id>         # Start reading
work paper finish <id>        # Mark as read
work paper list               # View queue
```

### Other
```bash
work morning                  # Run morning routine
work sync                     # Sync with Reminders
work dash                     # Open this dashboard
```

**Copy ID from presentation title:** `pres-20251027-001`
```

**Pros:**
- Shorter commands (work pres add vs pnpm run pres:add)
- Still scriptable/automatable
- Dashboard shows what's available
- Works in any terminal/script
- No dependencies on other apps

**Cons:**
- Still requires some command memorization
- Terminal-based (not GUI)

---

## Option 5: AI Assistant Integration

**Use Claude/ChatGPT as interface:**

Since you work with Claude Code:

```
You: "Add presentation: Q4 board deck, due Nov 15, high priority"

Claude: *Runs work pres add with parsed parameters*
        ✅ Created pres-20251027-001
        
You: "Start working on Q4 deck"

Claude: *Finds presentation by title, runs work pres start*
        ✅ Status: planned → in-progress
        
You: "What presentations do I have?"

Claude: *Runs work pres list*
        📊 3 presentations:
        - Q4 Board (in-progress, due Nov 15)
        - Product Vision (planned, due Dec 1)
        - Investor Update (planned, due Dec 15)
```

**Implementation:**

The `work` CLI becomes a tool that Claude Code can call:

```javascript
// Claude Code can execute bash commands
await bash(`work pres add "${url}" --title "${title}" --deadline ${deadline}`);
```

**Pros:**
- Natural language interface
- Zero memorization
- Claude can parse your intent
- Already in your workflow
- Can combine with other context ("Show me presentations due this month with emails from those people")

**Cons:**
- Requires Claude Code to be running
- Depends on AI understanding
- Might misinterpret complex requests

---

## Recommended Approach: Multi-Tiered

**Combine multiple options for different contexts:**

### Tier 1: Interactive Menu (For Exploration)

```bash
work          # Interactive menu, guided prompts
work pres     # Presentations submenu
work paper    # Papers submenu
```

Use when:
- First time using
- Exploring options
- Don't remember exact syntax

### Tier 2: Direct Commands (For Power Users)

```bash
work pres add <url> --title "..." --deadline 2025-11-15
work pres start pres-20251027-001
work paper add ~/Downloads/paper.pdf --title "..."
```

Use when:
- Know what you want
- Scripting
- Want to be fast

### Tier 3: Dashboard Reference (For Reminders)

Dashboard shows:
- Command examples
- IDs to copy
- Quick links

Use when:
- Need to remember syntax
- Want to copy presentation ID
- Looking for specific command

### Tier 4: AI Assistant (For Convenience)

```
"Add that slide deck I'm working on for the board meeting"
"Start reading the AI paper Kevin sent"
"What's on my plate this week?"
```

Use when:
- In flow with Claude Code
- Natural language easier
- Want context-aware help

---

## Implementation Plan

### Phase 1: Core CLI (Week 1)

**Build `work` command:**

```javascript
// tools/work-cli.js
#!/usr/bin/env node

const { program } = require('commander');

program
  .name('work')
  .description('Manage presentations and papers');

// Presentations
program
  .command('pres')
  .description('Presentation commands')
  .action(() => {
    // If no subcommand, show interactive menu
    presentationsMenu();
  });

program
  .command('pres:add <url>')
  .option('-t, --title <title>')
  .option('-d, --deadline <date>')
  .option('-p, --priority <level>')
  .action(addPresentation);

program
  .command('pres:start <id>')
  .action(startPresentation);

// etc.

program.parse();
```

**Install globally:**

```json
// package.json
{
  "bin": {
    "work": "./tools/work-cli.js"
  }
}
```

```bash
npm link  # Makes 'work' available globally
```

### Phase 2: Interactive Menus (Week 2)

**Add inquirer for interactive mode:**

```bash
npm install inquirer
```

**When called without args:**

```bash
work           # Shows interactive menu
work pres      # Shows presentations menu
work paper     # Shows papers menu
```

### Phase 3: Dashboard Integration (Week 3)

**Add command reference to dashboards:**

```markdown
## 💡 Commands

Copy and paste these commands:

### Add Presentation
```bash
work pres add "PASTE_URL_HERE" \
  --title "PRESENTATION_TITLE" \
  --deadline 2025-11-15 \
  --priority high
```

### Quick Actions
```bash
work pres start pres-20251027-001    # Start this presentation
work pres complete pres-20251027-001 # Mark complete
work pres list                        # View all
```
```

### Phase 4: Keyboard Maestro (Optional, Later)

Create macros for common actions:
- ⌘⌥P → work pres (interactive menu)
- ⌘⌥R → work paper (interactive menu)
- ⌘⌥M → work morning

---

## Decision Matrix

| Option | Ease of Use | Speed | Flexibility | Setup | Recommendation |
|--------|-------------|-------|-------------|-------|----------------|
| Interactive Menu | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **Primary** |
| Direct CLI | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **Power Users** |
| Dashboard Links | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | **Reference** |
| Keyboard Maestro | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | **Optional** |
| AI Assistant | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **Advanced** |

---

## Proposed Solution

**Build Multi-Tiered System:**

1. **Week 1**: Core `work` CLI with both modes:
   - `work pres add <url> --title "..."` (direct)
   - `work pres` (interactive menu)
   
2. **Week 2**: Interactive menus for all actions
   - Guided prompts
   - "What's next?" suggestions
   - Error recovery

3. **Week 3**: Dashboard command reference
   - Examples with IDs to copy
   - Quick copy-paste snippets
   
4. **Later**: Optional enhancements
   - Keyboard Maestro macros
   - Obsidian plugin
   - AI assistant integration

**Start simple, add convenience layers as needed.**

---

## Example Usage Flows

### New User Flow (Interactive)

```bash
$ work

# Follow guided prompts
# No memorization needed
# Discover features as you go
```

### Power User Flow (Direct)

```bash
# Morning: check what's urgent
$ work dash

# Add new presentation quickly
$ work pres add "URL" -t "Q4 Deck" -d 2025-11-15 -p high

# Start working
$ work pres start pres-20251027-001

# Later: finish reading
$ work paper finish paper-20251020-002
```

### Mixed Flow (Realistic)

```bash
# Interactive to explore
$ work pres
> List all presentations

# See presentation in dashboard
# Copy ID from there

# Direct command with copied ID
$ work pres start pres-20251027-001
```

---

**Questions:**

1. Does the multi-tiered approach make sense?
2. Should we start with just the `work` CLI?
3. Any other interaction patterns you prefer?
4. Ready to build Phase 1?
