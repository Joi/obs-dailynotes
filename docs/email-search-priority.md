# Email Search Priority System

## Overview
The enrichment system now prioritizes local Mail.app search over Gmail API, providing faster results without needing API tokens when possible.

## Search Priority Order

### 1. **Local Mail.app Search (First Priority)**
- **No API token needed**
- **Instant results** from your local email archive
- Uses macOS Spotlight metadata
- Works offline
- No rate limits

### 2. **Gmail API (Fallback)**
- Only used if local search:
  - Finds no messages
  - Fails to run (e.g., not on macOS)
  - Is explicitly skipped
- Requires valid OAuth token
- Subject to API rate limits
- Gets messages not in local archive

## How It Works

When running `enrichFromLLM.js`:

```
1. Check existing cache
   ├─ Has valid data? → Use cache
   └─ Empty/invalid? → Continue to step 2

2. Try local Mail.app search
   ├─ Found messages? → Use local data, skip Gmail
   ├─ No messages? → Continue to Gmail
   └─ Search failed? → Continue to Gmail

3. Try Gmail API (if needed)
   ├─ Success → Use Gmail data
   └─ Failed → Use whatever we have
```

## Commands

### Standard Enrichment (Auto-Priority)
```bash
# Will try local first, then Gmail if needed
PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

### Force Local Only
```bash
# Skip Gmail API entirely
SKIP_GMAIL=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

### Force Gmail Only
```bash
# Skip local search, go straight to Gmail
SKIP_LOCAL=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

### Force Complete Refresh
```bash
# Ignore cache, refetch from local/Gmail
FORCE_REFETCH=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SKIP_LOCAL` | Skip Mail.app search | Not set (use local) |
| `SKIP_GMAIL` | Skip Gmail API | Not set (use as fallback) |
| `FORCE_REFETCH` | Ignore cache, refetch | Not set (use cache) |
| `SKIP_PREFETCH` | Skip all email fetching | Not set (fetch emails) |

## Cache Format

The cache stores both sources separately but converts Mail.app to Gmail format for compatibility:

```json
{
  "data": {
    "gmailByEmail": {
      "email@example.com": [...]  // Gmail-format messages
    },
    "mailAppByEmail": {
      "email@example.com": [...]  // Original Mail.app format
    },
    "dataSource": "Mail.app"  // or "Gmail"
  }
}
```

## Private Notes Indication

The private notes will show the data source:

```markdown
#### Relationship Summary
- Email history spans 2018-03-15 to 2025-08-12 (30 messages indexed).
- Source: Local Mail.app archive  // or "Gmail API"
```

## Benefits

### Using Local Search First
- **Speed**: Instant results, no network latency
- **Reliability**: Works even when Gmail is down
- **No token management**: No expiry, no refresh needed
- **Privacy**: Data never leaves your machine
- **No rate limits**: Search as much as you want

### Gmail Fallback
- **Completeness**: Gets messages not in local archive
- **Different accounts**: Can search accounts not in Mail.app
- **Server-side search**: Can use Gmail's powerful search operators
- **Shared mailboxes**: Access to delegated accounts

## Troubleshooting

### Local Search Not Finding Messages

1. **Check Spotlight is enabled**:
```bash
mdutil -s /
```

2. **Rebuild Mail index**:
```bash
mdimport -r /System/Library/Spotlight/Mail.mdimporter
```

3. **Check if messages are indexed**:
```bash
mdfind "kMDItemKind == 'Mail Message'" | wc -l
```

### Force Gmail When Local Works
```bash
# If you specifically want Gmail data
SKIP_LOCAL=1 PERSON_FILE="..." node tools/enrichFromLLM.js
```

### Debug What's Being Used
```bash
# Test search priority
node tools/testEmailSearchPriority.js
```

## Performance Comparison

| Aspect | Mail.app | Gmail API |
|--------|----------|-----------|
| Speed | <1 second | 5-30 seconds |
| Token needed | No | Yes |
| Internet required | No | Yes |
| Rate limits | None | 250 quota/user/sec |
| Message completeness | Local only | All on server |
| Search syntax | Spotlight | Gmail operators |

## Best Practices

1. **Let the system decide**: Default behavior is optimal for most cases
2. **Use local for bulk operations**: When enriching many people
3. **Use Gmail for specific searches**: When you need server-side data
4. **Monitor cache freshness**: Local search uses point-in-time data
5. **Combine both**: Local for speed, Gmail for completeness

## Example Workflow

```bash
# 1. Quick test with local search
node tools/searchMailApp.js "Alexander Lourie" alexander.lourie@bfkn.com

# 2. If found, enrich (will use local)
PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js

# 3. If need more recent, force Gmail
SKIP_LOCAL=1 FORCE_REFETCH=1 PERSON_FILE="..." node tools/enrichFromLLM.js
```

## Migration from Gmail-Only

No changes needed! Existing scripts will automatically:
1. Try local search first
2. Fall back to Gmail if needed
3. Use the same cache format
4. Generate the same output

The only difference is speed and reliability improvements.
