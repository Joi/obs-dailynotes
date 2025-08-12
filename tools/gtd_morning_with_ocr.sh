#!/bin/bash

# GTD Morning Routine with OCR
# Pulls latest reminders, processes GTD, generates priorities, and runs OCR on screenshots

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
echo "📸 Running OCR on screenshots in daily note..."
node tools/ocr_screenshots.js

echo ""
echo "✅ Morning routine complete!"
echo "📂 Check your GTD dashboard at: GTD/dashboard.md"
echo "📝 OCR text added to daily note (if screenshots found)"
