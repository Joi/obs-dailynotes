# GTD Operations Guide

## Daily Workflows

### Morning Routine (5 minutes)

```bash
cd /Users/joi/obs-dailynotes
npm run gtd:morning
```

**What happens**:
1. Pulls fresh tasks from Apple Reminders
2. Processes GTD tags and priorities
3. Generates all GTD views
4. Updates today's daily note

**Then in Obsidian**:
1. Open `GTD/dashboard.md`
2. Review **Focus** section (Urgent & High Priority)
3. Choose 3 most important tasks for today
4. Check calendar for meetings → review agendas

### Throughout the Day

**Capture Tasks**:
- **iPhone/Mac**: Use Reminders app directly
- **Siri**: "Hey Siri, remind me to email Sarah about budget"
- **Obsidian**: Add to daily note (will sync later)

**Review Tasks**:
- Check `GTD/dashboard.md` between meetings
- Open `GTD/next-actions.md` when ready for new task
- Review `GTD/email-tasks.md` during email time

### Evening Sync (5-10 minutes)

```bash
cd /Users/joi/obs-dailynotes
npm run gtd:sync
```

**What happens**:
1. Scans markdown files for completed tasks
2. Marks them complete in Apple Reminders
3. Pulls fresh data from Reminders
4. Regenerates all views

**Then in Obsidian**:
1. Review what got done today
2. Process any inbox items
3. Update task tags/priorities for tomorrow

## Weekly Review

### Friday Afternoon (20-30 minutes)

```bash
# Start with fresh data
npm run gtd:morning
```

**In Obsidian, review each view**:

1. **Dashboard** (`GTD/dashboard.md`)
   - Clear inbox to zero
   - Review urgent/high priority items
   - Adjust priorities for next week

2. **Waiting For** (`GTD/waiting-for.md`)
   - Follow up on overdue items
   - Email/call as needed
   - Update or cancel stale items

3. **Scheduled** (`GTD/scheduled.md`)
   - Review upcoming week
   - Adjust due dates if needed
   - Identify scheduling conflicts

4. **Someday/Maybe**
   - Move items to #next if ready
   - Delete items no longer relevant
   - Add new ideas from the week

5. **Projects**
   - Review each active project
   - Ensure each has a next action
   - Complete or archive finished projects

## Common Scenarios

### Processing Email

```markdown
# In Apple Reminders, create tasks:
"Reply to John about proposal #email-reply"
"Email team about deadline change #email !!"
"Waiting for budget approval from CFO #email-waiting"
```

Then check `GTD/email-tasks.md` for organized view.

### Meeting Preparation

If meeting with someone who has a reminders list:

1. Their agenda auto-populates in daily note
2. Review and complete items during meeting
3. Run `npm run gtd:sync` after to mark complete

### Capturing Ideas

```markdown
# Quick capture anywhere:
"Research new CRM options #inbox"
"Learn Spanish #someday"
"Call dentist #next"
```

Process during evening review or weekly review.

### Project Management

```markdown
# Tag all related tasks:
"Draft Q1 report outline #project:quarterly-report #next"
"Review Q1 data #project:quarterly-report"
"Schedule review meeting #project:quarterly-report"
```

View all project tasks in `GTD/project-quarterly-report.md`.

## Task Lifecycle Examples

### Simple Task

```
1. Capture: "Call dentist #next"
2. Appears in: GTD/next-actions.md
3. Do it: Make the call
4. Complete: Check box in Obsidian
5. Sync: npm run gtd:sync
6. Done: Marked complete everywhere
```

### Delegated Task

```
1. Delegate: Ask Sarah to review proposal
2. Capture: "Sarah reviewing proposal #waiting"
3. Appears in: GTD/waiting-for.md
4. Follow up: Check during weekly review
5. Complete: When Sarah confirms done
```

### Urgent Email

```
1. Receive: Important client email
2. Capture: "Reply to ClientCo about contract #email !!"
3. Appears in: Top of dashboard (Urgent)
4. Action: Reply within hours
5. Complete: Check box after sending
```

## Command Reference

### Essential Commands

```bash
# Morning routine - start your day
npm run gtd:morning

# Evening sync - end your day
npm run gtd:sync

# Pull fresh reminders (anytime)
npm run reminders:pull

# Rebuild people index
npm run people:index
```

### Advanced Commands

```bash
# Generate today's daily note
cd /Users/joi/obs-dailynotes && ./dailynotejs.sh

# Two-phase task creation from Obsidian
npm run reminders:export-outbox  # Stage tasks
npm run reminders:apply-outbox   # Create in Reminders

# Full rebuild (if something seems off)
npm run reminders:pull && npm run gtd:morning
```

## Troubleshooting

### Tasks Not Appearing

1. Check tag syntax: `#next` not `#Next` or `# next`
2. Run `npm run reminders:pull` to refresh cache
3. Verify task is not completed in Reminders
4. Check correct list in Reminders app

### Sync Not Working

1. Ensure tasks have `<!--reminders-id:xxx-->` comment
2. Check `.env` file settings
3. Try `npm run gtd:sync` with verbose output
4. Verify reminders-cli is installed: `which reminders`

### People Not Linking

1. Run `npm run people:index` to rebuild index
2. Check person page has correct frontmatter:
   ```yaml
   ---
   name: Full Name
   tags: [people]
   reminders:
     listName: Full Name
   ---
   ```
3. Verify aliases don't conflict

### Dashboard Empty

1. Ensure tasks have GTD tags (#next, #waiting, etc.)
2. Untagged tasks default to inbox
3. Run `npm run gtd:morning` to regenerate
4. Check `reminders/reminders_cache.json` exists

## Best Practices

### Capture

- **Be specific**: "Email Sarah about Q1 budget" not "Email Sarah"
- **Add context**: Include tags during capture when possible
- **Set dates**: Use natural language: "tomorrow", "next Friday"
- **Don't overthink**: Capture first, process later

### Process

- **Inbox to zero**: Process all inbox items daily
- **Two-minute rule**: If under 2 minutes, do it now
- **One next action**: Each project needs one clear next step
- **Regular reviews**: Weekly review prevents system decay

### Organize

- **Limit priorities**: Max 3 urgent, 5 high priority
- **Project grouping**: Use consistent project tags
- **People-centric**: Link tasks to people when relevant
- **Clean up**: Archive completed projects monthly

### Review

- **Daily**: Morning focus, evening sync
- **Weekly**: Full system review
- **Monthly**: Someday/maybe and project cleanup
- **Quarterly**: System optimization and workflow adjustment

## Workflow Optimization

### For Heavy Email Users

```bash
# Create smart list in Reminders:
Name: "Email - Action Required"
Criteria: Tags contain #email, not #waiting

# Use dedicated email time blocks
# Process all email tasks at once
```

### For Meeting-Heavy Days

```bash
# Morning: Review all meeting agendas
npm run gtd:morning

# Between meetings: Quick dashboard check
# Focus only on urgent items

# Evening: Process meeting outcomes
npm run gtd:sync
```

### For Project Managers

```bash
# Use hierarchical project tags:
#project:client-a:phase-1
#project:client-a:phase-2

# Weekly: Review each project file
# Ensure every project has next actions
```

---

*For technical details, see [Implementation](implementation.md)*
