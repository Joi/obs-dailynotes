#!/bin/zsh
set -euo pipefail

# Wrapper to enrich the current Obsidian person page.
# Resolves path from clipboard (plain path, obsidian://, or file://),
# falls back to a file chooser, then runs enrichPersonPage.js.

# Ensure standard system paths are available even in restricted environments
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

VAULT="/Users/joi/switchboard"
REPO="/Users/joi/obs-dailynotes"

cd "$REPO"

clip="$(pbpaste || true)"

# Simple logger for debugging macro runs
LOG_DIR="$REPO/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/km-enrich.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] clip=\"${clip}\"" >> "$LOG_FILE"

decode_uri() {
  python3 - "$1" << 'PY'
import sys, urllib.parse
print(urllib.parse.unquote(sys.argv[1]))
PY
}

resolve_from_clipboard() {
  local input="$1"
  local path="$input"

  if [[ -z "${path}" ]]; then
    echo ""; return 0
  fi

  if [[ "$path" == obsidian://* ]]; then
    # Handle obsidian://open?path=/abs/path or obsidian://open?vault=...&file=relative/path
    local decoded
    decoded="$(python3 - <<'PY'
import os, sys, urllib.parse
url = sys.argv[1]
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
"$path")"
    if [[ -n "$decoded" ]]; then
      if [[ "${decoded:0:1}" == "/" ]]; then
        path="$decoded"
      else
        path="$VAULT/$decoded"
      fi
    else
      path=""  # force chooser if we couldn't parse
    fi
  elif [[ "$path" == file://* ]]; then
    path="$(python3 - <<PY
import urllib.parse
print(urllib.parse.urlsplit("$path").path)
PY
)"
  fi

  if [[ "${path:0:1}" != "/" ]]; then
    if [[ -f "$VAULT/$path" ]]; then
      path="$VAULT/$path"
    elif [[ -f "$VAULT/${path}.md" ]]; then
      path="$VAULT/${path}.md"
    else
      local base="${path%.md}"
      local found
      found="$(find "$VAULT" -type f -name "$base.md" -print -quit 2>/dev/null || true)"
      [[ -n "$found" ]] && path="$found"
    fi
  fi

  echo "$path"
}

path="$(resolve_from_clipboard "$clip")"

if [[ -z "${path}" || ! -f "$path" || "${path##*.}" != "md" ]]; then
  # Prompt for file via AppleScript
  path=$(osascript <<'APPLESCRIPT'
set defaultLoc to POSIX file "/Users/joi/switchboard"
try
  set f to choose file with prompt "Select a person page (.md)" default location defaultLoc
on error
  return ""
end try
POSIX path of f
APPLESCRIPT
  )
fi

if [[ -z "${path}" ]]; then
  echo "No file selected; aborting." >&2
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] resolved=\"${path}\"" >> "$LOG_FILE"

# Resolve Node binary robustly
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node $HOME/.nvm/versions/node/*/bin/node; do
    if [[ -x "$candidate" ]]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [[ -z "$NODE_BIN" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: node not found in PATH" >> "$LOG_FILE"
  exit 1
fi

"$NODE_BIN" tools/enrichPersonPage.js "$path" >> "$LOG_FILE" 2>&1 || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR running enrich" >> "$LOG_FILE"
  exit 1
}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] success" >> "$LOG_FILE"


