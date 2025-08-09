# GTD System Design for Obsidian + Apple Reminders

## Overview
A comprehensive Getting Things Done (GTD) implementation leveraging Apple Reminders, Obsidian, and our existing sync infrastructure.

## Smart Capture Methods

### 1. iPhone Quick Capture
**Using Siri + Smart Lists:**
```
"Hey Siri, remind me to email John about the proposal tomorrow at 9am"
→ Creates in Reminders with:
   - Title: "email John about the proposal"
   - Due: Tomorrow 9am
   - Auto-tagged: #email
```

**Email Capture Pattern:**
```
"Reply to Sarah #email !!"     → High priority email
"Email Bob re: contract #email @computer" → Context-specific
"Waiting for invoice from vendor #waiting #email" → Waiting for
```

### 2. Meeting Notes Capture
In daily notes during meetings:
```markdown
[[John Smith]] mentioned:
- [ ] Follow up on budget proposal #email @computer !!
- [ ] Send contract draft by Friday #email
- [ ] Waiting for board approval #waiting
```

### 3. Voice Memo Processing
Create "Voice Inbox" Reminders list:
- Capture via Siri/Voice Memos
- Process into appropriate lists with tags

## Tag System

### Core GTD Tags
- `#inbox` - Unprocessed items
- `#next` - Next actions
- `#waiting` - Waiting for someone
- `#someday` - Someday/maybe
- `#project:name` - Project-specific

### Context Tags
- `@computer` - Requires computer
- `@home` - Home tasks
- `@office` - Office only
- `@calls` - Phone calls
- `@errands` - Out and about
- `@anywhere` - Can do anywhere
- `@online` - Requires internet

### Communication Tags
- `#email` - Email tasks
- `#email-reply` - Needs reply
- `#email-waiting` - Sent, awaiting response
- `#call` - Phone calls needed
- `#meeting` - Meeting-related

### Priority System
- `!!` - Urgent (do today)
- `!` - High priority (do this week)
- No marker - Normal priority
- `#someday` - Low priority/future

## Smart Lists in Apple Reminders

### Create These Smart Lists:

1. **"Email - Action Required"**
   - Tags contain: #email
   - Tags don't contain: #waiting
   - Not completed

2. **"Waiting For"**
   - Tags contain: #waiting
   - Not completed
   - Sorted by: Creation date

3. **"Today Focus"**
   - Due date: Today
   - OR Priority: High
   - Not completed

4. **"Quick Wins"**
   - Tags contain: @anywhere
   - OR estimated time: < 15 min
   - Not completed

5. **"Weekly Review"**
   - Tags contain: #review
   - OR Due date: This week
   - Group by: List

## GTD Review Interface

### Weekly Review Template
Location: `/switchboard/templates/weekly-review.md`

```markdown
---
tags: [gtd, review, weekly]
date: {{date}}
week: {{date:YYYY-[W]ww}}
---

# Weekly Review - {{date:YYYY-MM-DD}}

## 📊 Metrics Dashboard
```dataviewjs
// This week's completion rate
const tasks = dv.pages('"reminders"').file.tasks;
const completed = tasks.where(t => t.completed).length;
const total = tasks.length;
dv.paragraph(`**Completion Rate:** ${completed}/${total} (${Math.round(completed/total*100)}%)`);
```

## 🧹 Get Clear

### Process Inboxes
- [ ] Apple Reminders Inbox → 0
- [ ] Email Inbox → 0
- [ ] Desktop/Downloads → Clean
- [ ] Voice Memos → Processed

### Sync Status
```button
name Sync All
type command
action Run: Shell command: npm run reminders:sync && npm run reminders:pull && npm run gtd:process
```

## 📋 Review Lists

### Email Tasks
![[GTD/email-tasks.md]]

### Waiting For
![[GTD/waiting-for.md]]

### Next Actions by Context
![[GTD/next-actions.md]]

## 🎯 Plan Ahead

### This Week's Priorities
1. 
2. 
3. 

### Scheduled for This Week
![[GTD/scheduled.md]]
```

## Processing Scripts

### GTD Processor Script
Create: `/tools/processGTD.js`

Key features:
- Parse tags and contexts from reminder titles
- Group by GTD categories
- Generate context-specific lists
- Create email action lists
- Build waiting-for tracking

### Email Task Processor
Special handling for email tasks:
- Extract sender name if in title
- Group by action type (reply/write/waiting)
- Link to person pages when possible
- Track response status

## Daily Workflow

### Morning Routine (5 min)
1. Run sync: `npm run gtd:morning`
2. Review: `[[GTD/dashboard]]`
3. Check: Today Focus smart list
4. Pick: 3 most important tasks

### Evening Processing (10 min)
1. Process captures from phone
2. Clear email inbox to zero
3. Update waiting-for items
4. Sync back to Reminders

### Weekly Review (30 min)
1. Open: `[[Weekly Review Template]]`
2. Process all inboxes
3. Review all projects
4. Update waiting-for list
5. Plan next week's priorities

## Integration Points

### With Daily Notes
- Auto-inject today's priorities at top
- Extract tasks from meeting notes
- Link email tasks to person pages

### With Calendar
- Show due items in daily note
- Create time blocks for important tasks
- Review upcoming deadlines

### With Person Pages
- Link email tasks to people
- Track waiting-for by person
- Show agenda items in meetings

## Benefits of This System

1. **Ubiquitous Capture**: Use Siri/iPhone anywhere
2. **Context-Aware**: Work on right tasks at right time
3. **Email Management**: Never lose track of email commitments
4. **Waiting-For Tracking**: Know what you're blocked on
5. **Weekly Review**: Stay on top of everything
6. **Two-Way Sync**: Work in Obsidian or Reminders

## Implementation Steps

1. Set up Apple Reminders lists and smart lists
2. Create GTD processor script
3. Add weekly review template
4. Configure morning/evening routines
5. Train Siri for common captures
6. Set up keyboard shortcuts

This system provides a complete GTD implementation that works seamlessly between iPhone (for capture) and Obsidian (for processing and review).