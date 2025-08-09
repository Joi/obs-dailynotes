#!/bin/bash

# GTD Morning Routine
# Pulls latest reminders, processes GTD, and generates today's priorities

cd "$(dirname "$0")/.."

echo "☀️ Starting GTD Morning Routine..."
echo "================================"

echo "📥 Pulling latest from Apple Reminders..."
npm run reminders:pull

echo ""
echo "🏷️ Processing GTD tags and contexts..."
npm run gtd:process

echo ""
echo "📌 Generating today's priorities..."
node tools/generateTodayTodos.js

echo ""
echo "✅ Morning routine complete!"
echo "📂 Check your GTD dashboard at: GTD/dashboard.md"