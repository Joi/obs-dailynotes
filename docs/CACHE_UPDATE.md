# Updating the Reminders Cache

**Problem**: The GTD dashboard reads from a cache file that can become stale.

**Current situation**: Cache update scripts are in `_archived/` and reference `reminders-cli` which isn't installed.

---

## Quick Solution (For Now)

**The cache shows data from**: `reminders_cache.json` timestamp

**To see current data**:
- Dashboard warns when cache is >24 hours old
- Cache auto-updates from some process (TBD which one)
- Or: We can rebuild the cache update script

---

## Options to Update Cache

### Option 1: Manual Sync (Simplest)

For now, the dashboard works with whatever data is in the cache.

If you've completed many tasks and want fresh data:
1. Wait for cache to update automatically (some background process may be doing this)
2. Or: We build a simple cache update script

### Option 2: Rebuild Cache Update Script

**Requirements**:
- Install `reminders-cli`: `brew install keith/formulae/reminders-cli`
- Create simple pull script that:
  1. Runs `reminders show --format json`
  2. Processes output
  3. Saves to `reminders_cache.json`

**Estimated effort**: 1-2 hours

### Option 3: Use Shortcuts App

Create a Shortcuts automation that:
1. Gets all reminders
2. Exports to JSON
3. Saves to cache file
4. Runs on schedule (daily)

---

## Recommendation

**For now**: Live with stale cache, dashboard still shows useful info

**This week**: Install reminders-cli and build simple pull script:
```bash
brew install keith/formulae/reminders-cli
```

Then create `tools/pullReminders.js` (simple version):
- Uses reminders-cli to get current data
- Saves to cache
- Called by `work refresh`

**Future**: Auto-update cache on `work refresh` so data is always current

---

## Impact of Stale Cache

**What's affected**:
- Inbox count (shows 70, actually 21)
- Task lists may include completed items
- New tasks won't appear

**What still works**:
- Presentations (has own data)
- Reading queue (has own data)
- Dashboard structure
- Commands and workflow

**Bottom line**: Dashboard is useful even with stale data, but fresh data would be better!

---

**Next step**: Want me to build a simple cache update script using reminders-cli?
