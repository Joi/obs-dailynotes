#!/bin/zsh
set -euo pipefail

# Wrapper to enrich the current Obsidian person page.
# Resolves path from clipboard (plain path, obsidian://, or file://),
# falls back to a file chooser, then runs enrichPersonPage.js.

# Ensure standard system paths are available even in restricted environments
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
# Guard against Homebrew ICU mismatches for Node (dyld libicui18n.*.dylib)
export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/opt/icu4c/lib:${DYLD_FALLBACK_LIBRARY_PATH:-}"

# Basic start log
START_TS="$([ -x /bin/date ] && /bin/date '+%Y-%m-%d %H:%M:%S' || date '+%Y-%m-%d %H:%M:%S')"

# Ensure Gmail MCP has creds/token paths in env (fallbacks if not set via .env)
export GMAIL_CREDS_PATH="${GMAIL_CREDS_PATH:-$HOME/.gcalendar/credentials.json}"
export GMAIL_TOKEN_PATH="${GMAIL_TOKEN_PATH:-$HOME/.gmail/token.json}"
# Also accept Calendar aliases for robustness
export GCAL_CREDS_PATH="${GCAL_CREDS_PATH:-$GMAIL_CREDS_PATH}"
export GCAL_TOKEN_PATH="${GCAL_TOKEN_PATH:-$GMAIL_TOKEN_PATH}"

# Ensure MCP server defaults
export MCP_GMAIL_CMD="${MCP_GMAIL_CMD:-node}"
export MCP_GMAIL_ARGS="${MCP_GMAIL_ARGS:-tools/mcpServers/gmailServer.js}"
# Inject public summary by default (can override by exporting INJECT_PUBLIC_SUMMARY=0)
export INJECT_PUBLIC_SUMMARY="${INJECT_PUBLIC_SUMMARY:-1}"

VAULT="/Users/<Owner>/switchboard"
REPO="/Users/<Owner>/obs-dailynotes"

cd "$REPO"

clip="$(pbpaste || true)"

# Simple logger for debugging macro runs
LOG_DIR="$REPO/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/km-enrich.log"
echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] clip=\"${clip}\"" >> "$LOG_FILE"
echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] env_PERSON_FILE=\"${PERSON_FILE:-}\" PWD=\"$PWD\" SHELL=\"$SHELL\"" >> "$LOG_FILE"
if command -v osascript >/dev/null 2>&1; then
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] has_osascript=1" >> "$LOG_FILE"
else
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] has_osascript=0" >> "$LOG_FILE"
fi

decode_uri() {
  echo "$1" | python3 - << 'PY'
import sys, urllib.parse
print(urllib.parse.unquote(sys.stdin.read().strip()))
PY
}

resolve_from_clipboard() {
  local input="$1"
  local path="$input"

  if test -z "${path}"; then
    echo ""; return 0
  fi

  # Quick sanity: ignore clipboard if it clearly isn't a path/URI or .md filename
  if ! echo "$path" | grep -qE '(\.md$|\.md"$|obsidian://|file://|^/)'; then
    echo ""; return 0
  fi

  if echo "$path" | grep -q '^obsidian://'; then
    # Handle obsidian://open?path=/abs/path or obsidian://open?vault=...&file=relative/path
    local decoded
    decoded="$(echo "$path" | python3 - <<'PY'
import os, sys, urllib.parse
url = sys.stdin.read().strip()
u = urllib.parse.urlsplit(url)
qs = urllib.parse.parse_qs(u.query)
if 'path' in qs and qs['path']:
    p = urllib.parse.unquote(qs['path'][0])
    print(p)
elif 'file' in qs and qs['file']:
    f = urllib.parse.unquote(qs['file'][0])
    print(f)
else:
    print('')
PY
)"
    if test -n "$decoded"; then
      if test "${decoded:0:1}" = "/"; then
        path="$decoded"
      else
        path="$VAULT/$decoded"
      fi
    else
      path=""  # force chooser if we couldn't parse
    fi
  elif echo "$path" | grep -q '^file://'; then
    path="$(echo "$path" | python3 - <<PY
import sys, urllib.parse
url = sys.stdin.read().strip()
print(urllib.parse.urlsplit(url).path)
PY
)"
  fi

  # Resolve to an existing file; handle both absolute and relative with optional .md
  if test "${path:0:1}" = "/"; then
    if ! test -f "$path"; then
      if test -f "${path}.md"; then
        path="${path}.md"
      else
        local base
        base="$(basename "${path%.md}")"
        local found
        found="$(find "$VAULT" -type f -name "$base.md" -print -quit 2>/dev/null || true)"
        test -n "$found" && path="$found"
      fi
    fi
  else
    if test -f "$VAULT/$path"; then
      path="$VAULT/$path"
    elif test -f "$VAULT/${path}.md"; then
      path="$VAULT/${path}.md"
    else
      local base="${path%.md}"
      local found
      found="$(find "$VAULT" -type f -name "$base.md" -print -quit 2>/dev/null || true)"
      test -n "$found" && path="$found"
    fi
  fi

  echo "$path"
}

path="${PERSON_FILE:-}"
echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] before_resolve" >> "$LOG_FILE"
if test -z "${path}"; then
  # Fast path: clipboard is a filename in the vault
  if test -n "${clip}" && test -f "$VAULT/$clip"; then
    path="$VAULT/$clip"
    echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] used_fastpath_clip=1" >> "$LOG_FILE"
  else
    set +e
    path="$(resolve_from_clipboard "$clip")"
    st=$?
    set -e
    echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] after_resolve status=$st" >> "$LOG_FILE"
  fi
fi

# Early debug: what did we get from clipboard resolution?
if test -f "${path}"; then
  exists=1
else
  exists=0
fi
echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] candidate=\"${path}\" exists=$exists" >> "$LOG_FILE"

if test -z "${path}"; then
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] No path found; exiting" >> "$LOG_FILE"
  exit 0
fi

if ! test -f "${path}"; then
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] Path not a file: $path; exiting" >> "$LOG_FILE"
  exit 0
fi

# Check file extension
ext="${path##*.}"
if test "${ext}" != "md"; then
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] Not an .md file: $path; exiting" >> "$LOG_FILE"
  exit 0
fi

echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] resolved=\"${path}\"" >> "$LOG_FILE"

# Resolve Node binary robustly
NODE_BIN="$(command -v node || true)"
if test -z "${NODE_BIN}"; then
  for candidate in $HOME/.nvm/versions/node/*/bin/node /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if test -x "${candidate}"; then NODE_BIN="$candidate"; break; fi
  done
fi
if test -z "${NODE_BIN}"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: node not found in PATH" >> "$LOG_FILE"
  exit 1
fi

# Log node path and version for diagnostics
echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] node=\"$NODE_BIN\" version=\"$($NODE_BIN -v 2>/dev/null || echo unknown)\"" >> "$LOG_FILE"

# Note: Node tools load $REPO/.env internally via dotenv; no need to source .env here.

# Call the LLM enricher (auto-prefetches public+gmail, updates page and private notes)
echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] invoking_enrich PERSON_FILE=\"$path\"" >> "$LOG_FILE"
PERSON_FILE="$path" "$NODE_BIN" tools/enrichFromLLM.js >> "$LOG_FILE" 2>&1 || {
  echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] ERROR running enrichFromLLM" >> "$LOG_FILE"
  exit 1
}

echo "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] success" >> "$LOG_FILE"


