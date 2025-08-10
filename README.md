# Obsidian Daily Notes & GTD System

A Node.js toolkit that integrates Google Calendar events, Apple Reminders, and Getting Things Done (GTD) methodology to create an organized daily workflow in Obsidian.

## ⚠️ Active Development Notice

This codebase is under active development with frequent refactoring and restructuring. If you're interested in contributing, please open an issue or reach out first so we can coordinate efforts and avoid conflicts.

## What This Does

This toolkit automatically:

- Pulls your Google Calendar events into daily markdown notes
- Syncs Apple Reminders as GTD-organized tasks
- Links meeting attendees to person pages with contact information
- Generates agenda items for each person you're meeting
- Creates task dashboards organized by project and status

All data is stored as plain Markdown files in your Obsidian vault, giving you full control over your information.

## About Obsidian

[Obsidian](https://obsidian.md) is a note-taking application that works with local Markdown files. It features bidirectional linking, graph visualization, and extensive customization through plugins. Your data stays on your computer as plain text files.

To get started:

1. Download Obsidian from [obsidian.md](https://obsidian.md)
2. Create a vault (a folder on your computer)
3. Configure this toolkit to point to your vault

## Why Markdown

Markdown is a plain text format that:

- Works in any text editor
- Tracks well in Git
- Will be readable decades from now
- Converts easily to HTML, PDF, or other formats

Example:

```markdown
# Meeting Notes

- [[John Smith]], [[Sarah Chen]]
- [ ] Send proposal #email
- [ ] Review budget #task
```text

## Architecture

This codebase uses JavaScript for API integrations and Python for file operations. Scripts run on-demand or via automation to keep your notes synchronized with external services while maintaining all data locally in an open format.

See [INTEGRATION_ARCHITECTURE.md](INTEGRATION_ARCHITECTURE.md) for detailed system design and [GTD_SYSTEM_DESIGN.md](GTD_SYSTEM_DESIGN.md) for the complete GTD implementation guide.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features, improvements, and sync strategy including private folders and team collaboration.

## Core Features

### Daily Notes Generation

- Fetches and formats Google Calendar events into daily notes
- Parses meeting details (Google Meet, Zoom links, locations)
- Creates markdown-formatted notes with navigation links
- Automatically links attendees to person pages
- Injects per-person agenda items from Apple Reminders

### GTD Processing System

- Full GTD implementation centered on projects and statuses (contexts deprecated)
- Smart parsing of tags and priorities from reminder titles
- Generates organized task views by project and status
- Two-way sync between Obsidian and Apple Reminders
- Comprehensive dashboard with all GTD categories

**Why Apple Reminders?**
Apple Reminders serves as the "ground truth" for tasks because it:

- **Shares with others** - Create shared lists with family, teammates, or assistants
- **Syncs across devices** - iPhone, iPad, Mac, Apple Watch all stay in sync
- **Works with Siri** - Capture tasks hands-free while driving or walking
- **Collaborative editing** - Multiple people can add/complete tasks in real-time
- **Native notifications** - System-level alerts that don't require Obsidian to be open

This creates a reliable, shared task system where Obsidian provides the thinking/linking layer while Apple Reminders handles the operational layer.

### Person Page Management

- Standardized person page format with frontmatter
- Email-based linking to calendar attendees
- Automatic agenda generation for meetings
- CSV import for bulk contact creation
- Smart templates for quick person page creation

## Installation

### About Package Management

This project follows a **Homebrew-first** approach on macOS. We prefer Homebrew for system tools and utilities because it:

- Manages dependencies automatically
- Keeps tools updated easily with `brew upgrade`
- Avoids Python/Node version conflicts
- Provides pre-compiled binaries (faster than building from source)

**What is Homebrew?**
[Homebrew](https://brew.sh) is the "missing package manager for macOS" - it installs command-line tools and applications that Apple doesn't include by default. Think of it like an app store for developer tools.

To install Homebrew (if you don't have it):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Prerequisites

1. **Install system tools via Homebrew:**

```bash
# Install Node.js (for the main application)
brew install node

# Install reminders CLI (for Apple Reminders integration)
brew install keith/formulae/reminders-cli

# Install Python and pytest (for testing only)
brew install python@3.12
brew install pytest
```

1. **Required access:**

- Google Calendar API credentials
- macOS with Apple Reminders
- Obsidian vault configured

### Setup

1. **Clone the repository:**

```bash
git clone https://github.com/<Owner>/obs-dailynotes
cd obs-dailynotes
```

1. **Install JavaScript dependencies (using npm):**

```bash
# npm (Node Package Manager) installs JavaScript libraries locally in node_modules/
# This creates a package-lock.json to ensure everyone gets the same versions
npm install
```

1. **For Python testing (optional - only if you're developing):**

```bash
# Create a virtual environment to isolate Python dependencies
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Install test dependencies
pip install -r requirements-test.txt

# When done, deactivate the virtual environment
deactivate
```

**Why virtual environments?**
Virtual environments (`venv`) create isolated Python installations for each project. This prevents conflicts when different projects need different library versions. Always use `venv` for Python development - it's like having a separate, clean Python install just for this project.

1. **Configure environment (.env):**

```env
# Google Calendar OAuth
GCAL_TOKEN_PATH=~/.gcalendar/token.json
GCAL_CREDS_PATH=~/.gcalendar/credentials.json

# Obsidian vault path
DAILY_NOTE_PATH=/path/to/your/Obsidian/vault/dailynote

# Optional event filters
EVENTS_FILTER=Lunch,Focus Time
```

1. Optionally set `REMINDERS_MOCK_FILE` during testing to point `pullRemindersWithShared` at a mock JSON file.

2. **Set up Google Calendar API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project and enable Calendar API
   - Create OAuth2 credentials (Desktop app)
   - Download JSON to `GCAL_CREDS_PATH`

3. **Copy and customize config:**

```bash
cp config.example.json config.json
```

### Package Management Best Practices

**Hierarchy of package managers (prefer in this order):**

1. **Homebrew** - For system tools and utilities
2. **npm** - For JavaScript packages (always use package.json)
3. **pip** - For Python packages (always use venv)

**When to use each:**

- **Homebrew**: Command-line tools, system utilities, language runtimes
- **npm**: JavaScript libraries specific to this project
- **pip + venv**: Python libraries for testing/development only

**Keeping dependencies updated:**

```bash
# Update Homebrew packages
brew update && brew upgrade

# Update npm packages (respects package.json version constraints)
npm update

# Update Python packages in venv
source venv/bin/activate
pip install --upgrade -r requirements-test.txt
```

## GTD Workflow

### Morning Routine (5 minutes)

```bash
npm run gtd:morning
```

- Pulls latest from Apple Reminders
- Processes GTD tags
- Generates today's priorities
- Creates/updates GTD dashboard

### Sync Tasks with Reminders

```bash
npm run gtd:sync
```

- **Full two-way sync** with Apple Reminders:
  - Syncs completed tasks back to Reminders
  - Syncs edited task text (changes you make in Obsidian)
  - Creates new reminders from tasks added in Obsidian
  - Auto-detects new tasks in meeting agendas
- Pulls latest changes from Reminders
- Refreshes all task views
- Adds reminder IDs to new tasks automatically

Run this whenever you want to sync between Obsidian and Apple Reminders - after making changes in either system.

**New Task Detection**: The sync will find tasks in meeting sections even without IDs:

```markdown
### Team Meeting #mtg

- Agenda for [[John Smith]]:
  - [ ] Review proposal ← Will create in "John Smith" list
  - [ ] Send follow-up ← Auto-assigned to John's list
```

### Smart Capture Examples

Via Siri or manual entry:

```text
"Email Sarah about budget #email !!"
→ Urgent email task

"Waiting for contract from vendor #waiting #project:acquisition"
→ Waiting-for item linked to project

"Call dentist #next"
→ Next action to do
```

### GTD Tags Reference

**Priority Markers:**

- `!!` - Urgent (do today)
- `!` - High priority (this week)

**GTD Categories:**

- `#inbox` - Unprocessed items
- `#next` - Next actions
- `#waiting` - Waiting for someone
- `#someday` - Someday/maybe
- `#project:name` - Project-specific

**Task Types:**

- `#email` - Email task
- `#email-reply` - Needs reply
- `#email-waiting` - Sent, awaiting response
- `#call` - Phone call needed
- `#errand` - Out and about task

## Generated Files

### Daily Notes (`YYYY-MM-DD.md`)

```markdown
date: 2024-01-15

[[2024-01-14]] << Previous | Next >> [[2024-01-16]]

## Meetings

### 🎥 Team Standup #mtg

- 10:00 - 10:30 ([[John Smith]], [[Sarah Chen]])
- [Meet Link](https://meet.google.com/...)
- Agenda for [[John Smith]]:
  - [ ] Review Q4 proposal
  - [ ] Discuss budget allocation
```

### GTD Views (`GTD/`)

- `dashboard.md` - Complete GTD overview
- `next-actions.md` - Next actions list
- `email-tasks.md` - Email tasks organized
- `waiting-for.md` - Items by person
- `scheduled.md` - Tasks with due dates
- `project-*.md` - Per-project views

## Testing

Run the comprehensive test suite:

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

## NPM Scripts

### Daily Operations

- `npm run daily` - Generate daily note with calendar events
- `npm run gtd:morning` - Morning GTD routine (pull + process)
- `npm run gtd:sync` - Sync changes between Obsidian and Reminders
- `npm run gtd:process` - Process GTD tags only

### People Management

- `npm run people:index` - Build person index
- `npm run people:import-csv [file]` - Import contacts
- `npm run people:generate` - Extract from daily notes

### Reminders Sync

- `npm run reminders:pull` - Fetch from Apple Reminders
- `npm run reminders:sync` - Sync completed tasks back
- `npm run reminders:generate` - Create agenda files

### Testing & Maintenance

- `npm test` - Run all tests
- `npm run test:watch` - Watch mode
- `npm run fix:links` - Fix broken wiki links
- `npm run fix:attachments` - Fix attachment paths

## File Structure

```text
obs-dailynotes/
├── index.js                      # Main daily note generator
├── lib/                          # Core libraries
│   ├── auth.js                   # Google OAuth
│   ├── calendar.js               # Calendar integration
│   └── parsers.js                # Event parsing
├── tools/                        # Utility scripts
│   ├── processGTD.js             # GTD processor
│   ├── syncReminders.js          # Two-way sync
│   ├── buildPeopleIndex.js       # Person indexer
│   ├── organize_switchboard.py   # Switchboard organizer
│   └── fix_broken_links.py       # Link fixer
├── tests/                        # Test suite
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
├── GTD_SYSTEM_DESIGN.md          # GTD implementation guide
├── INTEGRATION_ARCHITECTURE.md   # System architecture
├── TESTING.md                    # Testing documentation
└── config.json                   # Your configuration
```

## Automation

### Keyboard Maestro (macOS)

Create macros for one-click operations:

1. **Daily Update Macro** - Pull reminders and generate note:

```bash
/Users/<Owner>/obs-dailynotes/tools/run_daily.sh
```

1. **Sync Macro** - Complete tasks and refresh:

```bash
/Users/<Owner>/obs-dailynotes/tools/run_sync.sh
```

### Shell Scripts

The `tools/` directory contains automation scripts:

- `gtd_morning.sh` - Complete morning routine
- `gtd_evening.sh` - Evening sync and refresh
- `run_daily.sh` - Full daily note generation
- `run_sync.sh` - Sync completed tasks

## Troubleshooting

### Common Issues

**Google Calendar Auth:**

- Delete token at `GCAL_TOKEN_PATH` and re-authenticate
- Check timezone settings in config.json

**Reminders Sync:**

- Ensure reminders-cli is in PATH (`/opt/homebrew/bin`)
- Check Apple Reminders permissions in System Settings

**Missing Events:**

- Verify `EVENTS_FILTER` in .env
- Check calendar permissions in Google

**Person Page Links:**

- Run `npm run people:index` to rebuild index
- Verify email addresses in frontmatter

## Person Pages Example

### Creating a Person Page

Create a file named `Taro Chiba.md` with this frontmatter:

```markdown
---
tags: [people]
name: Taro Chiba
aliases: [Taro, T. Chiba]
emails: [taro@example.com]
reminders:
  listName: "Taro Chiba"
---
```

### Workflow with Taro Chiba

1. **Create Apple Reminders list**: Name it "Taro Chiba" and add agenda items
2. **Generate daily note**: Run `npm run daily`
3. **Meeting with Taro appears as**:

```markdown
### Meeting with [[Taro Chiba]]

- 14:00 - 15:00
- Agenda for [[Taro Chiba]]:
  - [ ] Discuss project timeline
  - [ ] Review budget proposal
```

1. **Sync completed items**: Check boxes and run `npm run reminders:sync`

## Language Choice: JavaScript and Python

This project strategically uses both JavaScript and Python:

**JavaScript (Node.js)** for:

- Google Calendar API integration
- Real-time reminder processing
- Main application logic
- OAuth authentication flows

**Python** for:

- Batch file operations (`fix_broken_links.py`)
- Complex text processing (`organize_switchboard.py`)
- Testing infrastructure (`run_tests.py`)
- File system utilities

This hybrid approach maximizes development efficiency and maintainability. See [INTEGRATION_ARCHITECTURE.md](INTEGRATION_ARCHITECTURE.md) for detailed architectural decisions.

## Contributing

See [INTEGRATION_ARCHITECTURE.md](INTEGRATION_ARCHITECTURE.md) for system design and contribution guidelines.

## License

MIT
