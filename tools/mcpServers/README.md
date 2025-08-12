---
slug: readme
id: 'undefined:readme'
---
## MCP Servers (JSON-RPC) and gmail_deep mode

This directory contains minimal MCP servers that speak JSON-RPC 2.0 over stdio. They are used by `tools/mcpClient.js` to fetch per‑person context (e.g., Gmail).

MCP servers follow a simple contract:

- `initialize` → `{ serverInfo: { name, version } }`
- `tools/list` → `{ tools: [{ name, description, inputSchema }] }`
- `tools/call` with `{ name, arguments }` → `{ result }`

### Available servers

- Gmail server: `gmailServer.js` (documented below)
  - Tools:
    - `gmail.searchThreads` → search by query; returns ids, headers, snippet
    - `gmail.searchMessages` → search with optional body preview when deep

### gmail_deep: what it is

- **Default (summary/metadata mode)**: Uses Gmail `metadata` scope and returns lightweight thread/message headers and snippets for quick context.
- **Deep mode (`gmail_deep`)**: Switches to Gmail `readonly` scope and fetches message previews for richer context.

Deep mode is enabled per person or globally:

- **Per-person (frontmatter flag)**: Add to a person page in your vault:

  ```markdown
  ---
  gmail_deep: true
  ---
  ```

- **Globally (environment variable)**: Set `GMAIL_DEEP=1` when running the Gmail server or the client.

Internally, deep mode affects:

- OAuth scopes in `gmailServer.js`:
  - Deep: `https://www.googleapis.com/auth/gmail.readonly`
  - Summary: `https://www.googleapis.com/auth/gmail.metadata`
- Client fetch behavior in `mcpClient.js`:
  - Deep: `fetchGmailMessagesWithPreview(...)`
  - Summary: `fetchGmailSummaryByEmail(...)`

### Files

- `gmailServer.js`: JSON‑RPC (stdio) MCP server for Gmail. Respects `GMAIL_DEEP=1` or `GMAIL_SCOPE=readonly` to select scopes.
- `bootstrapGmailAuth.js`: One‑time OAuth bootstrap for the standalone Gmail server.

### Environment variables

- `GMAIL_CREDS_PATH`: Path to OAuth client credentials JSON. Falls back to `GCAL_CREDS_PATH` if not set.
- `GMAIL_TOKEN_PATH`: Token JSON path. Defaults to `~/.gmail/token.json` (created on first run, `0600` perms).
- `GMAIL_DEEP`: If `1` (or truthy), use readonly scope and deep fetch.
- `GMAIL_SCOPE`: Alternative to `GMAIL_DEEP`; set to `readonly` to force deep, `metadata` for summary.
- `GMAIL_OAUTH_CODE`: Used only by `bootstrapGmailAuth.js` step 2.

Client integration variables:

- `MCP_GMAIL_CMD` / `MCP_GMAIL_ARGS`: How to launch the Gmail MCP server (e.g., `node` and `tools/mcpServers/gmailServer.js`).
- `MCP_CAL_CMD` / `MCP_CAL_ARGS`: Reserved for a Calendar MCP server (not required; calendar context is currently fetched directly elsewhere).

### OAuth bootstrap

1. Print authorization URL:

```bash
cd /Users/<Owner>/obs-dailynotes
GMAIL_CREDS_PATH=~/.gcalendar/credentials.json \
GMAIL_TOKEN_PATH=~/.gmail/token.json \
node tools/mcpServers/bootstrapGmailAuth.js | cat
```

1. Paste the printed URL in a browser, grant access, copy the code, then save the token:

```bash
cd /Users/<Owner>/obs-dailynotes
GMAIL_CREDS_PATH=~/.gcalendar/credentials.json \
GMAIL_TOKEN_PATH=~/.gmail/token.json \
GMAIL_OAUTH_CODE="<paste_code_here>" \
node tools/mcpServers/bootstrapGmailAuth.js | cat
```

Optional: force deep scope during bootstrap by exporting `GMAIL_DEEP=1`.

### Running the Gmail server

Summary mode (metadata scope):

```bash
cd /Users/<Owner>/obs-dailynotes
GMAIL_CREDS_PATH=~/.gcalendar/credentials.json \
GMAIL_TOKEN_PATH=~/.gmail/token.json \
node tools/mcpServers/gmailServer.js | cat
```

Deep mode (readonly scope):

```bash
cd /Users/<Owner>/obs-dailynotes
GMAIL_CREDS_PATH=~/.gcalendar/credentials.json \
GMAIL_TOKEN_PATH=~/.gmail/token.json \
GMAIL_DEEP=1 \
node tools/mcpServers/gmailServer.js | cat
```

### Fetching Gmail context via the client

The client will automatically enable deep mode if the person’s frontmatter has `gmail_deep: true`, otherwise it uses summary mode. You can also force deep mode by exporting `GMAIL_DEEP=1`.

```bash
cd /Users/<Owner>/obs-dailynotes
PERSON_EMAIL="user@example.com" \
MCP_GMAIL_CMD="node" MCP_GMAIL_ARGS="tools/mcpServers/gmailServer.js" \
node tools/mcpClient.js | cat
```

Results are cached under `data/people_cache/` keyed by email/person.

### Tool reference (Gmail)

- `gmail.searchThreads { query: string, limit?: number }`
  - Returns: `[{ id, threadId, internalDate, snippet, headers: {From, To, Subject, Date} }]`
- `gmail.searchMessages { query: string, limit?: number }`
  - Returns: `[{ id, threadId, internalDate, headers, preview, snippet }]`
  - Behavior: When deep mode is on, `preview` is derived from safe text parts of the message body; otherwise `preview` may be empty and only `snippet` is provided by Gmail.

### How deep mode is selected per person

- `tools/mcpClient.js` checks:
  1. `GMAIL_DEEP` env or `GMAIL_SCOPE=readonly`
  1. If not set, reads the person page frontmatter for `gmail_deep: true`
  1. If deep, the client sets `GMAIL_DEEP=1` for the launched server and selects the preview‑fetching code path

### Notable integrations

- `tools/mcpClient.js`: Starts MCP servers, calls tools, and writes to `data/people_cache/<person>.json` under keys like `gmailByEmail`.
- `tools/runAllPeople.js`: For each person with an email, launches the Gmail server and fetches Gmail context; honors frontmatter `gmail_deep`.
- `tools/batchEnrichPeople.js`: Same pattern as `runAllPeople.js`, but optimized for batch runs and tolerant of failures.

### Development notes (MCP servers)

- Servers read newline‑delimited JSON requests from stdin and write responses to stdout.
- Always terminate each JSON object with a single `\n`.
- Keep responses small; the client performs caching and downstream processing.
- Prefer metadata scope by default; opt‑in to readonly only when `gmail_deep` is required.

### Related code references

- `tools/mcpClient.js`: decides deep vs summary based on `GMAIL_DEEP` env or per‑person `gmail_deep` flag.
- `tools/runAllPeople.js` and `tools/batchEnrichPeople.js`: read `gmail_deep` from person frontmatter and set `GMAIL_DEEP=1` when invoking the client.


