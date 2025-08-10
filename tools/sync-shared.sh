#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHARED_DIR="_shared"

if [ ! -d "$REPO_DIR/$SHARED_DIR" ]; then
  echo "No _shared/ directory present. Skipping."
  exit 0
fi

echo "Syncing _shared/ to team repository (configure remote separately)."
cd "$REPO_DIR/$SHARED_DIR"

git add -A
git commit -m "chore(shared): update" || true
git push

echo "Done."


