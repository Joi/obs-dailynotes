#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "Syncing to GitHub (excluding _private/ and _local/)..."

git add -A
git commit -m "chore(sync): vault updates" || true

echo "Push with filters handled by .gitignore"
git push origin main

echo "Done."


