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
- Pull Apple Reminders → cache + per‑person agendas + full mirror:
  ```bash
  npm run reminders:pull
  ```
- Sync completed items in `reminders/reminders.md` → Apple Reminders:
  ```bash
  npm run reminders:sync
  ```

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
personId: <Colleague>@example.com
name: <Colleague> Hoffman
aliases: [<Colleague>, "R. Hoffman"]
reminders:
  listName: "<Colleague> Hoffman"
---
```

Notes:
- Use `personId` (email) when possible (stable ID).
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

## Keyboard Maestro (quick)

- Daily update macro:
  - Command: `/Users/<Owner>/obs-dailynotes/tools/run_daily.sh`
- Sync macro:
  - Command: `/Users/<Owner>/obs-dailynotes/tools/run_sync.sh`


