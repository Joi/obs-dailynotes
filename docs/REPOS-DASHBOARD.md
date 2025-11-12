# Repository Dashboard

*Last updated: Auto-generated from `repos.json`*

## 📊 At a Glance

| Repository | Status | Branch | Commit | Version | Action |
|------------|--------|--------|--------|---------|--------|
| amplifier | ✅ 💾 | main | b98e97d | v0.1.0 | Commit changes |
| chanoyu-db | ✅ 💾 | main | 4eddc12 | v1.7.0 | Commit changes |
| dotfiles-private | ✅ | master | 08ec3a5 | - | ✓ Good |
| health-tracker | ✅ | main | 75e2e15 | v1.3.3 | ✓ Good |
| joi_learning | ⚠️ | main | 7764835 | - | **Pull 1 commit** |
| joi-cv | ⚠️ 💾 | master | 5d53041 | - | Commit first, then pull |
| joi.github.io | ⚠️ 💾 | master | 58fb5ca | - | Commit first, then pull |
| obs-dailynotes | ✅ | main | 28cbcd9 | v3.0.0 | ✓ Good |
| qmk_firmware | ✅ 💾 | master | 13dcf8a | - | Commit changes |
| sophia-rec | ⚠️ | main | f7786bb | - | **Pull 7 commits** |
| tea-ai | ✅ | main | ddcc6ca | - | ✓ Good |
| wine-reconcile | ✅ | main | f32e7cb | - | ✓ Good |

**Legend:** ✅ Synced • ⬆️ Ahead • ⚠️ Behind • ❌ Diverged • 💾 Dirty

---

## 📊 Status Summary

Total repositories: 12

- ✅ Synced: 5
- ⬆️ Ahead: 0
- ⚠️ Behind: 2
- ❌ Diverged: 0
- 💾 Uncommitted changes: 5

---

## 🔄 Quick Sync Commands

```bash
# In /Users/joi/obs-dailynotes directory:

# Check sync status for all repos
npm run repos:check

# Pull all repos that are behind
npm run repos:sync

# Push all repos that are ahead
npm run repos:sync-push

# Sync specific repo
npm run repos:sync amplifier
npm run repos:sync amplifier -- --push

# Re-scan for new repos
npm run repos:scan
```

---

## 📦 All Repositories

