#!/bin/bash
# Complete Mail.app search diagnostic

echo "Running Mail.app Search Diagnostics"
echo "===================================="
echo

# Make scripts executable
chmod +x /Users/<Owner>/obs-dailynotes/debug_mail.sh
chmod +x /Users/<Owner>/obs-dailynotes/tools/debugMailSearch.js
chmod +x /Users/<Owner>/obs-dailynotes/tools/searchMailApp.js

# Run debug script
echo "Step 1: Running detailed diagnostics..."
echo "----------------------------------------"
node /Users/<Owner>/obs-dailynotes/tools/debugMailSearch.js

echo
echo "Step 2: Testing improved search..."
echo "----------------------------------------"
cd /Users/<Owner>/obs-dailynotes
node tools/searchMailApp.js "Alexander Lourie" "alexander.lourie@bfkn.com"

echo
echo "Step 3: Testing alternative searches..."
echo "----------------------------------------"
# Try just domain
echo "Searching for domain 'bfkn.com':"
mdfind "kMDItemKind == 'Mail Message' && kMDItemTextContent == '*bfkn.com*'" | head -5

echo
echo "Searching for just 'Lourie':"
mdfind "kMDItemKind == 'Mail Message' && kMDItemTextContent == '*Lourie*'" | head -5

echo
echo "Complete!"
