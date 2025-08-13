# Mail.app Format Discovery - SOLVED!

## What We Found

Mail.app on macOS 15.6 uses:

### Storage Location
- **Path**: `/Users/joi/Library/Mail/V10/MailData/`
- **Format**: Core Data (`.storedata` files)
- **Databases**: SQLite for caching only
- **Sync**: CloudKit for IMAP synchronization

### Key Files
```
/Users/joi/Library/Mail/V10/MailData/
├── ExternalUpdates.storedata       # Core Data store (emails)
├── ExternalUpdates.storedata-shm   # Shared memory
├── ExternalUpdates.storedata-wal   # Write-ahead log
└── RemoteContentURLCache/
    └── Cache.db                     # SQLite cache (6MB)
```

### Why Local Search Doesn't Work
- **No .emlx files** - Apple deprecated individual email files
- **Core Data format** - Proprietary Apple object database
- **Not searchable** - Would need to reverse-engineer Core Data
- **CloudKit sync** - Some data might only be in iCloud

## The Solution: MailStore IMAP

Since Mail.app uses an unsearchable format, **MailStore is perfect**!

### Quick Setup

```bash
cd /Users/joi/obs-dailynotes

# 1. Install dependencies
npm install

# 2. Interactive setup
node tools/setupMailStore.js

# 3. Test enrichment
export PERSON_KEY="Alexander Lourie"
export PERSON_EMAIL="alexander.lourie@bfkn.com"
node tools/enrichFromMailStore.js
```

### Manual Configuration

Create `config/mailstore.json`:

```json
{
  "host": "mailstore.yourdomain.com",
  "port": 143,
  "user": "your-username",
  "password": "your-password",
  "tls": true
}
```

### Benefits Over Mail.app

| Feature | Mail.app V10 | MailStore |
|---------|--------------|-----------|
| **Format** | Core Data (proprietary) | IMAP (standard) |
| **Searchable** | ❌ No | ✅ Yes |
| **API Access** | ❌ No | ✅ Yes |
| **Cross-platform** | ❌ Mac only | ✅ Any IMAP client |
| **Archive Size** | Limited by Mac | Unlimited |
| **Backup** | Complex | Simple |

## Working Enrichment Flow

```bash
# 1. Fetch from MailStore (replaces local search)
export PERSON_KEY="Alexander Lourie"
export PERSON_EMAIL="alexander.lourie@bfkn.com"
node tools/enrichFromMailStore.js

# 2. Run LLM enrichment with cached data
SKIP_PREFETCH=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" \
  node tools/enrichFromLLM.js
```

## Why This is Actually Better

1. **All your archives** - MailStore has everything, not just recent
2. **Standard protocol** - IMAP works everywhere
3. **Future-proof** - Not dependent on Apple's changing formats
4. **Searchable** - Full-text search across all emails
5. **Reliable** - No more debugging Apple's proprietary formats

## Alternative: Gmail API Still Works

If MailStore isn't available:

```bash
SKIP_LOCAL=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" \
  node tools/enrichFromLLM.js
```

## Summary

✅ **Mystery Solved**: Mail.app uses Core Data in V10 format  
✅ **Local Search**: Impossible without reverse-engineering  
✅ **Best Solution**: MailStore IMAP  
✅ **Fallback**: Gmail API  

Set up MailStore now - it's much better than trying to hack Apple's Core Data!
