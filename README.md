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

2. Install dependencies:
```bash
npm install
```

3. Set up Google Calendar API credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Calendar API
   - Create OAuth2 credentials
   - Download credentials and save as `credentials.json` in project root

## Configuration

Edit `index.js` to customize:

- **Daily note path**: Update `PATH_PREFIX` (currently `/Users/<Owner>/switchboard/dailynote/`)
- **Event filters**: Modify `EVENTS_FILTER` array to exclude specific events
- **Date format**: Adjust date formatting in `getCalendarItemsForDate()`

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
- Create credentials folder at `~/.gcalendar/`
- Store authentication token for future use
- Generate a daily note file at configured path

## Daily Note Format

Generated files follow the pattern: `YYYY-MM-DD.md`

Example content:
```markdown
[< 2024-01-14](2024-01-14) | [2024-01-16 >](2024-01-16)

## ASAP
```dataview
task from "journal" or "02-Projects"
where status != "x"
where ASAP
```

## Meeting Title #mtg
- 10:00 - 11:00 (Attendee1, Attendee2) [Call Link](https://meet.google.com/...) [[2024-01-15-1000]]
```

## File Structure

```
obs-dailynotes/
├── index.js           # Main application logic
├── package.json       # Node dependencies
├── dailynotejs.sh    # Shell script wrapper
├── credentials.json   # Google OAuth credentials (not in repo)
└── README.md         # This file
```

## Authentication

The tool uses OAuth2 authentication with tokens stored locally:
- Credentials: `~/.gcalendar/credentials.json`
- Access token: `~/.gcalendar/token.json`

Tokens are automatically refreshed when expired.

## Troubleshooting

- **Authentication errors**: Delete `~/.gcalendar/token.json` and re-authenticate
- **Missing events**: Check timezone settings and `EVENTS_FILTER` configuration
- **File write errors**: Verify `PATH_PREFIX` directory exists and has write permissions

## License

MIT