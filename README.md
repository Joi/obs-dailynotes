# Obsidian Daily Notes Calendar Integration

A Node.js tool that fetches Google Calendar events and creates formatted daily notes for Obsidian.

## Features

- Fetches today's calendar events from Google Calendar
- Filters out specified events (configurable)
- Parses meeting details including:
  - Google Meet/Hangout links
  - Zoom meeting links
  - Physical meeting locations
- Creates markdown-formatted daily notes with:
  - Navigation links to previous/next days
  - Meeting entries with timestamps, attendees, and links

## Prerequisites

- Node.js installed
- Google Calendar API access
- Google Cloud project with Calendar API enabled
- OAuth2 credentials
- macOS Command Line Tools (for reminders-cli installation)
- Homebrew (for installing reminders-cli)

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd obs-dailynotes
```

2. Install dependencies:

```bash
npm install
```

3. Install reminders-cli (for Apple Reminders integration):

```bash
brew install keith/formulae/reminders-cli
```

The `reminders-cli` tool will be installed at: `/opt/homebrew/bin/reminders`

4. Set up Google Calendar API credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Calendar API
   - Create OAuth2 credentials (Desktop app)
   - Download the JSON credentials to a secure location (e.g., `~/.gcalendar/credentials.json`)

## Configuration

### 1) Environment variables (.env)

Create a `.env` file in the project root:

```env
# Where to store the OAuth token generated after first login
GCAL_TOKEN_PATH=~/.gcalendar/token.json

# Path to your Google OAuth credentials JSON
GCAL_CREDS_PATH=~/.gcalendar/credentials.json

# Directory where daily notes will be written (must exist)
DAILY_NOTE_PATH=/path/to/your/Obsidian/vault/journal

# Optional: comma-separated list of event title snippets to filter out
# Example: Lunch,Focus Time,OOO
EVENTS_FILTER=
```

### 2) App configuration (config.json)

Copy `config.example.json` to `config.json` and adjust filters/formatting/output as desired. This file controls event filtering and meeting formatting.

## Usage

Run the script using either method:

```bash
# Direct execution
node index.js

# Using shell script
./dailynotejs.sh
```

On first run, you'll need to:

1. Follow the authorization URL prompted in console
2. Grant calendar access permissions
3. Copy the authorization code
4. Paste it back in the terminal

The script will:

- Store the authentication token at `GCAL_TOKEN_PATH`
- Read the OAuth credentials from `GCAL_CREDS_PATH`
- Generate or append to the daily note file under `DAILY_NOTE_PATH`

## Daily Note Format

Generated files follow the pattern: `YYYY-MM-DD.md`

Example content (actual output depends on your `config.json`):

````markdown
date: 2024-01-15

[[2024-01-14]] << Previous | Next >> [[2024-01-16]]

## Meetings
### 🎥 Meeting Title #mtg
- 10:00 - 11:00 (Attendee1, Attendee2) [Call Link](https://meet.google.com/...) [[2024-01-15-1000]]
````

## File Structure

```text
obs-dailynotes/
├── index.js             # Main application logic
├── lib/                 # Auth, calendar, parsers, writer, utils
├── package.json         # Node dependencies
├── dailynotejs.sh       # Shell script wrapper
├── config.example.json  # Sample application config
├── config.json          # Your application config (not in repo)
├── .env                 # Your environment configuration (not in repo)
└── README.md            # This file
```

## Authentication

The tool uses OAuth2. On the first run, you will be prompted with a URL to grant access. After entering the code:

- Credentials are read from `GCAL_CREDS_PATH`
- Access token is saved to `GCAL_TOKEN_PATH` (created if missing)

Tokens are refreshed automatically when expired.

## Troubleshooting

### Google Calendar Issues

- **Authentication errors**: Delete the file at `GCAL_TOKEN_PATH` and re-authenticate
- **Missing events**: Check system timezone and your `config.json` filters; verify `EVENTS_FILTER` if set in `.env`
- **File write errors**: Verify `DAILY_NOTE_PATH` exists and is writable

### macOS Command Line Tools Issues

If you encounter an error like "Your Command Line Tools (CLT) does not support macOS 15" when installing reminders-cli:

1. Remove the outdated Command Line Tools:
   ```bash
   sudo rm -rf /Library/Developer/CommandLineTools
   ```

2. Install fresh Command Line Tools:
   ```bash
   sudo xcode-select --install
   ```
   
3. A dialog will appear - click "Install" and accept the license agreement

4. Wait for the installation to complete (10-30 minutes)

5. Verify the installation:
   ```bash
   xcode-select --version
   ```

6. Retry the reminders-cli installation:
   ```bash
   brew install keith/formulae/reminders-cli
   ```

### Reminders CLI Path

The `reminders-cli` tool installs to `/opt/homebrew/bin/reminders` on Apple Silicon Macs or `/usr/local/bin/reminders` on Intel Macs. Ensure this directory is in your PATH or use the full path when calling the tool.

## License

MIT

## GTD Reminders integration (Apple Reminders)

This project can mirror Apple Reminders into your Obsidian vault, inject per‑person agendas into meetings, and sync completed items back to Reminders.

- Requirements: `reminders` CLI (`brew install reminders-cli`). Ensure it’s on PATH (`/opt/homebrew/bin`).
- Scripts:
  - `npm run people:index` → builds `people.index.json` from person page frontmatter.
  - `npm run people:import-csv [file.csv]` → imports contacts from CSV file, creating/updating person pages.
  - `npm run reminders:pull` → writes `reminders/reminders_cache.json`, `reminders/reminders.md`, and `reminders/agendas/<Full Name>.md`.
  - `npm run reminders:sync` → completes checked items in `reminders/reminders.md` back to Apple Reminders.
  - Automation scripts: `tools/run_daily.sh`, `tools/run_sync.sh`.

### Person pages

Person pages are markdown files that represent individuals in your network. They use a standardized frontmatter format for integration with calendar events and reminders.

**File naming convention**: `Firstname Lastname.md` (e.g., `Reid Hoffman.md`)

**Standard frontmatter**:
```markdown
---
tags: people                      # required to identify as person page
name: Full Name                   # person's display name
emails: [email1@example.com, email2@example.com]  # list of email addresses
aliases: [Nickname, Alternate Name]  # optional alternate names
reminders:
  listName: "Full Name"           # Apple Reminders list name for this person
