# Enhanced Gmail Fetching & Rerun Guide

## 🎯 Key Features

### 1. **Historical Context Fetching**
The enhanced Gmail fetcher now retrieves **both the oldest and newest** messages from a person, giving you:
- **First interactions**: How the relationship started
- **Recent interactions**: Current state of the relationship
- **Full timeline**: Understanding of how the relationship evolved

### 2. **Smart Caching**
- Detects empty/invalid caches automatically
- Forces refetch when cache is empty
- Preserves valid data unless explicitly told to refresh

### 3. **Rerun on Already-Populated People**
Yes, you can absolutely rerun enrichment on people who already have data!

## 📋 Rerunning Enrichment

### **For a Single Person (e.g., Alexander Lourie)**

#### Option 1: Force Complete Refresh
```bash
# This will refetch Gmail even if cache exists
FORCE_REFETCH=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

#### Option 2: Use npm script
```bash
# Set the person and force refresh
PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" npm run people:enrich-force
```

#### Option 3: Manual Gmail refetch then enrich
```bash
# Step 1: Force fetch new Gmail data with history
node tools/fetchGmailDirectEnhanced.js "Alexander Lourie" --email alexander.lourie@bfkn.com --deep --limit 30

# Step 2: Run enrichment using the new cache
SKIP_PREFETCH=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

### **Batch Rerun for Multiple People**
```bash
# This will refresh ALL people with empty caches
npm run gmail:fix-empty:run

# To force refresh specific people even with valid caches
for person in "Alexander Lourie" "Other Person"; do
  FORCE_REFETCH=1 PERSON_FILE="/Users/joi/switchboard/$person.md" node tools/enrichFromLLM.js
done
```

## 🔄 How the Enhanced Fetcher Works

### Default Behavior (50/50 split)
When fetching 20 messages:
- 10 oldest messages (first interactions)
- 10 newest messages (recent interactions)

### Customizable Options
```bash
# Get only the oldest messages
node tools/fetchGmailDirectEnhanced.js "Person Name" --email email@example.com --limit 20 --oldest-only

# Get only the newest messages
node tools/fetchGmailDirectEnhanced.js "Person Name" --email email@example.com --limit 20 --newest-only

# Custom split (70% old, 30% new)
node tools/fetchGmailDirectEnhanced.js "Person Name" --email email@example.com --limit 20 --split-ratio 0.7
```

## 📊 What Gets Stored

### Enhanced Cache Structure
```json
{
  "timestamp": "2025-08-12T12:00:00.000Z",
  "data": {
    "gmailByEmail": {
      "email@example.com": [
        {
          "id": "msg-id",
          "threadId": "thread-id",
          "internalDate": "1234567890000",
          "headers": {...},
          "snippet": "...",
          "isOldest": true,  // Marks oldest messages
          "isNewest": false  // Marks newest messages
        }
      ]
    },
    "gmailMetadata": {
      "email@example.com": {
        "totalFetched": 20,
        "oldestDate": "2018-03-15T10:00:00.000Z",
        "newestDate": "2025-08-12T09:30:00.000Z",
        "hasOldest": true,
        "hasNewest": true
      }
    },
    "fetchStrategy": {
      "includesOldest": true,
      "includesNewest": true,
      "splitRatio": 0.5,
      "timestamp": "2025-08-12T12:00:00.000Z"
    }
  }
}
```

## 🎯 When to Use Each Method

### **Use Auto-Detection** (Default)
When running enrichment normally - it will detect empty caches and fetch automatically:
```bash
PERSON_FILE="/Users/joi/switchboard/Person Name.md" node tools/enrichFromLLM.js
```

### **Use FORCE_REFETCH=1**
When you want fresh data even if cache exists:
- Person's situation has changed significantly
- You suspect the cache is stale
- You want to get more recent emails
- Testing or debugging

### **Use SKIP_PREFETCH=1**
When you've manually fetched Gmail and want to use that cache:
- After running fetchGmailDirectEnhanced manually
- When you know the cache is good
- To save API calls during testing

## 🔍 Debugging

### Check Cache Status
```bash
# View cache contents
cat data/people_cache/alexander-lourie.json | jq .

# Check if cache has Gmail data
cat data/people_cache/alexander-lourie.json | jq '.data.gmailByEmail | keys'

# Check metadata about fetch
cat data/people_cache/alexander-lourie.json | jq '.data.gmailMetadata'

# Count total messages
cat data/people_cache/alexander-lourie.json | jq '.data.gmailByEmail | to_entries | map(.value | length) | add'
```

### Verbose Output
```bash
# See what's happening during enrichment
DEBUG_LINKS=1 FORCE_REFETCH=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

## ✅ Confirming Rerun Behavior

**Q: Will it rerun on Alexander Lourie even though he's already populated?**

**A: Yes!** Here's how:

1. **Normal run**: Will use existing cache if valid
2. **With FORCE_REFETCH=1**: Will fetch new Gmail data regardless of cache
3. **Empty cache**: Will auto-detect and fetch

The system is designed to be intelligent:
- Won't waste API calls if data exists
- Will refresh when explicitly asked
- Will auto-heal empty/broken caches

## 📈 Benefits of Historical Fetching

### Before (newest only):
- "We've been emailing about the Q4 project"
- Missing context about how the relationship started

### After (oldest + newest):
- "First contacted in 2018 about the merger"
- "Recent discussions focus on Q4 deliverables"
- "Relationship evolved from legal counsel to strategic advisor"

This gives the LLM much better context to understand:
- How you met
- How the relationship has evolved
- What topics were important at different times
- The full arc of your professional relationship

## 🚀 Quick Start for Alexander Lourie

Run this right now to get enhanced data for Alexander Lourie:
```bash
cd /Users/joi/obs-dailynotes
FORCE_REFETCH=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" node tools/enrichFromLLM.js
```

This will:
1. Force fetch Gmail (ignoring existing cache)
2. Get both oldest and newest messages
3. Run LLM enrichment with full historical context
4. Update both public and private notes with richer information
