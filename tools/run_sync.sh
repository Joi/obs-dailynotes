#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd /Users/<Owner>/obs-dailynotes

# Sync completed checkboxes in Obsidian back to Apple Reminders
npm run reminders:sync >/dev/null 2>&1 || true

# Refresh the local snapshot after sync
npm run reminders:pull >/dev/null 2>&1 || true

exit 0


