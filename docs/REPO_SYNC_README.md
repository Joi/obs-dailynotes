# Repository Sync System

Automated tracking and synchronization of all git repositories in your home directory, with integration into daily notes.

## Overview

The repo sync system provides:
- **Automatic discovery** of all git repos in `~/`
- **Sync status tracking** (synced, ahead, behind, diverged)
- **Version detection** from `pyproject.toml` or `package.json`
- **Project linking** - connect Amplifier projects to their repositories
- **Daily note integration** - see repo status in your daily notes

## Two-File Architecture

### `~/switchboard/amplifier/repos.json`
Repository inventory with sync metadata:
- All git repos discovered in `~/`
- Current branch, commit hashes, sync status
- GitHub remote URLs (origin and upstream)
- Version numbers from package files
- Working tree status (clean/dirty)

### `~/switchboard/amplifier/project-status.json`
Project management with repo linking:
- Amplifier projects you're working on
- Links to repos via `repoId` field
- Project status, priority, next actions
- Created/updated timestamps

## CLI Commands

### Scan for Repositories
```bash
npm run repos:scan
```
Discovers all git repositories in `~/` and saves to `repos.json`.

Output:
- Total repos found
- Summary by sync status
- List of all repos with paths and status

### Check Sync Status
```bash
npm run repos:check
```
Updates sync status for all repos (fetches from remotes).

Output:
- Repos that need attention (ahead, behind, diverged, dirty)
- Suggested actions for each
- Updated `repos.json` with latest status

### Sync Repositories
```bash
# Pull all repos that are behind
npm run repos:sync

# Push all repos that are ahead
npm run repos:sync-push

# Sync specific repo (pull)
npm run repos:sync amplifier

# Push specific repo
npm run repos:sync amplifier -- --push

# Force sync without confirmation
npm run repos:sync -- --force
```

Pulls or pushes repositories based on sync status.

## Daily Note Integration

When you run `npm run daily`, the daily note will include:

```markdown
## 🔧 Amplifier Projects

### 🚀 Active
- 🟠 **Knowledge Synthesis** (high)
  - 📦 amplifier v0.1.0: main @ b98e97d - ✅ synced
  - Next: Implement graph visualization

- 🟠 **Daily Notes Sync** (high)
  - 📦 obs-dailynotes: main @ 114253c - ⚠️ 2 commits ahead
  - Next: Add repo sync checking
```

The sync status icons:
- ✅ Synced - local matches remote
- ⬆️ Ahead - local has commits to push
- ⚠️ Behind - remote has commits to pull
- ❌ Diverged - both have unique commits
- 🔗 No Remote - no remote configured
- ❓ Unknown - unable to determine status

## Setting Up Projects

Create or edit `~/switchboard/amplifier/project-status.json`:

```json
{
  "projects": [
    {
      "id": "knowledge-synthesis",
      "title": "Knowledge Synthesis",
      "file": "knowledge-synthesis.md",
      "repoId": "amplifier",
      "status": "started",
      "priority": "high",
      "nextActions": [
        "Implement graph visualization",
        "Add cross-document linking"
      ],
      "created": "2025-11-01",
      "lastUpdated": "2025-11-12"
    }
  ]
}
```

The `repoId` field links to a repo in `repos.json` (matched by `id` or `name` field).

## Workflow

### Initial Setup
```bash
# 1. Scan for all repos
npm run repos:scan

# 2. Create project-status.json manually
# Link projects to repos using repoId

# 3. Check sync status
npm run repos:check
```

### Daily Routine
```bash
# Morning: Check what needs syncing
npm run repos:check

# Pull repos that are behind
npm run repos:sync

# Generate daily note (includes repo status)
npm run daily

# Evening: Push your work
npm run repos:sync-push
```

### Periodic Maintenance
```bash
# Re-scan to discover new repos
npm run repos:scan

# Update all sync statuses
npm run repos:check
```

## How It Works

### Repository Discovery
- Recursively scans `~/` for `.git` directories (max depth: 2)
- Skips common non-repo directories (node_modules, .venv, etc.)
- Extracts metadata using git commands
- Detects versions from `pyproject.toml` or `package.json`

### Sync Detection
- Compares local HEAD with remote tracking branch
- Uses `git rev-list` to count commits ahead/behind
- Checks working tree with `git status --porcelain`
- Handles repos without remotes gracefully

### Version Detection
- Python: Looks for `version = "..."` in `pyproject.toml`
- Node: Reads `version` from `package.json`
- Falls back to commit hash if no version file

## Configuration

Environment variables:
```bash
# Override switchboard location (default: ~/switchboard)
export SWITCHBOARD_PATH=/custom/path

# Enable debug logging
export DEBUG=1
```

## Files Created

- `~/switchboard/amplifier/repos.json` - Repository inventory
- `~/switchboard/amplifier/project-status.json` - Project tracking (manual)

## Troubleshooting

### No repos found
- Check if you have git repos in `~/`
- Try increasing scan depth (edit `lib/repoScanner.js`)

### Sync status shows "unknown"
- Repo might not have a remote configured
- Fetch might have failed (check network)

### Daily note doesn't show repos
- Ensure `project-status.json` exists
- Check that `repoId` matches repo ID in `repos.json`
- Run `npm run daily` to regenerate

## Architecture

```
bin/
  scan-repos.js     - CLI to discover repos
  check-sync.js     - CLI to update sync status
  sync-repos.js     - CLI to pull/push repos

lib/
  repoScanner.js    - Discovery and metadata extraction
  repoSync.js       - Sync status checking and operations
  amplifierProjects.js - Daily note integration

~/switchboard/amplifier/
  repos.json        - Repository inventory (auto-generated)
  project-status.json - Project tracking (manual)
```

## Future Enhancements

Potential additions:
- Auto-detect projects from repo directories
- GitHub Actions integration for automated checks
- Slack/email notifications for diverged repos
- Multi-machine sync coordination
- Branch protection warnings
- Uncommitted changes summary
