# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Calendar integration tool that fetches today's calendar events and writes them to a daily note file in Markdown format. The tool filters out specific events and formats meetings with their details including time, attendees, and meeting links.

## Commands

### Running the application
```bash
# Direct execution
node index.js

# Using the shell script
./dailynotejs.sh
```

### Installing dependencies
```bash
npm install
```

## Architecture

### Core Components

1. **OAuth2 Authentication** (index.js:82-124)
   - Uses Google OAuth2 for calendar access
   - Stores credentials in `~/.gcalendar/credentials.json`
   - Stores access token in `~/.gcalendar/token.json`

2. **Event Processing Pipeline** (index.js:314-332)
   - Fetches events for today from Google Calendar API
   - Filters out events matching patterns in `EVENTS_FILTER`
   - Parses events through multiple parsers (Google Hangout, Zoom, other meeting types)
   - Formats and writes events to daily note file

3. **Meeting Parsers**
   - `parseGoogleHangout()` - Extracts Google Meet/Hangout details
   - `parseZoom()` - Extracts Zoom meeting details from various event fields
   - `parseOtherMeetingType()` - Handles non-VC meetings and physical locations

### Key Configuration

- **Daily note path**: `/Users/<Owner>/switchboard/dailynote/` (hardcoded in PATH_PREFIX)
- **Event filters**: Currently filters out events containing "Tateki / <Owner>"
- **Time handling**: Adjusts for local timezone when fetching events

### Output Format

Daily notes are created with filename pattern: `YYYY-MM-DD.md` and include:
- Header with navigation links to previous/next days
- Task sections (ASAP, Email for Reply, Some Day) with task queries
- Meeting entries formatted as:
  ```markdown
  ### Meeting Title #mtg
  - HH:MM - HH:MM (Attendee1, Attendee2) [Call Link](url) [[YYYY-MM-DD-HHMM]]
  ```

## Development Notes

- The application uses Node.js with the `googleapis` package
- Authentication flow requires manual code entry on first run
- Meeting URLs are extracted from location, description, or summary fields
- Non-VC meetings display physical location instead of call link