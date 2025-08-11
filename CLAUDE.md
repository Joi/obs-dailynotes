# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Calendar integration tool that fetches today's calendar events and writes them to a daily note file in Markdown format. The tool filters out specific events and formats meetings with their details including time, attendees, and meeting links.

## Package Management Philosophy

**IMPORTANT: Always try Homebrew first before npm or pip**

When installing any tool or dependency:
1. First check if available via Homebrew: `brew search <package>`
2. If not in Homebrew, use npm for JavaScript packages
3. Only use pip as last resort, and always within a virtual environment

Example:

```bash
# ✅ GOOD: Install system tools via Homebrew
brew install node
brew install pytest
brew install keith/formulae/reminders-cli

# ✅ GOOD: JavaScript project dependencies via npm
npm install

# ⚠️ ONLY if needed: Python packages in venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-test.txt
```

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
# System dependencies (Homebrew first!)
brew install node
brew install keith/formulae/reminders-cli

# JavaScript dependencies
npm install

# Python test dependencies (only if developing)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-test.txt
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

- **Daily note path**: set via env `DAILY_NOTE_PATH` in `.env` (e.g., `/Users/joi/switchboard/dailynote/`)
- **Event filters**: Currently filters out events containing "Tateki / Joi"
- **Time handling**: Adjusts for local timezone when fetching events

### Troubleshooting tips for missing meetings

- Check `.env` for `EVENTS_FILTER`. Titles matching any comma‑separated term are excluded.
- If filters were edited after a daily note was created, rerun `./dailynotejs.sh` to upsert the single `MEETINGS` block with the new filter set.
- To temporarily include an excluded event, override for one run:

  ```bash
  EVENTS_FILTER="<your usual filters without the title>" node index.js
  ```

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
- The script is called in Keyboard Maestro so make sure it executes silently from running dailynotejs.sh

### New Memories (keep this section current)

- JS testing: project includes Jest tests under `tests/js/` and a markdownlint test to ensure generated MD is tidy. Run with `npm run test:js`.
- Spacing fix: daily note writer ensures a single blank line between `MEETINGS` and `REMINDERS` sections.
- Contexts deprecated: GTD no longer uses `@contexts`; docs/code updated accordingly.
- MCP client: `tools/mcpClient.js` implements a minimal JSON-RPC client for MCP servers (Gmail/Calendar) and caches per-person context under `data/people_cache/`.
- Calendar-direct context: `tools/fetchCalendarContext.js` reuses existing Google OAuth token to fetch events by attendee and stores in the same cache.
- LLM enrichment: `tools/enrichFromLLM.js` calls OpenAI (GPT‑5 by default, via `OPENAI_API_KEY`) to synthesize public frontmatter and private notes. Private notes go to `~/switchboard/Private/People/<slug>.md`. Respects `#no-enrich` convention (to be implemented in enrich scripts as needed).

## GTD System

The project includes a comprehensive GTD (Getting Things Done) implementation:

### Key Components

1. **GTD Processor** (`tools/processGTD.js`)
   - Parses Apple Reminders for GTD tags (contexts deprecated)
   - Categorizes tasks by urgency, project, and state
   - Generates organized markdown files in `GTD/` folder

2. **GTD Tags**
   - Priority: `!!` (urgent), `!` (high)
   - States: `#inbox`, `#next`, `#waiting`, `#someday`
   - Email: `#email`, `#email-reply`, `#email-waiting`
   - Projects: `#project:name`
   - Contexts: deprecated (do not use)

3. **Generated Files**
   - `GTD/dashboard.md` - Main GTD overview
   - `GTD/next-actions.md` - Next actions list
   - `GTD/email-tasks.md` - Email-specific tasks
   - `GTD/waiting-for.md` - Delegated items
   - `GTD/scheduled.md` - Tasks with due dates
   - Optional project-specific files

4. **Workflows**
   - Morning: `npm run gtd:morning` - Pull reminders, process GTD, generate priorities
   - Evening/Review: `npm run gtd:sync` - Sync checked tasks from Obsidian (GTD dashboard, reminders/*.md, today’s note) back to Apple Reminders, pull fresh cache, regenerate GTD files
   - Weekly Review: Use `templates/weekly-review.md` template

### Sync Sources and Deprecated Scripts

- Tasks checked in `GTD/dashboard.md`, `reminders/reminders.md`, `reminders/reminders_inbox.md`, `reminders/todo-today.md`, and today’s daily note will sync back to Apple Reminders.
- Prefer `npm run gtd:sync` or `npm run reminders:sync-full`.
- Deprecated: `npm run reminders:sync` now delegates to `gtd:sync`.

## Workflow Reminders

- Remember not to commit and push until I tell you
