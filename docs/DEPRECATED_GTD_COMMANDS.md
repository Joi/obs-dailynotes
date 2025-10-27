# Deprecated GTD Commands

**Date**: 2025-10-27
**Reason**: GTD system was simplified, complex scripts moved to _archived/

---

## ⚠️ DO NOT USE THESE SCRIPTS

The following scripts are in `_archived/old-gtd-complex/` and should NOT be integrated into new features:

### Deprecated Scripts
- `pullReminders.js` - ARCHIVED
- `pullRemindersWithShared.js` - ARCHIVED  
- `processGTD.js` - ARCHIVED
- `syncReminders.js` - ARCHIVED
- `gtdSync.js` - ARCHIVED
- `gtdMorning.js` - ARCHIVED

### Why Archived

These scripts were part of a complex GTD implementation that was simplified. They have been replaced with:

**Current GTD System** (`lib/gtd-simple/`):
- `dashboard.js` - Generates GTD Dashboard from reminders cache
- `dailyNote.js` - Generates daily notes

**Active Scripts**:
- `tools/generateTodayTodos.js` - Creates today's todo list
- `tools/gtd_morning.sh` - Morning routine wrapper

---

## Current vs Deprecated

### ❌ DEPRECATED (Do not use)
```bash
npm run reminders:pull      # References archived script
npm run gtd:process         # References archived script  
npm run gtd:sync            # References archived scripts
npm run reminders:sync      # Already marked deprecated
```

### ✅ ACTIVE (Use these)
```bash
npm run daily               # Generate daily note
npm run pres:refresh        # Generate presentations dashboard
node lib/gtd-simple/dashboard.js  # Generate GTD dashboard
```

### ⚠️ UNCERTAIN (May reference deprecated code)
```bash
npm run gtd:morning         # May call deprecated scripts
npm run gtd:sync-dashboard  # Need to verify
```

---

## For Future AI Assistants

**IMPORTANT**: Before integrating GTD commands into new features:

1. **Check if the underlying script exists** in active code (not `_archived/`)
2. **Test the npm script** to see if it actually works
3. **If it fails**, do NOT try to fix the deprecated scripts
4. **Instead**, either:
   - Use only the working scripts (presentations, daily note)
   - Build new simple implementations
   - Document which commands don't work

**The `work` CLI should only expose commands that actually function.**

---

## Action Items

- [ ] Audit which npm scripts actually work
- [ ] Remove references to archived scripts from package.json
- [ ] Update `work` CLI to only include functional commands
- [ ] Document the simplified GTD approach
- [ ] Decide: rebuild needed GTD features or keep simple?

---

## Recommended Approach

**For now** (until GTD is rebuilt):

1. **Use `work` CLI for presentations** (fully functional)
2. **Use existing tools directly** for GTD:
   - `npm run daily` for daily notes
   - Manual dashboard generation if needed
3. **Don't integrate broken GTD commands** into `work` CLI
4. **Mark gtd commands as "experimental"** in work CLI

**Future** (if GTD rebuild needed):

1. Rebuild simple GTD scripts following presentations pattern
2. Integrate cleanly into `work` CLI
3. Remove deprecated npm scripts
4. Update documentation

---

**Bottom Line**: The presentations system works perfectly. The GTD integration commands in `work` CLI may fail because underlying scripts are archived. This is OK - presentations are standalone and functional.
