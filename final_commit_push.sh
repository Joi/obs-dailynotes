#!/bin/bash
cd /Users/<Owner>/obs-dailynotes

echo "🚀 Starting commit and push process..."
echo "======================================="

# Clean up temporary files
if [ -f git_commit_ocr.sh ]; then
    echo "Cleaning up old commit script..."
    rm -f git_commit_ocr.sh
fi

if [ -f commit_and_push.sh ]; then
    rm -f commit_and_push.sh
fi

# Check current status
echo -e "\n📊 Current Git Status:"
git status --short

# Add all our changes
echo -e "\n📁 Adding files to staging..."
git add tools/ocr_screenshots.js
git add tools/gtd_morning_with_ocr.sh  
git add package.json
git add SCRIPTS.md
git add create_scripts_symlink.sh

# Show what we're about to commit
echo -e "\n📝 Changes to be committed:"
git diff --cached --stat

# Commit with detailed message
echo -e "\n💾 Committing changes..."
git commit -m "feat: Add OCR functionality and consolidate SCRIPTS.md

✨ New Features:
- Added OCR tool to extract text from screenshots in daily notes
- Created npm scripts: 'ocr' and 'gtd:morning-ocr'
- Enhanced morning routine with integrated OCR processing

📸 OCR Capabilities:
- Supports both Tesseract and macOS Vision Framework
- Extracts up to 15 lines of text per image (configurable)
- Smart image path resolution across multiple directories
- Formats output with clear subsections for each image
- Makes screenshot content searchable in Obsidian

📚 Documentation:
- Added comprehensive OCR section to SCRIPTS.md
- Fixed brew install commands (keith/formulae/reminders-cli)
- Prepared for SCRIPTS.md consolidation via symlink
- Added troubleshooting guide and use cases

🔧 Technical Changes:
- Enhanced ocr_screenshots.js with formatOCRText() function
- Improved resolveImagePath() to check multiple locations
- Created gtd_morning_with_ocr.sh wrapper script
- Updated package.json with new npm run commands

Use Cases: Meeting notes, whiteboards, presentations, code snippets"

# Push if commit succeeded
if [ $? -eq 0 ]; then
    echo -e "\n📤 Pushing to remote repository..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo -e "\n✅ SUCCESS! All changes committed and pushed."
        echo -e "\n📊 Latest commit:"
        git log --oneline -1
        echo -e "\n🎉 OCR feature is now live!"
        echo "   Try it: cd /Users/<Owner>/obs-dailynotes && npm run ocr"
    else
        echo -e "\n⚠️ Push failed. You may need to pull first or check your connection."
        echo "   Try: git pull origin main && git push origin main"
    fi
else
    echo -e "\n❌ Commit failed. Current status:"
    git status
fi

# Clean up this script too
echo -e "\n🧹 Cleaning up commit script..."
rm -f final_commit_push.sh

echo -e "\n📋 Don't forget to create the SCRIPTS.md symlink:"
echo "   cd /Users/<Owner>/switchboard"
echo "   ln -s /Users/<Owner>/obs-dailynotes/SCRIPTS.md SCRIPTS.md"
