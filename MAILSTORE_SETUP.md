# MailStore Configuration - WORKING

## Configuration Files

### 1. `/Users/joi/obs-dailynotes/config/mailstore.json`

```json
{
  "host": "172.27.1.64",
  "port": 993,
  "user": "joi",
  "authMethod": "PLAIN",
  "tls": true,
  "tlsOptions": { "rejectUnauthorized": false }
}
```

### 2. macOS Keychain (preferred)

```bash
# Create or update a generic password for MailStore
security add-generic-password -a "joi" -s "obs-dailynotes.mailstore" -w '<your-password>' -U

# Optional: customize service/account via env
# export MAILSTORE_KEYCHAIN_SERVICE="obs-dailynotes.mailstore"
# export MAILSTORE_KEYCHAIN_ACCOUNT="joi"  # defaults to MAILSTORE_USER
```

### 3. `/Users/joi/obs-dailynotes/.env` (host/user only; password no longer required)

```bash
# MailStore IMAP Configuration (Secure SSL/TLS)
MAILSTORE_HOST=172.27.1.64
MAILSTORE_USER=joi
# MAILSTORE_PASSWORD=<fallback-only>
```

## Available Email Archives

Your MailStore contains emails from:
- `joi@media.mit.edu` (archives from 1999-2012)
- `joiito@gmail.com`
- `ji@media.mit.edu`
- `joi@kula.jp`
- `joi@ito.com`
- `jito@neoteny.com`

## Usage Examples

### Test Connection

```bash
node tools/mailstoreSearch.js
```

### Enrich a Person

```bash
export PERSON_KEY="Person Name"
export PERSON_EMAIL="their.email@example.com"
node tools/enrichFromMailStore.js

# Then run LLM enrichment
SKIP_PREFETCH=1 PERSON_FILE="/Users/joi/switchboard/Person Name.md" \
  node tools/enrichFromLLM.js
```

### Search for Specific Person

```bash
node -e "
const { MailStoreSearch } = require('./tools/mailstoreSearch');
const search = new MailStoreSearch({});
search.connect().then(() => {
  return search.searchPerson('email@example.com', 'Name', 50);
}).then(results => {
  console.log(results);
  search.disconnect();
});
"
```

## Notes

- Authentication method: `AUTH=PLAIN` over SSL/TLS
- Server: MailStore on NAS (joi-11-nas-2)
- Port 993 for secure IMAP
- Searches across all email account folders
- Contains 20+ years of email history

## Troubleshooting

If connection fails:
1. Ensure the Keychain item exists (service `obs-dailynotes.mailstore`, account `joi`)
2. Verify MailStore service is running
3. Test with: `openssl s_client -connect 172.27.1.64:993`
4. Check capabilities: `node tools/scanMailstoreCapabilities.js`
