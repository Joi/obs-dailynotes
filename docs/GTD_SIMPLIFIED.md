# Simplified GTD System

**The Breakthrough:** Reminders = source of truth, Obsidian = read-only dashboard

## The Problem

The previous GTD system was broken due to complexity:
- Bi-directional sync (Reminders ↔ Obsidian)
- Multiple sync scripts with overlapping functionality
- Complex tag processing in both directions
- Conflict resolution
- State tracking

**Result:** System broke, data drifted, too complex to maintain

---

## The Solution: Ruthless Simplification

### Core Principle

**Reminders App = Database (write here)**
**Obsidian = Dashboard (read-only view)**

**One-way flow:**
```
Apple Reminders (edit tasks)
  ↓ read-only
Obsidian (view tasks)
```

**No sync back.** Ever.

---

## How It Works

### Morning Workflow

```bash
# Generate today's GTD section in daily note
make gtd-today
```

**What happens:**
1. Reads all reminders from Apple Reminders app
2. Filters for today's tasks (due today OR no due date)
3. Groups by context (@work, @home, @email, etc.)
4. Writes to today's daily note as GTD section
5. Read-only - you view it, don't edit it

### Weekly Review

```bash
# Generate GTD project dashboard
make gtd-dashboard
```

**What happens:**
1. Reads all active reminders
2. Groups by project (#project/name tags)
3. Shows counts by status (today, this week, future, someday)
4. Writes to `GTD Dashboard.md`
5. Read-only - review only, edit in Reminders

### Both Together

```bash
# Refresh everything
make gtd-refresh
```

---

## Your New GTD Workflow

### 1. Task Management (in Reminders App)

**Add tasks:**
- Use Reminders app (Mac, iPhone, Siri)
- Add tags: `#project/website`, `@work`, `#energy/high`
- Set due dates
- Set priorities

**Edit tasks:**
- Open Reminders app
- Quick, native, fast
- Siri integration
- Widget support

### 2. Daily Review (in Obsidian)

**Morning:**
```bash
make gtd-today
```

**Open daily note in Obsidian:**
- See today's tasks grouped by context
- See project tags
- Review and plan your day
- **Don't edit** - view only

**Need to change a task?**
- Open Reminders app
- Make the change
- Run `make gtd-today` again (instant refresh)

### 3. Weekly Review (in Obsidian)

**Sunday/Monday:**
```bash
make gtd-dashboard
```

**Open GTD Dashboard.md:**
- See all active projects
- Task counts by project
- Context distribution
- Status breakdown (today, week, future, someday)
- **Read-only** - just for review

**Need to reorganize?**
- Do it in Reminders app
- Regenerate dashboard

---

## What Was Removed (90% of Complexity!)

### Deleted Entirely

❌ **Bi-directional sync** - No more Obsidian → Reminders sync
❌ **Complex tag processing** - Tags stay in Reminders
❌ **Conflict resolution** - No conflicts when read-only
❌ **State tracking** - No state to track
❌ **Multiple sync variants** - One simple read
❌ **Edit detection** - Nothing to detect
❌ **Markdown parsing for tasks** - Don't parse, just display

### Archived (for reference)

Moved to `_archived/old-gtd-complex/`:
- `lib/pipelines/gtdMorning.js`
- `lib/pipelines/gtdSync.js`
- `tools/processGTD.js`
- `tools/syncReminders*.js`
- `tools/pullReminders*.js`

---

## File Structure

### New (Simple!)

```
lib/gtd-simple/
  dailyNote.js      # 71 lines - Today's tasks
  dashboard.js      # 72 lines - Project overview

Total: 143 lines
```

### Old (Complex)

```
lib/pipelines/
  gtdMorning.js
  gtdSync.js
lib/services/
  gtdService.js
tools/
  processGTD.js
  syncReminders*.js    # Multiple variants
  pullReminders*.js    # Multiple variants
  [many more GTD-related scripts]

Total: ~2000+ lines
```

**Complexity reduction: ~93%**

---

## Daily Note Format

```markdown
## Tasks for Today

Generated: 2025-10-24 09:00

### @work
- [ ] Review PR #123 #project/chanoyu-db
- [ ] Design IIIF manifests #project/chanoyu-db

### @home
- [ ] Buy groceries #area/personal
- [ ] Call plumber #energy/low

### @email
- [ ] Reply to conference invitation #someday

### @anywhere
- [ ] Read article on AI agents #energy/medium
```

---

## Dashboard Format

```markdown
# GTD Dashboard

Updated: 2025-10-24 16:40

## Active Projects

### #project/chanoyu-db (8 tasks)
- 2 due today
- 3 due this week
- 3 future

### #project/obs-dailynotes (5 tasks)
- 1 due today
- 2 this week
- 2 future

## By Context

- **@work**: 15 tasks
- **@home**: 8 tasks
- **@email**: 12 tasks
- **@anywhere**: 7 tasks

## By Status

- **Due Today**: 5 tasks
- **This Week**: 12 tasks
- **Future**: 23 tasks
- **Someday/Maybe**: 15 tasks

## By Energy

- **High**: 8 tasks
- **Medium**: 25 tasks
- **Low**: 12 tasks
```

---

## Benefits of the New System

### Simplicity

✅ **2 scripts** instead of 17+
✅ **140 lines** instead of 2000+
✅ **1 command** instead of complex pipelines
✅ **No state** to corrupt or track
✅ **No sync bugs** - read-only can't break

### Reliability

✅ **Always accurate** - regenerate anytime
✅ **No conflicts** - Reminders owns the data
✅ **No drift** - single source of truth
✅ **Idempotent** - safe to run multiple times
✅ **Fast** - generates in <1 second

### Usability

✅ **Native editing** - Use Reminders app (fast, Siri, widgets)
✅ **Beautiful review** - Obsidian dashboard for context
✅ **On-demand refresh** - `make gtd-refresh`
✅ **Daily highlight** - See today's tasks
✅ **Project overview** - See all active work

---

## Migration Guide

### From Old Complex System

**If you were using the old GTD sync:**

1. **Stop using old commands**
   - Don't run `pnpm run gtd:sync` anymore
   - Don't run `pnpm run gtd:morning`
   - Don't edit tasks in Obsidian markdown

2. **Start using new commands**
   ```bash
   make gtd-today      # Morning routine
   make gtd-dashboard  # Weekly review
   ```

3. **Adjust workflow**
   - Edit tasks → Use Reminders app
   - Review tasks → Use Obsidian
   - Want updates → Run `make gtd-today` again

4. **Existing tasks**
   - All your tasks are already in Reminders
   - New system just displays them differently
   - Nothing lost, just simpler

---

## Troubleshooting

### "No tasks showing up"

Check Reminders app - do tasks exist there?

If yes:
```bash
make gtd-today  # Regenerate
```

### "Want to add task quickly"

**Best:** Use Siri or Reminders widget
```
"Hey Siri, remind me to review PR at work tomorrow"
```

**Alternative:** Open Reminders app (native, fast)

**Not recommended:** Editing markdown (won't sync back)

### "Dashboard out of date"

```bash
make gtd-dashboard  # Regenerate (instant)
```

### "Want real-time updates"

Consider scheduling:
```bash
# Regenerate every hour (optional)
crontab -e
0 * * * * cd ~/obs-dailynotes && make gtd-today
```

Or just regenerate when you want fresh data.

---

## Philosophy

### Embrace Each Tool's Strength

**Reminders App is excellent for:**
- ✅ Quick task entry (Siri, widgets, quick add)
- ✅ Native notifications
- ✅ Editing and reorganizing
- ✅ Location/time-based reminders
- ✅ Sharing tasks

**Obsidian is excellent for:**
- ✅ Overview and context
- ✅ Linking tasks to notes
- ✅ Project planning
- ✅ Review and reflection
- ✅ Visualization

**Don't fight their natural strengths.**

### Single Source of Truth

> "Bi-directional sync violates single source of truth and creates exponential complexity."

**Reminders owns the data.**
**Obsidian displays the data.**

This is the natural order. Fighting it creates all the problems.

---

## Comparison

### Old System Complexity

```
17+ scripts
2000+ lines of code
Bi-directional sync
Conflict resolution
State management
Tag processing both ways
Multiple pipelines
Sync timing issues
Data drift
Hard to debug
Broke frequently
```

### New System Simplicity

```
2 scripts
140 lines of code
One-way read
No conflicts
No state
Tags stay in Reminders
One pipeline
Instant regeneration
Always accurate
Easy to understand
Reliable
```

---

## Future Enhancements (Maybe)

**If needed, could add:**

1. **Quick capture command**
   ```bash
   make gtd-add TASK="Review PR" PROJECT="chanoyu-db" CONTEXT="work"
   # Adds directly to Reminders via API
   ```

2. **Filtered views**
   ```bash
   make gtd-context CONTEXT="work"
   # Show only @work tasks
   ```

3. **Project-specific dashboard**
   ```bash
   make gtd-project PROJECT="chanoyu-db"
   # Show only one project
   ```

**But start simple. Use the 2-script system first.**

---

## Success Metrics

After 1 week of using the simplified system:

- ✅ No sync conflicts
- ✅ No data drift
- ✅ Tasks always accurate
- ✅ Fast daily review (<2 minutes)
- ✅ Easy to maintain
- ✅ Actually use it (vs avoiding broken complex system)

**The test:** If you're using it daily without frustration, it works.

---

## Credits

**Strategic Analysis:** zen-architect + insight-synthesizer
**Implementation:** modular-builder
**Philosophy:** Ruthless simplicity through single source of truth

**The insight:** "Bi-directional sync is the entire problem. Remove it, and 90% of complexity vanishes."
