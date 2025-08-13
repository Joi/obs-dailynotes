#!/bin/bash
# Test the full enrichment pipeline with MailStore

cd /Users/joi/obs-dailynotes

# Clear the cache to force fresh fetch
rm -f data/people_cache/alexander-lourie.json

# Run enrichment with both MailStore and Gmail
export PERSON_KEY="Alexander Lourie"
export PERSON_EMAIL="alexander.lourie@bfkn.com"
export FORCE_REFETCH=1

echo "Running enrichment with MailStore and Gmail..."
node tools/enrichFromLLM.js

echo ""
echo "Checking cache contents..."
if [ -f "data/people_cache/alexander-lourie.json" ]; then
  echo "Cache file exists. Checking for MailStore data..."
  grep -o "mailstoreByEmail" data/people_cache/alexander-lourie.json && echo "✓ MailStore data found in cache" || echo "✗ No MailStore data in cache"
  
  echo ""
  echo "Checking private notes..."
  grep "2011" /Users/joi/switchboard/Private/People/alexander-lourie.md && echo "✓ 2011 emails found in private notes" || echo "✗ No 2011 emails in private notes"
fi
