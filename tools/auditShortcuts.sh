#!/usr/bin/env bash
set -euo pipefail

# Audit macOS and common app hotkeys and print a Markdown report to stdout.
# Usage examples:
#   tools/auditShortcuts.sh > /Users/<Owner>/switchboard/Shortcuts_audit.md
#   tools/auditShortcuts.sh | less -R

print_section() {
  local title="$1"
  echo "## ${title}"
}

print_subsection() {
  local title="$1"
  echo "### ${title}"
}

md_escape() { sed 's/\t/    /g'; }

now_iso() { date +%Y-%m-%dT%H:%M:%S%z; }

echo "# Hotkey Audit"
echo "- Generated: $(now_iso)"
echo ""

# 1) macOS App Shortcuts (NSUserKeyEquivalents)
print_section "macOS App Shortcuts (NSUserKeyEquivalents)"
if defaults read -g NSUserKeyEquivalents >/dev/null 2>&1; then
  defaults read -g NSUserKeyEquivalents | md_escape
else
  echo "No global App Shortcuts overrides found."
fi
echo ""

# 2) System Symbolic Hotkeys
print_section "System Symbolic Hotkeys"
if [ -f "$HOME/Library/Preferences/com.apple.symbolichotkeys.plist" ]; then
  plutil -convert xml1 -o - "$HOME/Library/Preferences/com.apple.symbolichotkeys.plist" | md_escape
else
  echo "symbolichotkeys plist not found."
fi
echo ""

# 3) Cursor and VS Code user keybindings
print_section "Editor User Keybindings"
CURSOR_KEYS="$HOME/Library/Application Support/Cursor/User/keybindings.json"
VSCODE_KEYS="$HOME/Library/Application Support/Code/User/keybindings.json"

if [ -f "$CURSOR_KEYS" ]; then
  print_subsection "Cursor"
  jq -r '.[] | select(.key) | "- " + (.key) + " → " + (.command) + (if .when then " (" + .when + ")" else "" end)' "$CURSOR_KEYS" 2>/dev/null || cat "$CURSOR_KEYS"
else
  echo "### Cursor"
  echo "No user keybindings file found."
fi

echo ""

if [ -f "$VSCODE_KEYS" ]; then
  print_subsection "VS Code"
  jq -r '.[] | select(.key) | "- " + (.key) + " → " + (.command) + (if .when then " (" + .when + ")" else "" end)' "$VSCODE_KEYS" 2>/dev/null || cat "$VSCODE_KEYS"
else
  echo "### VS Code"
  echo "No user keybindings file found."
fi
echo ""

# 4) Keyboard Maestro (list Hot Key Triggers)
print_section "Keyboard Maestro Hot Key Triggers"
KM_PLIST="$HOME/Library/Application Support/Keyboard Maestro/Keyboard Maestro Macros.plist"
if [ -f "$KM_PLIST" ]; then
  # Convert to XML and extract blocks with Hot Key Trigger (MacroTriggerType == 6)
  plutil -convert xml1 -o - "$KM_PLIST" \
    | awk 'BEGIN{RS="</dict>"} /<key>MacroTriggerType<\/key>\s*<integer>6<\/integer>/ {print $0"\n---"}' \
    | sed -E 's/<[^>]+>//g; s/&amp;/&/g; s/^[[:space:]]+//; s/[[:space:]]+$//' \
    | awk 'BEGIN{FS="\n"} {for(i=1;i<=NF;i++){if($i ~ /Name/){name=$i}; if($i ~ /KeyCode/){key=$i}; if($i ~ /Modifiers/){mods=$i}}; if(name!=""){printf("- %s\n", name)}; if(key!=""){printf("  %s\n", key)}; if(mods!=""){printf("  %s\n\n", mods)}; name=""; key=""; mods=""}' \
    | md_escape
else
  echo "Keyboard Maestro macros file not found."
fi
echo ""

# 5) Karabiner-Elements
print_section "Karabiner-Elements"
if [ -f "$HOME/.config/karabiner/karabiner.json" ]; then
  jq -r '..|objects?|.[]?|select(.to?)|select((.to[]?.key_code?!=null) and (.to[]?.modifiers?!=null))' "$HOME/.config/karabiner/karabiner.json" 2>/dev/null || cat "$HOME/.config/karabiner/karabiner.json"
else
  echo "No Karabiner config present."
fi
echo ""

# 6) Hammerspoon
print_section "Hammerspoon"
if [ -d "$HOME/.hammerspoon" ]; then
  grep -RniE 'hs\.hotkey\.bind\(' "$HOME/.hammerspoon" 2>/dev/null | md_escape || true
else
  echo "No Hammerspoon config present."
fi
echo ""

# 7) App Shortcuts per-app domains for common editors
print_section "Per-App App Shortcuts (common editors)"
for d in com.todesktop.230313mzl4w4u92 com.microsoft.VSCode com.googlecode.iterm2; do
  echo "### $d"
  if defaults read "$d" NSUserKeyEquivalents >/dev/null 2>&1; then
    defaults read "$d" NSUserKeyEquivalents | md_escape
  else
    echo "No overrides."
  fi
  echo ""
done

echo "End of audit."


