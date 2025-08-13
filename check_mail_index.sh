#!/bin/bash
# Quick check to see if Mail indexing is complete

echo "Checking Mail Indexing Status..."
echo "================================="
echo

# Check current count
COUNT=$(mdfind "kMDItemKind == 'Mail Message'" 2>/dev/null | wc -l)
echo "Method 1 (kMDItemKind): $COUNT messages"

# Try alternative query
COUNT2=$(mdfind "kMDItemContentType == 'com.apple.mail.emlx'" 2>/dev/null | wc -l)
echo "Method 2 (ContentType): $COUNT2 messages"

# Try simple content search
COUNT3=$(mdfind "Alexander Lourie" 2>/dev/null | grep -i mail | wc -l)
echo "Method 3 (Text search): $COUNT3 Alexander Lourie results in Mail"

echo
if [ "$COUNT" -gt "0" ] || [ "$COUNT2" -gt "0" ] || [ "$COUNT3" -gt "0" ]; then
    echo "✅ Mail indexing is working!"
    echo
    echo "Testing enrichment now..."
    cd /Users/joi/obs-dailynotes
    node tools/searchMailContent.js
else
    echo "⏳ Still indexing... (Spotlight UI shows 'Indexing...')"
    echo "   This can take 5-30 minutes depending on mailbox size"
    echo
    echo "Try again in a few minutes with:"
    echo "   cd /Users/joi/obs-dailynotes"
    echo "   ./check_mail_index.sh"
fi
