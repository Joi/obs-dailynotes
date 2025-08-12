# Scripts & Automation Guide

This page summarizes the scripts, exact commands, and when to run them.

## Prerequisites

- Install `reminders` CLI (Apple Reminders):

  ```bash
  brew install reminders-cli
  ```

- Configure `.env` in this repo with `DAILY_NOTE_PATH`, `GCAL_TOKEN_PATH`, `GCAL_CREDS_PATH`.
- Ensure `.env` and `config.json` are set up per README.

## One-click scripts (recommended)

- Daily update (People index → Pull Reminders → Generate today’s note):

  ```bash
  /Users/<Owner>/obs-dailynotes/tools/run_daily.sh
  ```

- Sync completed checkboxes back to Apple Reminders, then refresh cache:

  ```bash
  /Users/<Owner>/obs-dailynotes/tools/run_sync.sh
  ```

Tip: Trigger these via Keyboard Maestro “Execute Shell Script”.

## NPM scripts

- Rebuild the People index from person pages’ frontmatter:

  ```bash
  npm run people:index
  ```
## PDFs recommended by people (workflow)

Add a recommended PDF for a person; the script will download/copy the PDF, create a notes page, add an Apple Reminder, and link it on the person’s page under “Recommended PDFs”.

Command:

```bash
node tools/addPdfNote.js \
  --person "Full Name" \
  --url "https://example.com/file.pdf" \
  --title "Paper Title" \
  --due 2025-09-01
```

Options:
- `--file /path/to/local.pdf` instead of `--url` to import a local file
- `--due YYYY-MM-DD` sets a due date on the Reminder

What it does:
- Saves PDF to `~/switchboard/Resources/PDFs/<slug>.pdf`
- Creates `~/switchboard/Resources/PDFs/<slug>.md` with frontmatter and sections (Notes, Highlights)
- Adds Apple Reminders task: “Read PDF: <title>”
- Upserts a link under `## Recommended PDFs` on the person’s page

Prereqs:
- `brew install reminders-cli`
- Ensure `DAILY_NOTE_PATH` is set in `.env` so the script can locate `people.index.json`

Details:
- Person list selection for the Reminder (in order):
  1) The person’s page frontmatter `reminders.listName` if present and not a template (e.g., ignores `{{title}}`)
  2) `people.index.json` entry’s `reminders.listName`
  3) Fallback to a `Reading` list
- If the target list doesn’t exist, the tool attempts to create it automatically.
- The person page is linked with an Obsidian wikilink under a `## Recommended PDFs` section (created if missing). Duplicate links are avoided.
- The notes file includes: `title`, `added` ISO timestamp, `recommended_by`, `pdf_path`, optional `pdf_url`, and `tags: [pdf, reading]`.

Troubleshooting:
- “reminders: command not found” → `brew install reminders-cli`
- “Failed to add reminder task” → ensure the list name is concrete (avoid templates like `{{title}}`) or set a valid `reminders.listName` on the person page; the tool will fallback to `Reading` and auto-create lists when possible.

- Pull Apple Reminders → cache + per‑person agendas + full mirror:

  ```bash
  npm run reminders:pull
  ```

- Sync completed items in `reminders/reminders.md` → Apple Reminders:

  ```bash
  npm run reminders:sync
  ```

## MCP servers and related scripts

For full details, see [tools/mcpServers/README.md](tools/mcpServers/README.md).

- `tools/mcpClient.js` (client launcher/caller)
  - Launches MCP servers (e.g., Gmail) via `MCP_GMAIL_CMD`/`MCP_GMAIL_ARGS`
  - Fetches Gmail context per email and caches under `data/people_cache/`
  - Respects per‑person frontmatter `gmail_deep: true` or global `GMAIL_DEEP=1`

- `tools/mcpServers/gmailServer.js` (Gmail MCP server)
  - JSON‑RPC over stdio; provides `gmail.searchThreads` and `gmail.searchMessages`
  - Scope:
    - Default metadata
    - Deep mode (`GMAIL_DEEP=1` or `GMAIL_SCOPE=readonly`) uses readonly and returns safe body previews

- `tools/mcpServers/bootstrapGmailAuth.js` (OAuth bootstrap)
  - Step 1: print auth URL
  - Step 2: save token via `GMAIL_OAUTH_CODE`

- `tools/runAllPeople.js`
  - Iterates person pages; if an email exists, invokes `mcpClient.js` with Gmail server
  - If `gmail_deep: true` in frontmatter, sets `GMAIL_DEEP=1`

- `tools/batchEnrichPeople.js`
  - Batch variant of the above; tolerant of failures; honors `gmail_deep`

Quick example (standalone):

