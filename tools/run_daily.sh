#!/bin/zsh
set -euo pipefail

# Ensure Homebrew and common bin paths are available (for reminders-cli)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd /Users/joi/obs-dailynotes

# Build/update the People index (non-fatal if People folder is empty)
npm run people:index >/dev/null 2>&1 || true

# Pull latest Reminders snapshot (cache + agendas + full mirror)
npm run reminders:pull >/dev/null 2>&1

# Generate today's daily note content (silent by default)
node index.js >/dev/null 2>&1

exit 0