### amplifier
- **Path:** `/Users/joi/amplifier`
- **GitHub:** [Joi/amplifier](https://github.com/Joi/amplifier)
- **Branch:** main @ b98e97d
- **Version:** v0.1.0
- **Status:** ✅ synced (dirty - uncommitted changes)
- **Action:** Commit or stash changes

---

### chanoyu-db
- **Path:** `/Users/joi/chanoyu-db`
- **GitHub:** [Joi/chanoyu-db](https://github.com/Joi/chanoyu-db)
- **Branch:** main @ 4eddc12
- **Version:** v1.7.0
- **Status:** ✅ synced (dirty - uncommitted changes)
- **Action:** Commit or stash changes

---

### dotfiles-private
- **Path:** `/Users/joi/dotfiles-private`
- **GitHub:** [Joi/dotfiles-private](https://github.com/Joi/dotfiles-private)
- **Branch:** master @ 08ec3a5
- **Status:** ✅ synced
- **Action:** None needed

---

### health-tracker
- **Path:** `/Users/joi/health-tracker`
- **GitHub:** [Joi/health-tracker](https://github.com/Joi/health-tracker)
- **Branch:** main @ 75e2e15
- **Version:** v1.3.3
- **Status:** ✅ synced
- **Action:** None needed

---

### joi_learning
- **Path:** `/Users/joi/joi_learning`
- **GitHub:** [Joi/joi_learning](https://github.com/Joi/joi_learning)
- **Branch:** main @ 7764835
- **Status:** ⚠️ 1 commit behind
- **Action:** `npm run repos:sync joi_learning`

---

### joi-cv
- **Path:** `/Users/joi/joi-cv`
- **GitHub:** [Joi/joi-cv](https://github.com/Joi/joi-cv)
- **Branch:** master @ 5d53041
- **Status:** ⚠️ 1 commit behind (dirty - uncommitted changes)
- **Action:** Commit or stash changes first

---

### joi.github.io
- **Path:** `/Users/joi/joi.github.io`
- **GitHub:** [Joi/joihub.io](https://github.com/Joi/joihub.io)
- **Branch:** master @ 58fb5ca
- **Status:** ⚠️ 1 commit behind (dirty - uncommitted changes)
- **Action:** Commit or stash changes first

---

### obs-dailynotes
- **Path:** `/Users/joi/obs-dailynotes`
- **GitHub:** [Joi/obs-dailynotes](https://github.com/Joi/obs-dailynotes)
- **Branch:** main @ 28cbcd9
- **Version:** v3.0.0
- **Status:** ✅ synced
- **Action:** None needed

---

### qmk_firmware
- **Path:** `/Users/joi/qmk_firmware`
- **GitHub:** [Joi/qmk_firmware](https://github.com/Joi/qmk_firmware)
- **Branch:** master @ 13dcf8a
- **Status:** ✅ synced (dirty - uncommitted changes)
- **Action:** Commit or stash changes

---

### sophia-rec
- **Path:** `/Users/joi/sophia-rec`
- **GitHub:** [Joi/sophia-rec](https://github.com/Joi/sophia-rec)
- **Branch:** main @ f7786bb
- **Status:** ⚠️ 7 commits behind
- **Action:** `npm run repos:sync sophia-rec`

---

### tea-ai
- **Path:** `/Users/joi/tea-ai`
- **GitHub:** [Joi/tea-ai](https://github.com/Joi/tea-ai)
- **Branch:** main @ ddcc6ca
- **Status:** ✅ synced
- **Action:** None needed

---

### wine-reconcile
- **Path:** `/Users/joi/wine-reconcile`
- **GitHub:** [Joi/wine-reconcile](https://github.com/Joi/wine-reconcile)
- **Branch:** main @ f32e7cb
- **Status:** ✅ synced
- **Action:** None needed

---

## 🔍 Understanding Status Icons

- ✅ **Synced** - Local matches remote, no action needed
- ⬆️ **Ahead** - Local has commits to push: `npm run repos:sync REPO_NAME -- --push`
- ⚠️ **Behind** - Remote has commits to pull: `npm run repos:sync REPO_NAME`
- ❌ **Diverged** - Both have unique commits, manual resolution needed
- 💾 **Dirty** - Uncommitted changes, commit or stash first
- 🔗 **No Remote** - No remote configured
- ❓ **Unknown** - Unable to determine status

---

## 📚 Detailed Instructions

### How to Sync a Repository

**If repo is BEHIND (needs pull):**
```bash
cd /Users/joi/obs-dailynotes
npm run repos:sync REPO_NAME
```

Example: Pull sophia-rec (7 commits behind):
```bash
npm run repos:sync sophia-rec
```

**If repo is AHEAD (needs push):**
```bash
npm run repos:sync REPO_NAME -- --push
```

**If repo is DIRTY (uncommitted changes):**
```bash
cd /path/to/repo
git status                    # See what changed
git add .                     # Stage changes
git commit -m "your message"  # Commit changes
```

**If repo is DIVERGED (manual resolution needed):**
```bash
cd /path/to/repo
git fetch origin
git status
# Choose one:
git pull --rebase origin BRANCH  # Rebase your commits
git pull origin BRANCH           # Merge (creates merge commit)
```

### Batch Operations

**Pull all repos that are behind:**
```bash
npm run repos:sync
# Will prompt for confirmation before pulling each repo
```

**Push all repos that are ahead:**
```bash
npm run repos:sync-push
```

**Skip confirmation prompts:**
```bash
npm run repos:sync -- --force
npm run repos:sync-push -- --force
```

### Checking Status

**Update sync status for all repos:**
```bash
npm run repos:check
```

This fetches from all remotes and updates the status. Run this daily or before syncing.

**Re-scan for new repositories:**
```bash
npm run repos:scan
```

Run this when you clone new repos to your home directory.

---

## 🔗 Related Documentation

- [[amplifier/REPO-SYNC-GUIDE|Complete Repo Sync Guide]]
- [[amplifier/README|Amplifier Projects]]

---

*💡 Tip: Bookmark this page for quick access to all your repos and sync commands!*

*This dashboard is manually maintained. Run `npm run repos:check` to get the latest status.*
