# Email Search Priority System - Updated

## Overview
The enrichment system attempts local Mail.app search first, then falls back to Gmail API. **If Mail.app is not configured or has no local messages, it automatically skips to Gmail.**

## Search Priority Order

### 1. **Pre-check: Is Mail.app Available?**
- Checks if any .emlx files exist
- Checks if Spotlight has indexed mail
- If NO → Skip directly to Gmail API
- If YES → Try local search

### 2. **Local Mail.app Search (When Available)**
- No API token needed
- Instant results from local archive
- Works offline

### 3. **Gmail API (Fallback or Primary)**
- Used when:
  - Mail.app has no local messages (your current situation)
  - Local search finds nothing
  - Local search fails
  - `SKIP_LOCAL=1` is set

## Status Check

Check if local Mail search is available:

```bash
cd /Users/joi/obs-dailynotes
node tools/checkMailAvailable.js
```

Output will show:
- ✓ YES: Local search will be attempted
- ✗ NO: Will skip straight to Gmail API

## Common Scenarios

### No Mail.app Configuration (Your Current Setup)
```
Status: Mail.app not configured
Action: Automatically uses Gmail API
Fix: Not needed - Gmail API works fine
```

### Mail.app Configured but No Downloads
```
Status: Mail.app configured but no local messages  
Action: Automatically uses Gmail API
Fix: Mail → Settings → Accounts → Download All Messages
```

### Mail Files Exist but Not Indexed
```
Status: Mail files exist but not indexed
Action: Attempts search, likely fails, falls to Gmail
Fix: sudo mdutil -E / (wait 10-30 min)
```

### Everything Working
```
Status: Mail messages indexed (count: 50000+)
Action: Uses fast local search, Gmail as backup
Fix: None needed
```

## Commands

### Auto-Detect Mode (Recommended)
```bash
# Automatically uses Mail.app if available, Gmail if not
PERSON_FILE="/Users/joi/switchboard/Person Name.md" node tools/enrichFromLLM.js
```

### Force Gmail Only
```bash
# Skip local search even if available
SKIP_LOCAL=1 PERSON_FILE="..." node tools/enrichFromLLM.js
```

### Force Local Only  
```bash
# Skip Gmail (only useful if Mail.app has messages)
SKIP_GMAIL=1 PERSON_FILE="..." node tools/enrichFromLLM.js
```

## Performance Comparison

| Scenario | Search Method | Speed | Requirements |
|----------|--------------|-------|--------------|
| No Mail.app (you) | Gmail API only | 5-30 sec | OAuth token |
| Mail.app + indexed | Local first → Gmail | <1 sec / 5-30 sec | None / OAuth |
| Force Gmail | Gmail API only | 5-30 sec | OAuth token |
| Force local | Local only | <1 sec | Local messages |

## No Action Required

**Your setup (no local Mail) will work automatically.** The enrichment script now:
1. Detects no local mail is available
2. Shows: `[enrich] Mail.app search not available: Mail.app not configured`
3. Shows: `[enrich] Skipping to Gmail API...`
4. Continues with Gmail as before

The local search feature is optional - everything continues to work with Gmail API just as it did before this update.
