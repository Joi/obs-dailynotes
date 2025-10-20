#!/bin/sh
# Change to the script's directory so .env file can be found
cd "$(dirname "$0")"

# Prefer Node via NVM if available; fall back to Homebrew paths if needed
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
  . "/opt/homebrew/opt/nvm/nvm.sh"
elif [ -s "/usr/local/opt/nvm/nvm.sh" ]; then
  . "/usr/local/opt/nvm/nvm.sh"
fi

if command -v nvm >/dev/null 2>&1; then
  nvm install >/dev/null 2>&1 || true
  nvm use >/dev/null 2>&1 || true
else
  if command -v brew >/dev/null 2>&1; then
    export PATH="$(brew --prefix)/bin:$PATH"
  fi
fi

# First, sync any completed checkboxes in Obsidian back to Apple Reminders (silent, non-fatal, full sync)
npm run gtd:sync-full >/dev/null 2>&1 || true

# Refresh today's priority todos from Apple Reminders (silent, non-fatal)
node tools/generateTodayTodos.js >/dev/null 2>&1 || true

# Generate the daily note
DOTENV_CONFIG_DEBUG=false DOTENV_CONFIG_SILENT=true node index.js
