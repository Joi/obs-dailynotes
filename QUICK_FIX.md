# Quick Start: Fix MailStore Archive Search

## Problem
Person enrichment only shows 2025 emails. MailStore has emails from 1996-2012 in archive folders but they're not being searched.

## Key Discovery
Alexander Lourie has 3 emails:
- `alexander.lourie@bfkn.com` (current)
- `alourie@attglobal.net` (older)
- `alourie@mcimail.com` (1990s)

MailStore archive folders exist at:
```
<Owner>/<Owner>@example.edu/archive/m96089702    # 1996
<Owner>/<Owner>@example.edu/archive/m980130      # 1998
<Owner>/<Owner>@example.edu/archive/m9911        # 1999
<Owner>/<Owner>@example.edu/archive/2002oldinbox # 2002
... through 2012
```

## Current Test Running
```bash
cd /Users/<Owner>/obs-dailynotes && node tools/searchMailstoreArchives.js
```

## Fix Needed
Update `/Users/<Owner>/obs-dailynotes/tools/mailstoreSearch.js` line ~55:
```javascript
// ADD archive folders to search list
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

## Test Commands
```bash
# Run enrichment
export PERSON_KEY="Alexander Lourie"
node tools/enrichFromLLM.js

# Check if it worked
grep "199\|200[0-9]" /Users/<Owner>/switchboard/Private/People/alexander-lourie.md
```

## Success = Private notes show:
- Emails from 1996-2025
- "First Interactions" section with 1990s emails
- "Recent Interactions" section with 2025 emails

Files: All in `/Users/<Owner>/obs-dailynotes/tools/`
