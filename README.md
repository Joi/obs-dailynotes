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
- Creates task dashboards organized by context and project

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
- [ ] Send proposal #email @computer
- [ ] Review budget #task
```

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
- Full GTD implementation with contexts and projects
- Smart parsing of tags and priorities from reminder titles
- Generates organized task views by context, project, and status
- Two-way sync between Obsidian and Apple Reminders
- Comprehensive dashboard with all GTD categories

### Person Page Management
- Standardized person page format with frontmatter
- Email-based linking to calendar attendees
- Automatic agenda generation for meetings
- CSV import for bulk contact creation
- Smart templates for quick person page creation

## Installation

### Prerequisites
- Node.js 18+ installed
- Google Calendar API access
- macOS with Apple Reminders
- Obsidian vault configured
- Homebrew (for reminders-cli)

### Setup

1. Clone and install:
```bash
git clone <repository-url>
cd obs-dailynotes
npm install
```

2. Install reminders-cli:
```bash
brew install keith/formulae/reminders-cli
```

3. Configure environment (.env):
```env
# Google Calendar OAuth
GCAL_TOKEN_PATH=~/.gcalendar/token.json
GCAL_CREDS_PATH=~/.gcalendar/credentials.json

# Obsidian vault path
DAILY_NOTE_PATH=/path/to/your/Obsidian/vault/journal

# Optional event filters
EVENTS_FILTER=Lunch,Focus Time
```

4. Set up Google Calendar API:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project and enable Calendar API
   - Create OAuth2 credentials (Desktop app)
   - Download JSON to `GCAL_CREDS_PATH`

5. Copy and customize config:
```bash
cp config.example.json config.json
```

## GTD Workflow

### Morning Routine (5 minutes)
```bash
npm run gtd:morning
```
- Pulls latest from Apple Reminders
- Processes GTD tags and contexts
- Generates today's priorities
- Creates/updates GTD dashboard

### Evening Routine (5 minutes)
```bash
npm run gtd:evening
```
- Syncs completed tasks back to Reminders
- Refreshes task views
- Updates waiting-for lists

### Smart Capture Examples

Via Siri or manual entry:
```
"Email Sarah about budget #email @computer !!"
→ Urgent email task requiring computer

"Waiting for contract from vendor #waiting #project:acquisition"
→ Waiting-for item linked to project

"Call dentist #next @calls"
→ Next action for phone context
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

**Contexts:**
- `@computer`, `@home`, `@office`, `@calls`, `@errands`, `@anywhere`, `@online`

**Email Tags:**
- `#email` - General email task
- `#email-reply` - Needs reply
- `#email-waiting` - Sent, awaiting response

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
- `next-actions.md` - Actions by context
- `email-tasks.md` - Email tasks organized
- `waiting-for.md` - Items by person
- `scheduled.md` - Tasks with due dates
- `context-*.md` - Per-context lists
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
- `npm run daily` - Complete daily note generation
- `npm run gtd:morning` - Morning GTD routine
- `npm run gtd:evening` - Evening sync routine
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

```
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
/Users/joi/obs-dailynotes/tools/run_daily.sh
```

2. **Sync Macro** - Complete tasks and refresh:
```bash
/Users/joi/obs-dailynotes/tools/run_sync.sh
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
4. **Sync completed items**: Check boxes and run `npm run reminders:sync`

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