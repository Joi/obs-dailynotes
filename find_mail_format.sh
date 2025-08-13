#!/bin/bash
# Find Mail.app's actual storage format on macOS 15.6

echo "======================================================="
echo "Finding Mail.app Storage Format on macOS 15.6"
echo "======================================================="
echo

# Ensure Mail is running
if ! pgrep -x Mail > /dev/null; then
    echo "⚠️  Please start Mail.app first!"
    echo "1. Open Mail.app"
    echo "2. Search for 'Alexander Lourie' to load emails"
    echo "3. Run this script again"
    exit 1
fi

PID=$(pgrep -x Mail | head -1)
echo "✓ Mail.app is running (PID: $PID)"
echo

echo "1. Database files Mail has open:"
echo "---------------------------------"
lsof -p $PID 2>/dev/null | grep -E "\.db|\.sqlite|\.sqlite-wal|\.sqlite-shm" | while read line; do
    FILE=$(echo "$line" | awk '{print $NF}')
    if [ -f "$FILE" ]; then
        SIZE=$(ls -lh "$FILE" 2>/dev/null | awk '{print $5}')
        echo "  $FILE"
        echo "    Size: $SIZE"
        
        # Check if it's SQLite
        if file "$FILE" | grep -q SQLite; then
            echo "    Type: SQLite database"
            # Try to get table names
            TABLES=$(sqlite3 "$FILE" ".tables" 2>/dev/null | head -1)
            if [ ! -z "$TABLES" ]; then
                echo "    Tables: $TABLES"
            fi
        fi
    fi
done

echo
echo "2. Core Data stores:"
echo "--------------------"
lsof -p $PID 2>/dev/null | grep -E "\.storedata|\.mom|\.momd" | while read line; do
    FILE=$(echo "$line" | awk '{print $NF}')
    echo "  $FILE"
done

echo
echo "3. Memory-mapped regions (large files):"
echo "---------------------------------------"
vmmap $PID 2>/dev/null | grep "mapped file" | grep -v "dylib\|framework" | head -10

echo
echo "4. Searching for email content in Mail's files:"
echo "-----------------------------------------------"
echo "Looking for 'Alexander Lourie' in open files..."

lsof -p $PID 2>/dev/null | awk '{print $NF}' | sort -u | while read FILE; do
    if [ -f "$FILE" ] && [ -r "$FILE" ]; then
        if strings "$FILE" 2>/dev/null | grep -q "Alexander Lourie"; then
            echo "  ✓ Found in: $FILE"
            SIZE=$(ls -lh "$FILE" 2>/dev/null | awk '{print $5}')
            echo "    Size: $SIZE"
            TYPE=$(file -b "$FILE" | cut -d, -f1)
            echo "    Type: $TYPE"
        fi
    fi
done

echo
echo "5. Check for CloudKit/iCloud storage:"
echo "-------------------------------------"
CONTAINERS=$(lsof -p $PID 2>/dev/null | grep -i "container\|cloudkit" | head -5)
if [ ! -z "$CONTAINERS" ]; then
    echo "$CONTAINERS"
else
    echo "  No CloudKit files open"
fi

echo
echo "======================================================="
echo "ANALYSIS:"
echo "======================================================="
echo
echo "If you see SQLite databases above, Mail is using:"
echo "  • SQLite for message metadata and indexing"
echo "  • Possibly BLOB storage for message bodies"
echo
echo "If you see Core Data stores, Mail is using:"
echo "  • Core Data framework with SQLite backend"
echo
echo "If you see CloudKit, Mail is using:"
echo "  • iCloud sync for IMAP accounts"
echo
echo "Regardless of format, MailStore IMAP is easier to use!"
echo "Set it up with: node tools/mailstoreSearch.js"
