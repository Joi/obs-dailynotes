#!/bin/bash

# GTD Evening Routine  
# Syncs completed tasks back to Apple Reminders and refreshes GTD views

cd "$(dirname "$0")/.."

echo "🌙 Starting GTD Evening Routine..."
echo "================================"

echo "📤 Syncing completed tasks to Apple Reminders..."
npm run reminders:sync

echo ""
echo "📥 Pulling updated state..."
npm run reminders:pull

echo ""
echo "🏷️ Regenerating GTD views..."
npm run gtd:process

echo ""
echo "✅ Evening routine complete!"
echo "📊 Review your progress at: GTD/dashboard.md"