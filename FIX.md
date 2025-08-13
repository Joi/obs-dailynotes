# FIX: Add Archive Folders to MailStore Search

## Problem
Enrichment missing old emails (1996-2012) from MailStore archives

## Fix
Edit `/Users/<Owner>/obs-dailynotes/tools/mailstoreSearch.js` line ~55:

```javascript
const foldersToSearch = [
  'INBOX',
  '<Owner>/<Owner>@example.edu/Inbox',
  // ADD THESE ARCHIVE FOLDERS:
  '<Owner>/<Owner>@example.edu/archive/m96089702',
  '<Owner>/<Owner>@example.edu/archive/m980130', 
  '<Owner>/<Owner>@example.edu/archive/m9911',
  '<Owner>/<Owner>@example.edu/archive/2002oldinbox',
  '<Owner>/<Owner>@example.edu/archive/19991121',
  '<Owner>/<Owner>@example.edu/archive/20021214',
  '<Owner>/<Owner>@example.edu/archive/20030305',
  // ... add more from listMailstoreFolders.js output
];
```

## Test
```bash
cd /Users/<Owner>/obs-dailynotes
export PERSON_KEY="Alexander Lourie"
node tools/enrichFromLLM.js
```

## Check Success
```bash
grep "199\|200" /Users/<Owner>/switchboard/Private/People/alexander-lourie.md
```

Should show emails from 1996-2025, not just 2025.
