# GTD Quick Reference

## Tag Reference

### GTD State Tags

| Tag | Purpose | Review Frequency | Example |
|-----|---------|-----------------|---------|
| `#inbox` | Unclarified items | Daily | `"Research CRM #inbox"` |
| `#next` | Next actions | Multiple daily | `"Call dentist #next"` |
| `#waiting` | Delegated/blocked | Weekly | `"Contract from vendor #waiting"` |
| `#someday` | Future possibilities | Monthly | `"Learn Spanish #someday"` |

### Project Tags

| Format | Purpose | Example |
|--------|---------|---------|
| `#project:name` | Group related tasks | `#project:quarterly-report` |
| `#project:client:phase` | Hierarchical projects | `#project:acme:onboarding` |

### Communication Tags

| Tag | Purpose | View Location | Example |
|-----|---------|--------------|---------|
| `#email` | General email task | email-tasks.md | `"Email team update #email"` |
| `#email-reply` | Needs response | email-tasks.md | `"Reply to John #email-reply"` |
| `#email-waiting` | Sent, awaiting reply | email-tasks.md | `"Sent proposal #email-waiting"` |
| `#call` | Phone calls | next-actions.md | `"Call doctor #call"` |
| `#meeting` | Meeting-related | dashboard.md | `"Prep slides #meeting"` |

### Priority Markers

| Marker | Meaning | Dashboard Section | Use For |
|--------|---------|------------------|---------|
| `!!` | Urgent | Focus → Urgent | Today/deadline |
| `!` | High | Focus → High Priority | This week |
| (none) | Normal | By category | When ready |

## Natural Language Dates

### Relative Dates

| Phrase | Resolves To | Example |
|--------|-------------|---------|
| `today` | Current date | `"Finish report today"` |
| `tomorrow` | Next day | `"Call client tomorrow"` |
| `in N days` | N days from now | `"Follow up in 3 days"` |
| `in N weeks` | N weeks from now | `"Review in 2 weeks"` |

### Day Names

| Phrase | Resolves To | Example |
|--------|-------------|---------|
| `next Monday` | Coming Monday | `"Meeting next Monday"` |
| `next Friday` | Coming Friday | `"Report due next Friday"` |

## Command Reference

### Daily Commands

```bash
# Morning - Generate views and start day
npm run gtd:morning

# Evening - Sync completions
npm run gtd:sync

# Anytime - Pull fresh data
npm run reminders:pull
```

### Weekly Commands

```bash
# Rebuild people index
npm run people:index

# Full system refresh
npm run reminders:pull && npm run gtd:morning
```

### Advanced Commands

```bash
# Generate daily note
cd /Users/joi/obs-dailynotes && ./dailynotejs.sh

# Two-phase Obsidian → Reminders
npm run reminders:export-outbox  # Stage
npm run reminders:apply-outbox   # Apply

# Debug mode
DEBUG=* npm run gtd:sync
```

## Configuration (.env)

### Path Configuration

```bash
# Vault location
DAILY_NOTE_PATH=/Users/joi/switchboard/dailynote
VAULT_ROOT=/Users/joi/switchboard

# People index
PEOPLE_INDEX_PATH=people.index.json
```

### Sync Behavior

```bash
# Stability mode (default - safe)
SYNC_MINIMAL_SOURCES=true     # Only scan today's note
SYNC_CREATE_NEW=false         # Don't create from markdown
SYNC_EDIT_EXISTING=false      # Don't edit from markdown

# Full sync mode (optional - powerful)
SYNC_MINIMAL_SOURCES=false    # Scan all markdown
SYNC_CREATE_NEW=true          # Create from markdown
SYNC_EDIT_EXISTING=true       # Edit from markdown
```

### Feature Flags

```bash
# Agenda injection
ENABLE_AGENDAS=false          # Don't auto-inject (default)
ENABLE_AGENDAS=true           # Auto-inject into meetings

# Default capture list
GTD_DEFAULT_LIST=Reminders    # Where new tasks go
```

