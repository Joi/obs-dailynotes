## Usage Cheatsheet

### Daily
- Run daily note (KM macro or CLI):
  - Keyboard Maestro: “Daily Note Update” → runs `/Users/<user>/obs-dailynotes/tools/run_daily.sh`
  - CLI: `npm run daily`

### GTD
- Morning: `npm run gtd:morning`
- Sync (dashboard first): `npm run gtd:sync`

### Gmail
- List flagged: `npm run gmail:flagged -- --limit 25`
- Import flagged to Reminders (read‑only): `npm run gmail:import-flagged`

### Keyboard Maestro triggers (suggested)
- Daily Note Update: hotkey `⌃⌥⌘ D` → runs `tools/run_daily.sh`
- GTD Morning: hotkey `⌃⌥⌘ M` → runs `npm run gtd:morning`
- GTD Sync: hotkey `⌃⌥⌘ S` → runs `npm run gtd:sync`
- Gmail Import Flagged: hotkey `⌃⌥⌘ G` → runs `npm run gmail:import-flagged`

Adjust to your preferred keybindings. Ensure the working directory is `/Users/<user>/obs-dailynotes` for CLI steps.

