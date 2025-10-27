# Simplified GTD Workflow

**Last Updated**: 2025-10-27
**Status**: Production-Ready

---

## Overview

A radically simplified GTD system that shows actual tasks (not stats) and requires minimal tagging discipline.

**Key Commands:**
```bash
work refresh      # Regenerate GTD dashboard from Apple Reminders  
work dash         # Open GTD dashboard in Obsidian
work dash --refresh  # Refresh and open
```

---

## Tag Strategy: Minimal & Effective

### Only 3 Tag Types

**Status Tags** (describes what state the task is in):
- `#someday` - Not actionable now, maybe later
- `#waiting` - Blocked, waiting on someone else
- No tag = Actionable right now

**Project Tags** (optional grouping):
- `#project:bhutan` - Group related tasks
- `#project:presentations` - Professional projects
- Only add when you see natural clusters emerging

**Priority Markers** (use sparingly):
- `!!` - Urgent (1-2% of tasks)
- `!` - Important (5% of tasks)

### What NOT to Use

❌ Don't use these (they add friction):
- `#inbox` - Redundant (Inbox list exists)
- `#next` - Redundant (anything without #someday is "next")
- `#email`, `#call`, `#meeting` - Too granular
- `@context` tags - Rarely useful in practice

### Example Task Titles

```
✅ GOOD:
"Book dinner with Jun"
"Kojunsha Lunch Presentation 📅 2025/11/7"
"Read exinstitutional theory #someday"
"Email Tobias re: AI@70 #waiting"
"Finish board deck #project:presentations !!"

❌ BAD (over-tagged):
"Book dinner with Jun #next #call #personal"
"Email reply #email #email-reply #waiting #project:communications"
```

---

## Daily Workflow (2-5 minutes)

### Morning Scan

```bash
# 1. Refresh dashboard
work refresh

# 2. Open and review
work dash
```

**Look at:**
- **Today's Next Actions** (3-5 items) → Pick 1-2 to do
- **This Week** → Plan ahead
- **Inbox** (first 10) → Anything urgent? Add a date

**Don't worry about:**
- Unassigned tasks count
- Someday/Maybe items (collapsed)
- Perfect organization

### Throughout Day

- Add tasks to Inbox via Siri (no tagging needed)
- Mark completed tasks as done in Apple Reminders
- Don't stop to organize - that's for weekly review

### Evening (Optional)

- Quick dashboard scan
- Move 1-2 Inbox items to next week if relevant

---

## Weekly Review (Sunday, 15 minutes)

### Process Inbox (10 min)

Open dashboard, look at Inbox section:

**For each task (first 20-30):**
1. **Add date** if time-sensitive → Moves to "This Week" automatically
2. **Add #someday** if not ready → Hides from active view
3. **Delete** if no longer relevant
4. **Add #project:name** if you notice it's part of a cluster (optional)

**Goal**: Get 10-20 items out of Inbox, don't try to process everything

### Review Next Actions (3 min)

- Scan "Today's Next Actions"
- Scan "This Week"  
- Push out dates on anything deferred
- Delete anything no longer relevant

### Check Waiting For (2 min)

- Review `#waiting` tasks
- Follow up or remove tag if unblocked
- Add notes on what you're waiting for

**Done!** Don't force perfection, just progress.

---

## Dashboard Structure

The new dashboard shows ACTUAL TASKS at the top:

```markdown
## 🎯 Today's Next Actions (3-5 items)
→ Most important items: due today, this week, or high priority

## 📋 This Week (all tasks due next 7 days)
→ Your weekly plan

## 📥 Inbox (shows first 10 of 70)
→ Needs processing during weekly review

## ⏸️ Waiting For
→ Blocked on others

## 💭 Someday/Maybe (collapsed)
→ Future ideas, hidden by default

## 📊 Stats
→ Summary at bottom (not at top)
```

### What's Different from Before

**Old Dashboard:**
- Showed counts: "108 tasks"
- Projects first (but no projects!)
- Stats-focused
- Couldn't see what to do

**New Dashboard:**
- Shows actual tasks: "Book dinner with Jun"
- Actions first (Today → Week → Inbox)
- Task-focused
- Clear what to do next

---

## Apple Reminders Best Practices

### Natural Organization

Your current setup is already good:
- **Inbox** - Default capture location
- **Person lists** (Daum, Mika, Mizuka) - Agenda items for people
- **Reading** - Papers to read (could integrate with papers system later)

### When to Use Lists

**Inbox**: Everything by default (Siri goes here)

**Person lists**: Tasks for/with specific people
```
"Discuss budget with Daum" → Joi/Daum To Do list
"Follow up with Mika on project" → Joi/Mika To Do list
```

**Specialized lists** (like "Reading"): Only if pattern emerges naturally

### How to Capture

**Via Siri** (zero friction):
```
"Remind me to book dinner with Jun"
→ Goes to Inbox, appears in dashboard

"Remind me to email Tobias on November 15"
→ Gets date, appears in "This Week"

"Someday read that paper Kevin sent"
→ Add #someday later during weekly review
```

**In Reminders App** (for more control):
- Add task
- Optionally set date
- Optionally add tags
- Dashboard picks it up automatically

---

## Integration with Presentations

Presentations have their own tracking system. Optionally link:

```bash
# 1. Add presentation
work pres add "URL" --title "Q4 Board" --deadline 2025-11-15

# 2. (Optional) Create reminder for it
Via Siri: "Work on Q4 board deck #presentation !!"

# Both appear:
# - Presentations dashboard: Full metadata
# - GTD dashboard: The reminder task
```

Use `#presentation` tag to filter presentation-related tasks in Apple Reminders.

---

## Commands Reference

```bash
# GTD Dashboard
work refresh           # Regenerate from Apple Reminders cache
work dash              # Open GTD dashboard
work dash --refresh    # Refresh and open

# Presentations  
work dash --pres       # Open presentations dashboard
work pres list         # See all presentations

# Daily
work daily             # Generate and open daily note
```

---

## Troubleshooting

### Dashboard shows 0 tasks

Check if reminders cache exists:
```bash
ls -la /Users/joi/switchboard/reminders/reminders_cache.json
```

If missing, the pull script may not be working. For now, dashboard works with whatever cache exists.

### Tasks not appearing

Dashboard only shows:
- Non-completed tasks
- Tasks without #someday tag (unless in Someday section)
- Tasks without #waiting tag (unless in Waiting section)

Check if task is tagged correctly in Apple Reminders.

### Want to see all tasks

The dashboard limits display to prevent overwhelm:
- Inbox: First 10 shown
- This Week: First 10 shown  
- Someday: Collapsed (click to expand)

To see everything, open Apple Reminders app directly.

---

## Success Metrics

### You'll know this is working when:

**Week 1:**
- [ ] Dashboard shows actual tasks
- [ ] You check it 3+ times
- [ ] You can identify next action in <10 seconds

**Month 1:**
- [ ] Weekly review becomes habit
- [ ] Inbox processes down periodically
- [ ] Dashboard is trusted source of "what's next"

**Month 3:**
- [ ] Natural tagging patterns emerge
- [ ] System feels helpful, not burdensome
- [ ] Weekly review takes <15 minutes

### Warning Signs (Evaluate if these occur)

- Dashboard not opened in 2+ weeks
- Weekly review skipped for 3+ weeks in a row
- Adding tags still feels like work
- Simpler alternative emerges (just use Calendar)

**If this happens**: Simplify further or abandon. The system should reduce friction, not add it.

---

## Philosophy

This workflow follows ruthless simplicity:

- **Show content, not stats** - See tasks, not counts
- **Dates drive priority** - Due today/week is all you need
- **Tags are optional** - Except #someday and #waiting
- **Weekly review only** - No daily processing required
- **Accept messy data** - 107 unassigned tasks is OK
- **Trust emergence** - Let patterns emerge naturally

**The dashboard works for you, not the other way around.**

---

**Next**: Use for 1 week, see if it's helpful. Adjust as needed.