## File Locations

### System Files

```
/Users/joi/obs-dailynotes/
├── .env                      # Configuration
├── package.json             # Commands
├── tools/
│   ├── processGTD.js       # Main processor
│   └── gtd_morning.sh      # Morning script
└── lib/
    ├── pipelines/          # Workflows
    └── services/           # Core logic
```

### Vault Files

```
/Users/joi/switchboard/
├── GTD/                     # Generated views
│   ├── dashboard.md        # Main overview
│   ├── next-actions.md     # All next actions
│   ├── email-tasks.md      # Email tasks
│   ├── waiting-for.md      # Delegated items
│   └── scheduled.md        # Time-based view
├── dailynote/
│   └── YYYY-MM-DD.md       # Daily notes
├── reminders/
│   ├── reminders_cache.json # Task cache
│   └── reminders_inbox.md   # Inbox view
└── people.index.json        # People directory
```

## Markdown Format

### Task Format

```markdown
- [ ] Task title with [[Person Link]] ! <!--reminders-id:xxx-->
  ^     ^                              ^  ^
  |     |                              |  Hidden ID (don't edit)
  |     |                              Priority marker
  |     Linked person name
  Checkbox ([ ] or [x])
```

### Dashboard Sections

```markdown
# GTD Dashboard
## 🎯 Focus (Urgent & High Priority)
### Urgent Tasks (Do Today)     # !! priority
### High Priority (This Week)   # ! priority

## 📥 Inbox (Needs Processing)  # #inbox tag
## ⏭️ Next Actions              # #next tag
## ⏸️ Waiting For               # #waiting tag
## 💭 Someday/Maybe             # #someday tag
## 📧 Email Tasks               # #email tags
```

## People Page Format

```yaml
---
name: Sarah Chen              # Required
tags: [people]               # Required
aliases:                     # Optional
  - Sarah
  - S. Chen
email: sarah@example.com     # Optional
reminders:                   # For agenda
  listName: Sarah Chen       # Apple Reminders list
  sharedListName: Shared    # If shared list
---
```

## Smart Lists (Apple Reminders)

### Suggested Smart Lists

| Name | Criteria | Purpose |
|------|----------|---------|
| Email - Action | Has #email, not #waiting | Active emails |
| Waiting For | Has #waiting | All delegated |
| Today Focus | Due today OR !! | Daily focus |
| High Priority | Has ! | Week focus |
| Quick Wins | Has #next, no due date | When free |

### Creating Smart Lists

1. Open Reminders.app
2. File → New Smart List
3. Add criteria (tags, due dates, etc.)
4. Name appropriately

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Empty dashboard | Add GTD tags to tasks |
| Tasks not syncing | Check for `<!--reminders-id-->` |
| People not linking | Run `npm run people:index` |
| Old data showing | Run `npm run reminders:pull` |
| Sync conflicts | Check `.env` settings |
| Missing views | Run `npm run gtd:morning` |

## Keyboard Shortcuts

### In Obsidian

| Action | Shortcut |
|--------|----------|
| Check/uncheck task | Click or `Cmd+Enter` |
| Open dashboard | `Cmd+O` → "dashboard" |
| Search tasks | `Cmd+Shift+F` |
| Today's note | `Cmd+O` → date |

### In Terminal

| Action | Command |
|--------|---------|
| Previous command | `↑` arrow |
| Clear screen | `Cmd+K` |
| Stop process | `Ctrl+C` |

## Regular Maintenance

### Daily
- Morning: `npm run gtd:morning`
- Evening: `npm run gtd:sync`

### Weekly
- Review all GTD views
- Process someday/maybe
- Update project tags

### Monthly
- Archive completed projects
- Clean up old tasks
- Review tag usage

### Quarterly
- Optimize workflow
- Update .env settings
- Review this documentation

---

*For detailed explanations, see other guides in this documentation set*