---
```

Alternative minimal frontmatter (auto-detected as person page):
```markdown
---
reminders:
  listName: "Full Name"           # having a reminders list auto-identifies as person page
---
```

Notes:
- Pages are auto-detected as person pages if they have: `tags: people`, `emails` list, or a `reminders.listName` field
- The `emails` field accepts both single string and array format (always normalized to array internally)
- You can keep Reminders list names pretty (e.g., just the full name). Matching also supports aliases
- Our index uses `emails`, `name`, `aliases`, and `reminders.listName` to match meeting attendees and route agenda items

### Daily note rendering

- Today’s todos are rendered from the Reminders cache (via `![[reminders.md]]`).
- For each meeting, if any attendee matches a person page (by `name` or `aliases`), the script injects:
  - An “Agenda for [[Full Name]]” sub-list with up to 5 open items from that person’s list.

### Two‑way sync

- Editing `reminders/reminders.md` checkboxes and running `npm run reminders:sync` will mark those tasks complete in Apple Reminders and refresh the cache.
- The daily note includes a transclusion of `reminders.md` so you can check items inline and then run sync.

### Example flow (Reid Hoffman)

1) Create a person page (e.g., `Reid Hoffman.md`) with frontmatter:

```markdown
---
tags: people
name: Reid Hoffman
aliases: [Reid, R. Hoffman]
emails: [reid@example.com]
reminders:
  listName: "Reid Hoffman"
---
```

2) In Apple Reminders, create a list named `Reid Hoffman` and add agenda items there.

3) Generate data and today’s note:

```bash
npm run people:index
npm run reminders:pull
node index.js
```

4) Open today’s daily note. Under any meeting with Reid, you’ll see:

- Attendees as wikilinks (e.g., `[[Reid Hoffman]]`).
- An “Agenda for [[Reid Hoffman]]” section with items from the `Reid Hoffman` Reminders list.

5) To complete tasks:

- Check off boxes in `reminders.md` (transcluded in the daily note), then run:

```bash
npm run reminders:sync
npm run reminders:pull
```

6) Optional: Use Keyboard Maestro

- Daily update: `/Users/joi/obs-dailynotes/tools/run_daily.sh`
- Sync back: `/Users/joi/obs-dailynotes/tools/run_sync.sh`

### Importing contacts from CSV

The CSV import tool allows bulk creation/updating of person pages from exported contact lists.

**Usage**:
```bash
# Import from default CSV file location
node tools/importContactsFromCSV.js

# Import from specific CSV file
node tools/importContactsFromCSV.js /path/to/contacts.csv
```

**Expected CSV format**:
- Must include columns: `First Name`, `Email Addresses` or `Primary Email`
- Optional columns: `Last Name`, `Full Name`
- Email addresses can be semicolon-separated for multiple emails

**What it does**:
- Creates new person pages for contacts not in vault
- Updates existing person pages by adding new email addresses
- Uses `Firstname Lastname.md` naming format
- Sanitizes filenames (replaces invalid characters with hyphens)
- Preserves existing content in person pages (only updates frontmatter)


## Automation with Keyboard Maestro (macOS)

This project includes shell scripts you can trigger from Keyboard Maestro for a one-click workflow.

### Prerequisites

- Ensure `reminders` CLI is installed and in PATH (Homebrew installs to `/opt/homebrew/bin` on Apple Silicon).
- `.env` is configured and `DAILY_NOTE_PATH` points to your Obsidian daily notes folder.

### 1) Daily update macro (pull Reminders → build note)

Creates/updates today’s note with meetings, attendees (wikilinks), and per‑person agendas.

Steps in Keyboard Maestro:

1. Create a new Macro (e.g., “Daily Note – Update”).
2. Add action: “Execute Shell Script”.
3. Command:

   ```bash
   /Users/joi/obs-dailynotes/tools/run_daily.sh
   ```

4. Optional: assign a hotkey (e.g., Ctrl + Option + D).

What it does:

- Builds People index from `People/*.md` frontmatter (non-fatal if empty).
- Pulls Apple Reminders into `reminders/` (cache, per‑person agendas, full mirror).
- Runs the daily generator silently.

### 2) Sync macro (checkboxes → Apple Reminders)

Checks off items in Reminders that you completed in Obsidian, then refreshes the local snapshot.

Steps in Keyboard Maestro:

1. Create a new Macro (e.g., “Reminders – Sync”).
2. Add action: “Execute Shell Script”.
3. Command:

   ```bash
   /Users/joi/obs-dailynotes/tools/run_sync.sh
   ```

4. Optional: run it at the end of the day or bind to a hotkey.

Result:

- Completed checkboxes in `reminders/reminders.md` are marked done in Apple Reminders.
- Local cache and agenda files are refreshed.

