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
  - Task sections with Obsidian queries
  - Meeting entries with timestamps, attendees, and links

## Prerequisites

- Node.js installed
- Google Calendar API access
- Google Cloud project with Calendar API enabled
- OAuth2 credentials

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd obs-dailynotes
```

1. Install dependencies:

```bash
npm install
```

1. Set up Google Calendar API credentials:
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

Copy `config.example.json` to `config.json` and adjust filters/formatting/output as desired. This file controls event filtering, meeting formatting, and the Tasks sections rendered in your note.

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

# Tasks
### ASAP
```tasks
not done
heading includes ASAP
```

## Meetings
### 🎥 Meeting Title #mtg
- 10:00 - 11:00 (Attendee1, Attendee2) [Call Link](https://meet.google.com/...) [[2024-01-15-1000]]
````

## Tasks integration (Obsidian Tasks)

- Requires the Obsidian community plugin: Tasks.
- This tool writes a `# Tasks` section with one or more Tasks query blocks, driven by `output.headerTemplate.taskCategories` in `config.json`.
- To customize, edit `config.json` and adjust categories. Example:

```jsonc
{
  "output": {
    "headerTemplate": {
      "taskCategories": [
        { "name": "Today", "query": "not done\ndue today", "pathIncludes": ["journal", "02-Projects"], "groupBy": "filename", "sortBy": ["due", "priority"] },
        { "name": "Overdue", "query": "not done\ndue before today", "tagIncludes": ["#overdue"], "groupBy": "heading", "sortBy": ["due"] }
      ]
    }
  }
}
```

- Each Tasks block renders a live query of checklist items (`- [ ] ...`) across your vault. Common query lines:

```tasks
not done
due today
path includes "journal"
group by filename
sort by due
```

- Effective use: write tasks anywhere as `- [ ] Do thing 📅 2025-01-15`. The daily note shows them via queries; completing a task updates it in its original note.

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

- **Authentication errors**: Delete the file at `GCAL_TOKEN_PATH` and re-authenticate
- **Missing events**: Check system timezone and your `config.json` filters; verify `EVENTS_FILTER` if set in `.env`
- **File write errors**: Verify `DAILY_NOTE_PATH` exists and is writable

## License

MIT

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

