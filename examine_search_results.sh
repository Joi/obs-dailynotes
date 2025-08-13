#!/bin/bash
# Show what mdfind is actually finding for Alexander Lourie

echo "Examining the 21 Alexander Lourie search results..."
echo "===================================================="
echo

echo "1. First 10 files found by mdfind:"
echo "-----------------------------------"
mdfind "Alexander Lourie" 2>/dev/null | head -10

echo
echo "2. File types of results:"
echo "-------------------------"
mdfind "Alexander Lourie" 2>/dev/null | while read -r file; do
    if [ -f "$file" ]; then
        echo "$(basename "$file"): $(file -b "$file" | cut -d, -f1)"
    fi
done | head -10

echo
echo "3. Results in Mail directories:"
echo "-------------------------------"
mdfind "Alexander Lourie" 2>/dev/null | grep -i mail | head -10

echo
echo "4. Results with .emlx extension:"
echo "--------------------------------"
mdfind "Alexander Lourie" 2>/dev/null | grep "\.emlx" | head -10

echo
echo "5. Check if any are actual email files:"
echo "---------------------------------------"
COUNT=0
mdfind "Alexander Lourie" 2>/dev/null | while read -r file; do
    if [[ "$file" == *".emlx"* ]] || [[ "$file" == *"/Mail/"* ]] || [[ "$file" == *"Library/Mail"* ]]; then
        echo "✓ Email file: $(basename "$file")"
        COUNT=$((COUNT + 1))
        if [ $COUNT -ge 5 ]; then
            break
        fi
    fi
done

echo
echo "6. Alternative: Search in Mail folder directly:"
echo "-----------------------------------------------"
find ~/Library/Mail -type f -name "*.emlx" 2>/dev/null | xargs grep -l "Alexander Lourie" 2>/dev/null | head -5

echo
echo "Done. Based on results above, we can see what Spotlight is finding."