```bash
cd /Users/<Owner>/obs-dailynotes
PERSON_EMAIL="user@example.com" \
MCP_GMAIL_CMD="node" MCP_GMAIL_ARGS="tools/mcpServers/gmailServer.js" \
node tools/mcpClient.js | cat
```

## Workflow: enabling gmail_deep and enriching a page

Enable deep Gmail fetching for a person and enrich their page with a deep Gmail link/summary:

1. Set the per-person flag in the person page frontmatter:

   ```markdown
   ---
   gmail_deep: true
   ---
   ```

   - Optional: to force deep globally for a run, export `GMAIL_DEEP=1`.

2. Refresh Gmail context for that person (uses the MCP Gmail server):

   ```bash
   cd /Users/<Owner>/obs-dailynotes
   node tools/refreshGmailForPerson.js "Taro Chiba"
   ```

   - This writes `data/people_cache/<person>.json` with deep previews when enabled.

   - Tip: Use `--deep` to force deep and persist `gmail_deep: true` to the person page frontmatter:

     ```bash
     node tools/refreshGmailForPerson.js --deep "Taro Chiba"
     ```

3. Run enrichment to update the person page (and write private notes). This will also add a subtle marker on the public page indicating a private file exists:

   ```bash
   cd /Users/<Owner>/obs-dailynotes
   PERSON_KEY="Taro Chiba" node tools/enrichFromLLM.js
   ```

   - The public page gains enriched frontmatter/public sections.
   - The private page is written to `~/switchboard/Private/People/<slug>.md`.
   - The public page will receive a small 〔p〕 marker (and an HTML comment) to indicate a corresponding private page exists.

## Typical flows

- Morning (create/update today’s note):
  1) `/Users/<Owner>/obs-dailynotes/tools/run_daily.sh`

- After checking off items in the Reminders mirror:
  1) `/Users/<Owner>/obs-dailynotes/tools/run_sync.sh`

- After adding/editing a person page frontmatter (name/aliases/personId/reminders.listName):
  1) `npm run people:index`
  2) `npm run reminders:pull`
  3) Run daily update (optional): `node index.js` or `tools/run_daily.sh`

- After creating/changing a Reminders list for a person:
  1) Ensure the page has `reminders.listName: "Full Name"` (or the exact list name)
  2) `npm run reminders:pull`

## Where things appear

- Daily note (under `DAILY_NOTE_PATH`):
  - Header, Meetings, and “Reminders (macOS)” transclusion of `reminders.md`.
  - Per‑meeting “Agenda” sub-lists (when attendees match person pages).

- Person pages (at vault root):
  - Agenda from Apple Reminders is auto-inserted at the top between:
    - `<!-- BEGIN REMINDERS AGENDA -->` … `<!-- END REMINDERS AGENDA -->`

- Reminders artifacts (in vault):
  - `reminders/reminders_cache.json` (byList, byPerson)
  - `reminders/reminders.md` (full mirror for checkbox sync)
  - `reminders/agendas/<Full Name>.md` (standalone per‑person agendas)

## People page frontmatter (example)

```markdown
---
name: Taro Chiba
aliases: [Taro, "T. Chiba"]
emails: [taro@example.com]
reminders:
  listName: "Taro Chiba"
---
```

Notes:
- Prefer `emails` for identity and disambiguation (personId is deprecated).
- `reminders.listName` must match the Apple Reminders list for that person.
- `aliases` help match attendee names and list names that vary.

## Troubleshooting

- Agenda missing under meetings:
  - Check person page exists and `name`/`aliases` match the attendee names.
  - Check `reminders.listName` matches the Reminders list name.
  - Run: `npm run people:index && npm run reminders:pull && node index.js`.

- No Reminders mirror in daily note:
  - Ensure `reminders.md` exists in the vault (created by `reminders:pull`).
  - The daily note embeds `![[reminders.md]]` and also shows a Tasks fallback block.

- Meetings duplicate or wrong order:
  - The generator writes a single MEETINGS block; rerun the script—it replaces in place.

- A meeting is missing after you changed filters mid‑day:
  - Check `.env` `EVENTS_FILTER`. The generator excludes any event whose title matches one of the comma‑separated terms.
  - Rerun the daily generator (Keyboard Maestro macro or `node index.js`) to upsert the `MEETINGS` block using the updated filters.
  - For a one‑off include, run with a temporary override:

    ```bash
    EVENTS_FILTER="<filters without the specific title>" node index.js
    ```

## Keyboard Maestro (quick)

- Daily update macro:
  - Command: `/Users/<Owner>/obs-dailynotes/tools/run_daily.sh`
- Sync macro:
  - Command: `/Users/<Owner>/obs-dailynotes/tools/run_sync.sh`


