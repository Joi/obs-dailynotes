# Handoff Context: MailStore Email Enrichment System

## Current Situation
You are helping <Owner> with an Obsidian-based personal knowledge management system located at `/Users/<Owner>/obs-dailynotes`. We just successfully configured MailStore IMAP integration for enriching person pages with email history.

## What Was Just Accomplished
1. **Fixed MailStore IMAP connection** - Was failing due to incorrect TLS/auth settings
2. **Configured secure SSL/TLS access** on port 993 with AUTH=PLAIN
3. **Updated search to scan multiple folders** across all email accounts
4. **Secured credentials** by moving password to macOS Keychain (fallback to `.env` only)
5. **Created diagnostic tools** for troubleshooting IMAP issues

## Current Working Configuration

### MailStore Server Details
- **Host**: 172.27.1.64 (internal NAS: <Owner>-11-nas-2)
- **Port**: 993 (SSL/TLS)
- **Username**: <Owner>
- **Password**: Stored in macOS Keychain as a generic password (service `obs-dailynotes.mailstore`, account `MAILSTORE_USER`). Fallback: `.env` `MAILSTORE_PASSWORD`.
- **Auth Method**: PLAIN over SSL

### Email Archives Available
MailStore contains 20+ years of email from:
- `<Owner>@example.edu` (1999-2012, extensive archives)
- `joiito@gmail.com`
- `ji@example.edu`
- `<Owner>@example.jp`
- `<Owner>@example.com`
- `jito@neoteny.com`

### Key Files

```text
/Users/<Owner>/obs-dailynotes/
├── config/mailstore.json          # MailStore connection config (no password)
├── .env                           # Contains host/user and API keys (password is in Keychain)
├── tools/
│   ├── mailstoreSearch.js        # Main MailStore IMAP client (UPDATED to search all folders)
│   ├── enrichFromMailStore.js    # Fetches emails for a person from MailStore
│   ├── enrichFromLLM.js          # Uses OpenAI to synthesize person enrichment
│   ├── setupMailStore.js         # Interactive setup wizard
│   ├── testMailstoreLogin.js     # Tests different username formats
│   ├── debugMailstoreAuth.js     # Tests different auth methods
│   └── scanMailstoreCapabilities.js # Shows IMAP server capabilities
└── MAILSTORE_SETUP.md            # Documentation of working setup
```

## How the Enrichment Pipeline Works

1. **Email Data Collection**:
   - First tries local Mail.app (macOS, fastest)
   - Then MailStore IMAP (comprehensive archive)
   - Finally Gmail API (if others fail)

2. **Person Page Enrichment**:

    ```bash
   # Set person details
   export PERSON_KEY="Alexander Lourie"
   export PERSON_EMAIL="alexander.lourie@bfkn.com"
   
   # Fetch from MailStore
   node tools/enrichFromMailStore.js
   
   # Generate enriched content with LLM
   SKIP_PREFETCH=1 PERSON_FILE="/Users/<Owner>/switchboard/Alexander Lourie.md" \
     node tools/enrichFromLLM.js
   ```

3. **Output**:
   - **Public page**: `/Users/<Owner>/switchboard/[Person Name].md`
   - **Private notes**: `/Users/<Owner>/switchboard/Private/People/[person-slug].md`

## Current State / Next Steps

### ✅ What's Working
- MailStore connection successful
- Can search across all email folders
- Email enrichment pipeline functional
- Credentials secured in environment variables

### 🔄 Immediate Next Steps (if continuing)
1. Test enrichment with a real person (Alexander Lourie was the example)
2. Consider batch processing multiple people
3. User mentioned wanting to update the password later (currently in .env)

### 📝 Important Context
- This is part of a larger GTD/PKM system in Obsidian
- Person pages are in `/Users/<Owner>/switchboard/`
- Daily notes are in `/Users/<Owner>/switchboard/dailynote/`
- The system also integrates with Google Calendar, Gmail API, and Apple Reminders
- Uses OpenAI GPT-5 for content synthesis (API key in .env)

### ⚠️ Notes for Next Session
- Password in `.env` is temporary - user plans to update it
- The MailStore search now properly searches across ALL email account folders (was only searching INBOX before)
- If connection fails, check `node tools/scanMailstoreCapabilities.js` first
- The system prefers local/cached data to minimize API calls

## Testing Commands

Quick test to verify everything still works:

```bash
cd /Users/<Owner>/obs-dailynotes
node tools/mailstoreSearch.js
```

If that succeeds, MailStore is connected and ready for enrichment tasks.

## User's Goal
<Owner> is building a comprehensive relationship management system that enriches person pages with:
- Email history and patterns
- Calendar interactions
- Public information (Wikipedia, GitHub)
- Meeting notes and context
- Connected people networks

The MailStore integration provides the crucial email history component, spanning 20+ years of communications.
