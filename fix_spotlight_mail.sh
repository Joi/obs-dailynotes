#!/bin/bash
# Quick Spotlight Mail Fix Script

echo "======================================================"
echo "QUICK FIX: Spotlight Not Indexing Mail.app"
echo "======================================================"
echo
echo "Since Mail.app search works but Spotlight doesn't see emails,"
echo "this is likely a Spotlight settings issue."
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Check Spotlight Privacy Settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "1. Open System Settings (or System Preferences)"
echo "2. Search for 'Spotlight' or go to Siri & Spotlight"
echo "3. Click on 'Spotlight Privacy' or 'Privacy' tab"
echo "4. Check if any of these are listed:"
echo "   - Mail"
echo "   - Mail.app" 
echo "   - ~/Library/Mail"
echo "   - Your entire Home folder"
echo
echo "If ANY are listed → Remove them with the minus (-) button"
echo
read -p "Press Enter after checking settings..."
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Force Spotlight to Index Mail"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Running commands to force indexing..."
echo

# Re-register Mail importer
echo "1. Re-registering Mail importer..."
sudo mdimport -r /System/Library/Spotlight/Mail.mdimporter

# Find Mail folder
MAIL_PATH="$HOME/Library/Mail"
if [ ! -d "$MAIL_PATH" ]; then
    MAIL_PATH="$HOME/Library/Containers/com.apple.mail/Data/Library/Mail"
fi

if [ -d "$MAIL_PATH" ]; then
    echo "2. Found Mail at: $MAIL_PATH"
    echo "3. Forcing import (this may take a few minutes)..."
    mdimport -d1 "$MAIL_PATH"
else
    echo "⚠️  Could not find Mail folder!"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Verify It's Working"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Waiting 10 seconds for indexing to start..."
sleep 10

COUNT=$(mdfind "kMDItemKind == 'Mail Message'" 2>/dev/null | wc -l)
echo "Currently indexed messages: $COUNT"

if [ "$COUNT" -gt "0" ]; then
    echo "✅ SUCCESS! Spotlight is now indexing Mail messages!"
    echo
    echo "Testing for Alexander Lourie emails..."
    ALEX_COUNT=$(mdfind "kMDItemKind == 'Mail Message' && kMDItemTextContent == '*bfkn*'" 2>/dev/null | wc -l)
    if [ "$ALEX_COUNT" -gt "0" ]; then
        echo "✅ Found $ALEX_COUNT emails possibly from Alexander Lourie"
    else
        echo "⚠️  No emails found yet - indexing may still be in progress"
    fi
else
    echo "⚠️  Not working yet. Try Alternative Method:"
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "ALTERNATIVE: Add and Remove from Privacy"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    echo "1. Go back to System Settings → Spotlight Privacy"
    echo "2. Click the + button"
    echo "3. Press Cmd+Shift+G and enter: ~/Library/Mail"
    echo "4. Click 'Choose' to add it"
    echo "5. IMMEDIATELY remove it with the - button"
    echo "6. This forces a complete reindex"
    echo "7. Wait 15-30 minutes for full indexing"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TESTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Run these commands to test:"
echo
echo "# Check if indexing is working:"
echo "mdfind \"kMDItemKind == 'Mail Message'\" | wc -l"
echo
echo "# Test the enrichment:"
echo "cd /Users/joi/obs-dailynotes"
echo "node tools/quickTestAlexander.js"
echo
echo "If count is still 0 after 30 minutes, Mail might be"
echo "storing emails in a format Spotlight doesn't understand."
echo "In that case, we'll need to use Gmail API instead."
