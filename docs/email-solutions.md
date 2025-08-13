# Email Search Solutions

## Option 1: Find macOS 15.6 Mail Format

Run this with Mail.app open and showing emails:

```bash
cd /Users/joi/obs-dailynotes

# Find what format Mail is using
node tools/findMailFormat.js

# Check what files Mail has open
sudo lsof -p $(pgrep Mail) | grep -v Cache

# Monitor file access in real-time
sudo fs_usage -w -f pathname $(pgrep Mail)
```

### Likely Formats on macOS 15.6

Based on investigation, Mail probably uses:
1. **SQLite database** in memory-mapped mode
2. **Core Data** with `.storedata` files
3. **CloudKit** containers synced with iCloud
4. **Shared memory segments** for performance

The emails exist but are not in `.emlx` format anymore.

## Option 2: MailStore IMAP (RECOMMENDED!)

MailStore is a **MUCH better solution** than fighting with Apple's proprietary format!

### Why MailStore is Perfect

- ✅ **Standard IMAP protocol** - works with any client
- ✅ **All your archived emails** in one place
- ✅ **Full-text search** capabilities
- ✅ **No proprietary formats** to reverse-engineer
- ✅ **Reliable and consistent** access
- ✅ **Works across macOS versions**

### Setup MailStore Integration

#### 1. Create Configuration

Create `config/mailstore.json`:

```json
{
  "host": "your-mailstore-server.com",
  "port": 143,
  "user": "your-username",
  "password": "your-password",
  "tls": true
}
```

Or use environment variables (password via Keychain preferred):

```bash
export MAILSTORE_HOST="your-server.com"
export MAILSTORE_USER="username"
# Password is read from macOS Keychain service "obs-dailynotes.mailstore".
# To set:
# security add-generic-password -a "username" -s "obs-dailynotes.mailstore" -w "<password>" -U
# Fallback only: export MAILSTORE_PASSWORD="password"
```

#### 2. Test Connection

```bash
cd /Users/joi/obs-dailynotes
npm install imap  # Install IMAP library
node tools/mailstoreSearch.js
```

This will:
- Connect to MailStore
- List available folders
- Test search for Alexander Lourie

#### 3. Enrich Using MailStore

```bash
# Set person details
export PERSON_KEY="Alexander Lourie"
export PERSON_EMAIL="alexander.lourie@bfkn.com"
export PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md"

# Fetch from MailStore and enrich
node tools/enrichFromMailStore.js

# Then run enrichment with cached data
SKIP_PREFETCH=1 node tools/enrichFromLLM.js
```

### MailStore Search Capabilities

The integration supports:
- Search by email address (FROM/TO)
- Search by person name (full text)
- Retrieve message headers (date, subject, from, to)
- Multiple folder support (INBOX, Archive, All Mail)
- Caching results for enrichment

### Complete Workflow with MailStore

```bash
# 1. Configure MailStore (one time)
cat > config/mailstore.json << EOF
{
  "host": "mailstore.example.com",
  "port": 143,
  "user": "joi",
  "password": "your-password",
  "tls": true
}
EOF

# 2. Test it works
node tools/mailstoreSearch.js

# 3. Enrich any person
export PERSON_KEY="Person Name"
export PERSON_EMAIL="email@example.com"
node tools/enrichFromMailStore.js

# 4. Run LLM enrichment
SKIP_PREFETCH=1 PERSON_FILE="/Users/joi/switchboard/Person Name.md" \
  node tools/enrichFromLLM.js
```

## Option 3: Continue with Gmail API

If MailStore isn't available, Gmail API still works:

```bash
SKIP_LOCAL=1 PERSON_FILE="/Users/joi/switchboard/Alexander Lourie.md" \
  node tools/enrichFromLLM.js
```

## Comparison

| Method | Pros | Cons |
|--------|------|------|
| **MailStore IMAP** | • All archived emails • Standard protocol • Reliable • Full-text search | • Needs server setup • Network required |
| **Gmail API** | • Works now • Cloud-based • No local setup | • Only Gmail emails • Rate limits • OAuth needed |
| **Local Mail.app** | • Would be fastest • No network | • Format unknown • Broken on macOS 15.6 • No .emlx files |

## Recommendation

**Use MailStore!** It's the best solution because:
1. Has ALL your historical emails (not just Gmail)
2. Uses standard IMAP (not proprietary)
3. Works reliably across OS versions
4. Perfect for archival and enrichment

Set up MailStore integration now - it's much better than trying to reverse-engineer Apple's constantly changing Mail format!
