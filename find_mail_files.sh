#!/bin/bash
# Quick check to find what directory Mail.app is ACTUALLY using

echo "==================================================="
echo "Finding Mail.app's Real Storage Location"
echo "==================================================="
echo

# Check if Mail is running
MAIL_PID=$(pgrep -x Mail | head -1)
if [ -z "$MAIL_PID" ]; then
    echo "⚠️  Mail.app is not running"
    echo "Please:"
    echo "1. Open Mail.app"
    echo "2. Search for 'Alexander Lourie' to load some emails"
    echo "3. Run this script again"
    exit 1
fi

echo "✓ Mail.app is running (PID: $MAIL_PID)"
echo

echo "1. Checking what files Mail has open:"
echo "--------------------------------------"
lsof -p $MAIL_PID 2>/dev/null | grep -E "\.emlx|\.mbox|\.db|\.sqlite|MailData|Messages" | head -20

echo
echo "2. Checking Mail's working directory:"
echo "-------------------------------------"
lsof -p $MAIL_PID 2>/dev/null | grep "cwd" 

echo
echo "3. Large files Mail is using:"
echo "-----------------------------"
lsof -p $MAIL_PID 2>/dev/null | awk '$7 > 1000000 {print $NF, "(" $7 " bytes)"}' | head -10

echo
echo "4. Directories Mail is accessing:"
echo "---------------------------------"
lsof -p $MAIL_PID 2>/dev/null | grep "DIR" | grep -i mail | head -10

echo
echo "5. Testing Spotlight with actual content:"
echo "-----------------------------------------"
# Try to find emails by searching for content we KNOW exists
echo "Searching for 'JEREMY HECKMAN' (from your screenshot):"
mdfind "JEREMY HECKMAN" 2>/dev/null | head -5

echo
echo "Searching for 'Financial Advisor Magazine':"
mdfind "Financial Advisor Magazine" 2>/dev/null | head -5

echo
echo "==================================================="
echo "If you see file paths above, those are where"
echo "Mail.app is storing emails on your system!"
echo "==================================================="
