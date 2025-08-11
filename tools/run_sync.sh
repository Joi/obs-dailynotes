#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd /Users/joi/obs-dailynotes

# Sync completed checkboxes in Obsidian back to Apple Reminders (preferred flow)
npm run gtd:sync >/dev/null 2>&1 || true

# No separate pull needed; gtd:sync performs pull + process

exit 0


