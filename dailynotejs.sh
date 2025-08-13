#!/bin/sh
# Change to the script's directory so .env file can be found
cd "$(dirname "$0")"

# Ensure Homebrew paths for reminders-cli
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# First, sync any completed checkboxes in Obsidian back to Apple Reminders (silent, non-fatal, full sync)
npm run gtd:sync-full >/dev/null 2>&1 || true

# Refresh today's priority todos from Apple Reminders (silent, non-fatal)
node tools/generateTodayTodos.js >/dev/null 2>&1 || true

# Generate the daily note
DOTENV_CONFIG_DEBUG=false DOTENV_CONFIG_SILENT=true node /Users/joi/obs-dailynotes/index.js
