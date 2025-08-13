# FIX: Add Archive Folders to MailStore Search

## Problem
Enrichment missing old emails (1996-2012) from MailStore archives

## Fix
Edit `/Users/joi/obs-dailynotes/tools/mailstoreSearch.js` line ~55:

```javascript
const foldersToSearch = [
  'INBOX',
  'joi/joi@media.mit.edu/Inbox',
  // ADD THESE ARCHIVE FOLDERS:
  'joi/joi@media.mit.edu/archive/m96089702',
  'joi/joi@media.mit.edu/archive/m980130', 
  'joi/joi@media.mit.edu/archive/m9911',
  'joi/joi@media.mit.edu/archive/2002oldinbox',
  'joi/joi@media.mit.edu/archive/19991121',
  'joi/joi@media.mit.edu/archive/20021214',
  'joi/joi@media.mit.edu/archive/20030305',
  // ... add more from listMailstoreFolders.js output
];
```

## Test
```bash
cd /Users/joi/obs-dailynotes
export PERSON_KEY="Alexander Lourie"
node tools/enrichFromLLM.js
```

## Check Success
```bash
grep "199\|200" /Users/joi/switchboard/Private/People/alexander-lourie.md
```

Should show emails from 1996-2025, not just 2025.
