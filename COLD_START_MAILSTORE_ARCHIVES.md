# Cold Start: MailStore Archive Email Integration

## Executive Summary
User (<Owner>) is enriching Obsidian person pages with email history from TWO sources:
1. **MailStore IMAP server** - Contains 20+ years of email archives (1996-2012+)
2. **Gmail API** - Recent emails (2025)

**Current Problem**: The enrichment system only shows recent emails, missing decades of history stored in MailStore archives.

## The Discovery
We found that Alexander Lourie has **3 email addresses**:
- `alexander.lourie@bfkn.com` (current, has 2011 & 2025 emails)
- `alourie@attglobal.net` (older, AT&T era)
- `alourie@mcimail.com` (1980s-1990s, MCI Mail era)

**Critical Finding**: MailStore has emails organized in archive folders by date, going back to 1996:
```
<Owner>/<Owner>@example.edu/archive/
  ├── m96089702/        # 1996
  ├── m980130/          # 1998
  ├── m9807out/         # 1998 outbox
  ├── m9911/            # 1999
  ├── 19991121/         # Nov 1999
  ├── 2002oldinbox/     # 2002 old inbox
  ├── 20021214/         # Dec 2002
  ├── ... through 2012
```

## Current Status

### What's Working ✅
- MailStore connection (172.27.1.64:993 SSL/TLS)
- Gmail API fetching recent emails
- Basic enrichment pipeline
- Found 50 emails from 2011 in regular Inbox folders

### What's Not Working ❌
- Archive folders aren't being searched
- Older email addresses (alourie@attglobal.net, alourie@mcimail.com) not finding results
- Private notes only show 2025 emails, missing 1996-2011 history

### Test Currently Running
```bash
cd /Users/<Owner>/obs-dailynotes && node tools/searchMailstoreArchives.js
```
This searches archive folders for "lourie" to find older emails.

## File Structure
```
/Users/<Owner>/obs-dailynotes/
├── tools/
│   ├── enrichFromLLM.js              # Main enrichment (needs archive folder support)
│   ├── enrichFromMailStore.js        # MailStore fetcher (works but only searches Inbox)
│   ├── mailstoreSearch.js            # IMAP client (needs to search archive folders)
│   ├── searchMailstoreArchives.js    # TEST: Archive searcher
│   └── listMailstoreFolders.js       # Shows all available folders
├── config/
│   └── mailstore.json                 # MailStore connection config
├── data/
│   └── people_cache/
│       └── alexander-lourie.json     # Cache (should have 1996-2025 emails)
└── MAILSTORE_ENRICHMENT_HANDOFF.md   # Previous handoff doc
```

## The Solution Path

### If Archive Search Finds Old Emails
Update `mailstoreSearch.js` to include archive folders:
```javascript
const foldersToSearch = [
  'INBOX',
  '<Owner>/<Owner>@example.edu/Inbox',
  // ADD THESE:
  '<Owner>/<Owner>@example.edu/archive/m96089702',
  '<Owner>/<Owner>@example.edu/archive/m980130',
  '<Owner>/<Owner>@example.edu/archive/m9911',
  '<Owner>/<Owner>@example.edu/archive/2002oldinbox',
  // ... etc
];
```

### If Archive Search Finds Nothing
1. Try different search approaches:
   - Search by partial name: "Sandy" (his nickname)
   - Search by domain: "@attglobal.net", "@mcimail.com"
   - Search ALL emails and filter client-side

2. Check if archives are in different format:
   - Might be mbox files not accessible via IMAP
   - Might need different authentication

## Expected Final Result

The private notes at `/Users/<Owner>/switchboard/Private/People/alexander-lourie.md` should show:

```markdown
#### Relationship Summary
- Email history spans 1996-XX-XX to 2025-08-12 (500+ messages indexed).
- Sources: MailStore, Gmail

#### First Interactions (Oldest Emails)
_From MailStore_
- 1996-XX-XX — [Subject from MCI Mail era] [MailStore]
- 1998-XX-XX — [Subject from early MIT days] [MailStore]
- 1999-XX-XX — [Subject] [MailStore]
...

#### Recent Interactions (Newest Emails)
_Gmail messages with links:_
- 2025-08-12 — Outstanding Balance: INV00173188
- 2025-08-11 — Fwd: Outstanding Balance
...
```

## Quick Test Commands

### Test what MailStore can find:
```bash
# List all folders
cd /Users/<Owner>/obs-dailynotes && node tools/listMailstoreFolders.js

# Search archives for Lourie
cd /Users/<Owner>/obs-dailynotes && node tools/searchMailstoreArchives.js

# Test regular enrichment
export PERSON_KEY="Alexander Lourie"
export PERSON_EMAIL="alexander.lourie@bfkn.com"
node tools/enrichFromLLM.js
```

### Check results:
```bash
# See if old emails are in cache
cat data/people_cache/alexander-lourie.json | grep "1998\|1999\|2002"

# Check private notes
grep "199\|200[0-9]" /Users/<Owner>/switchboard/Private/People/alexander-lourie.md
```

## Key Insights
1. **MailStore has the data** - 20+ years of emails ARE there, just in archive folders
2. **Email addresses evolved** - Alexander used different addresses over time
3. **Folder structure matters** - Archives are in dated subfolders, not main Inbox
4. **Search strategy** - Need to search multiple folders and email variations

## Next Actions Based on Test Results

### If archives have emails:
1. Update `mailstoreSearch.js` to include archive folders
2. Ensure all 3 email addresses are searched
3. Run full enrichment to generate complete history

### If archives are empty/inaccessible:
1. Try connecting to MailStore with different tool (Thunderbird, etc.) to verify
2. Check if archives are in different format (mbox files?)
3. Consider alternative: Export MailStore data to accessible format

## User's Ultimate Goal
<Owner> wants to see the **complete email relationship history** with people, combining:
- Historical context from MailStore (1996-2012)
- Recent activity from Gmail (2025)
- Showing how relationships evolved over 30+ years

This provides invaluable context for meetings, reconnections, and understanding long-term professional relationships.

## Contact Info
- Previous handoffs: 
  - `/Users/<Owner>/obs-dailynotes/HANDOFF_PROMPT.md`
  - `/Users/<Owner>/obs-dailynotes/MAILSTORE_ENRICHMENT_HANDOFF.md`
- Test person: Alexander Lourie
- Known to have emails from: 1996(?), 1998(?), 1999(?), 2002-2012, 2025
