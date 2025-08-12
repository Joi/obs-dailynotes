#!/bin/zsh
set -euo pipefail

# Ensure Homebrew and common bin paths are available (for reminders-cli)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd /Users/joi/obs-dailynotes

# Build/update the People index (non-fatal if People folder is empty)
npm run people:index >/dev/null 2>&1 || true

# Pull latest Reminders snapshot (cache + agendas + full mirror)
# Make non-fatal so daily note generation still proceeds if Reminders sync fails
npm run reminders:pull >/dev/null 2>&1 || true

# Generate today's priority todos file
# Non-fatal; daily note should still generate without this
node tools/generateTodayTodos.js >/dev/null 2>&1 || true

# Generate today's daily note content (silent by default)
node index.js >/dev/null 2>&1

# OCR screenshots in today's note (non-fatal)
node tools/ocr_screenshots.js >/dev/null 2>&1 || true

exit 0


