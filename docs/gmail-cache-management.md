# Gmail Cache Management

## Overview
The enrichment system caches Gmail data to avoid repeated API calls. However, failed attempts (due to expired tokens, network issues, etc.) can create empty cache entries that prevent future fetches. This document explains the improved cache management system.

## The Problem
- Failed Gmail fetches create empty cache files
- The enrichFromLLM script sees a cache exists (even if empty) and doesn't retry
- This leads to many people having no Gmail data when they should

## The Solution
We've implemented automatic empty cache detection and refresh:

1. **Automatic Detection**: The enrichFromLLM script now checks if cache has actual data
2. **Force Refetch**: If cache is empty/invalid and token is valid, it forces a new fetch
3. **Batch Fixing**: A utility to scan and fix all empty caches at once

## Commands

### Check and Fix Individual Person
```bash
# Run enrichment (will auto-detect empty cache and refetch)
PERSON_FILE="/Users/<Owner>/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js

# Force refetch even if cache exists
FORCE_REFETCH=1 PERSON_FILE="/Users/<Owner>/switchboard/Person Name.md" node tools/enrichFromLLM.js
```

### Scan and Fix All Empty Caches
```bash
# See what caches are empty (dry run)
npm run gmail:fix-empty:dry

# Actually fix all empty caches
npm run gmail:fix-empty:run

# Interactive mode (asks before fixing)
npm run gmail:fix-empty
```

### Manual Cache Check
```bash
# Check if a specific person's cache has data
node tools/checkAndRefreshEmptyCache.js "Person Name"

# Or with environment variable
PERSON_KEY="Person Name" node tools/checkAndRefreshEmptyCache.js
```

## How It Works

### Cache Validation
A cache is considered valid if:
- The cache file exists
- It has a `gmailByEmail` section
- At least one email has actual messages (not null or empty array)

### Auto-Refresh Logic
When running enrichFromLLM:
1. Load existing cache
2. Check if Gmail data is valid
3. If invalid/empty AND token is valid:
   - Force fetch Gmail for all configured emails
   - Save to cache
4. If valid, use existing cache

### Batch Processing
The fix-empty-caches script:
1. Scans all cache files in `data/people_cache/`
2. Identifies which have empty Gmail data
3. Finds corresponding person files
4. Runs enrichment with force-refetch for each

## Cache File Structure
```json
{
  "timestamp": "2025-08-12T11:00:00.000Z",
  "data": {
    "gmailByEmail": {
      "email@example.com": [
        {
          "id": "msg-id",
          "threadId": "thread-id",
          "internalDate": "1234567890000",
          "headers": {
            "From": "Sender Name <sender@example.com>",
            "To": "Recipient <recipient@example.com>",
            "Subject": "Subject line",
            "Date": "Mon, 12 Aug 2025 10:00:00 +0000"
          },
          "snippet": "Message preview..."
        }
      ]
    },
    "publicSnippets": [...],
    "publicRicher": {...}
  }
}
```

## Environment Variables

### Control Fetching Behavior
- `SKIP_PREFETCH=1` - Skip all prefetching (use existing cache only)
- `FORCE_REFETCH=1` - Force refetch even if cache has data
- `GMAIL_DEEP=1` - Fetch full message bodies (not just headers)

### Person Identification
- `PERSON_KEY` - Person name/key
- `PERSON_FILE` - Full path to person markdown file
- `PERSON_EMAIL` - Override email address

## Troubleshooting

### Empty Cache After Fix Attempt
Possible causes:
1. **No emails configured**: Check the person file has `emails:` in frontmatter
2. **Invalid token**: Run `npm run gmail:check` to verify token status
3. **No messages found**: The person might genuinely have no emails
4. **Wrong email**: The configured email might be incorrect

### Debug Mode
```bash
# See detailed fetch attempts
DEBUG_LINKS=1 PERSON_FILE="..." node tools/enrichFromLLM.js

# Check what emails are being tried
ENRICH_DEBUG=1 PERSON_FILE="..." node tools/enrichFromLLM.js
```

### Manual Cache Inspection
```bash
# View cache contents
cat data/people_cache/person-name.json | jq .

# Check if Gmail data exists
cat data/people_cache/person-name.json | jq '.data.gmailByEmail'

# Count messages
cat data/people_cache/person-name.json | jq '.data.gmailByEmail | to_entries | map(.value | length) | add'
```

## Best Practices

1. **Regular Token Refresh**: Set up a cron job to refresh token before expiry
2. **Batch Processing**: Use `gmail:fix-empty:run` periodically to clean up failed caches
3. **Monitor Failures**: Check logs for patterns in fetch failures
4. **Verify Emails**: Ensure person files have correct email addresses

## Cache Lifecycle

1. **Initial Fetch**: When enriching a person for the first time
2. **Cache Hit**: Subsequent enrichments use cached data
3. **Cache Invalid**: Empty/null data triggers automatic refetch
4. **Force Refresh**: Manual override with `FORCE_REFETCH=1`
5. **Cache Expiry**: Currently no automatic expiry (manual refresh needed)

## Future Improvements

- [ ] Add cache TTL (time-to-live) for automatic refresh
- [ ] Implement incremental updates (fetch only new messages)
- [ ] Add cache statistics dashboard
- [ ] Parallel batch processing for faster fixes
- [ ] Automatic retry with exponential backoff
