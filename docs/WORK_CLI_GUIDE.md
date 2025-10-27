# Work CLI - Complete Guide

The `work` command is your unified interface for managing presentations and daily notes.

**Note**: GTD sync commands have been removed as they referenced archived scripts. The presentations system is fully functional and standalone.

## Installation

Already installed! The command is globally available.

Verify:
```bash
work --version
```

---

## All Commands at a Glance

```bash
# Interactive mode
work                    # Main menu - navigate everything

# Presentations
work pres               # Presentations menu
work pres add <url>     # Add presentation
work pres start <id>    # Start working
work pres complete <id> # Mark done
work pres list          # View all
work pres open <id>     # Open in browser

# Reading Queue
work read add <url>     # Add article/link to reading queue
work read start <id>    # Start reading (opens in browser)
work read finish <id>   # Mark as read
work read list          # View all

# GTD Workflow
work refresh            # Update from Apple Reminders + regenerate dashboard
work daily              # Generate today's daily note

# Dashboards
work dash               # Open unified GTD dashboard
work dash --pres        # Open presentations dashboard
work dash --read        # Open reading queue
work dash --refresh     # Refresh before opening
```

---

## Presentations Management

### Add Presentation

**Interactive:**
```bash
work pres
# Choose "Add new presentation"
# Follow prompts
```

**Direct:**
```bash
work pres add "https://docs.google.com/presentation/d/ABC123/edit" \
  --title "Q4 Board Presentation" \
  --deadline 2025-11-15 \
  --priority high \
  --notion "https://www.notion.so/brief" \
  --tags board,quarterly \
  --estimate 8
```

### Workflow

```bash
# 1. Add presentation (creates in "planned" status)
work pres add "URL" --title "Q4 Board" --deadline 2025-11-15

# 2. Start working (planned → in-progress)
work pres start pres-20251027-001

# 3. Complete (in-progress → completed)
work pres complete pres-20251027-001 --hours 10

# 4. Archive (when no longer needed)
work pres archive pres-20251027-001
```

### View & Open

```bash
# List all presentations
work pres list

# Filter by status
work pres list --status in-progress

# Filter by priority
work pres list --priority high

# Open slides in browser
work pres open pres-20251027-001

# Open Notion brief
work pres open pres-20251027-001 --notion
```

---

## Daily Note Generation

```bash
work daily
```

Generates today's daily note with:
- Calendar events from Google Calendar
- Meeting attendees
- Agenda items (if enabled)

---

## Dashboards

### View GTD Dashboard

```bash
work dash
```

Opens: `switchboard/GTD Dashboard.md`

Shows:
- Active projects from Apple Reminders
- Tasks by context
- Tasks by status (today/week/future)
- Quick action links

### View Presentations Dashboard

```bash
work dash --pres
```

Opens: `GTD/presentations.md`

Shows:
- Urgent presentations (due soon)
- In-progress presentations
- Planned presentations
- Recently completed
- Command reference

---

## Integration: Presentations + Apple Reminders

### Recommended Workflow

**The presentations system works standalone**, but you can optionally link to Apple Reminders:

```bash
# 1. Add to presentations system
work pres add "URL" --title "Q4 Board" --deadline 2025-11-15

# 2. (Optional) Create reminder via Siri for notifications
"Work on Q4 board deck #presentation !!"

# 3. Work on it
work pres start pres-20251027-001

# 4. Complete
work pres complete pres-20251027-001 --hours 10
```

### Optional: Tag Convention for Apple Reminders

If you create reminders for presentations, use `#presentation` tag:

```
"Finish board slides #presentation !!"
"Review deck with team #presentation"
```

This helps you find presentation-related tasks in Apple Reminders.

---

## Common Workflows

### Scenario 1: New Presentation

```bash
# Get Google Slides URL (create or find existing)
# Copy URL

# Add to system
work pres add "PASTE_URL" \
  --title "Investor Update Q4" \
  --deadline 2025-12-01 \
  --priority high \
  --notion "https://www.notion.so/investor-brief"

# Create reminder for yourself
# Via Siri: "Work on investor deck #presentation !!"

# Start working
work pres start pres-20251027-002
```

### Scenario 2: Daily Routine

```bash
# Every morning
work morning

# Check what's urgent
work dash --pres

# Or interactive
work
# Navigate to "View Presentations Dashboard"

# See a presentation due soon, open it
work pres open pres-20251027-001
```

### Scenario 3: Completing Work

```bash
# Finished presentation
work pres complete pres-20251027-001 \
  --hours 12 \
  --notes "Delivered at board meeting, received positive feedback"

# Also complete the reminder in Apple Reminders app

# After 30 days, archive
work pres archive pres-20251027-001
```

---

## Interactive vs Direct Commands

### When to Use Interactive Mode

Use `work` or `work pres` when:
- First time using the system
- Exploring what's available
- Don't remember exact syntax
- Want guided prompts

### When to Use Direct Commands

Use `work pres add ...` when:
- Know exactly what you want
- Want to be fast
- Scripting or automating
- Copy/pasting from dashboard

### Mix and Match

```bash
# Use interactive to explore
work pres
# See "List all presentations"
# Copy ID from output

# Then use direct command
work pres start pres-20251027-001
```

---

## Tips & Tricks

### Quick Access

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
alias wm='work morning'
alias wp='work pres'
alias wd='work dash'
alias wdp='work dash --pres'
```

Then:
```bash
wm              # Morning routine
wp              # Presentations menu
wd              # GTD dashboard
wdp             # Presentations dashboard
```

### Dashboard IDs

The dashboard shows presentation IDs in a format easy to copy:

```markdown
### [[Q4 Board Presentation]]
- **ID**: `pres-20251027-001`  ← Copy this
```

Just triple-click to select, copy, and paste into commands.

### Keyboard Maestro Integration

Create macros:
- `⌘⌥W` → Run `work` in terminal
- `⌘⌥M` → Run `work morning`
- `⌘⌥P` → Run `work pres`

### Claude Code Integration

You can ask Claude Code:

```
"Add a presentation for my board deck due November 15"
"Show me my presentations"
"Complete the Q4 board presentation"
```

Claude can execute the work commands for you.

---

## Troubleshooting

### Command not found: work

Re-link:
```bash
cd ~/obs-dailynotes
npm link
```

### Commands fail

Some GTD commands might fail if underlying scripts are missing. This is OK - the presentations features work independently.

Working commands:
- ✅ All `work pres` commands
- ✅ `work dash --pres`
- ✅ Dashboard generation

GTD commands depend on your existing setup:
- `work morning` - runs if gtd_morning.sh exists
- `work sync` - runs if gtd:sync npm script works
- `work pull` - runs if reminders pull script exists
- `work daily` - runs if index.js exists

### Can't find presentations.json

The file is created automatically on first use at:
`/Users/joi/obs-dailynotes/data/presentations.json`

---

## What's Next

### Phase 2: Papers Tracking

Coming soon:
```bash
work paper add ~/Downloads/paper.pdf --title "AI Research"
work paper start paper-20251027-001
work paper finish paper-20251027-001
```

### Phase 3: Enhanced Integration

- Link presentations to reminders
- Unified dashboard view
- Statistics and insights

---

## Quick Reference Card

```bash
# PRESENTATIONS
work pres                          # Interactive menu
work pres add <url> [opts]         # Add new
work pres start <id>               # Start working
work pres complete <id> [opts]     # Mark done
work pres list [filters]           # View all
work pres open <id> [--notion]     # Open in browser

# GTD WORKFLOW
work morning                       # Morning routine
work sync                          # Sync with Reminders
work pull                          # Pull from Reminders
work daily                         # Generate daily note

# DASHBOARDS
work dash                          # GTD dashboard
work dash --pres                   # Presentations dashboard

# HELP
work --help                        # All commands
work pres --help                   # Presentations help
```

Print this and keep it handy! 📋

---

## Command Status

### Production-Ready ✅

**These commands are stable and fully functional:**

```bash
# Presentations (complete system)
work pres <command>     # All presentations commands
work dash --pres        # Open presentations dashboard
npm run pres:refresh    # Generate presentations dashboard

# Daily workflow
work daily              # Generate daily note (uses index.js)
work dash               # Open GTD dashboard
```

### Removed Features

**GTD sync commands removed** (referenced archived scripts):
- ❌ `work morning` - removed
- ❌ `work sync` - removed
- ❌ `work pull` - removed

These have been removed from the CLI to prevent errors. If you need GTD automation, the underlying npm scripts may still work if you call them directly, or they can be rebuilt using the presentations pattern.

See `docs/DEPRECATED_GTD_COMMANDS.md` for details on what was archived and why.

---

## Summary

**Use with confidence:**
- Presentations tracking (complete workflow)
- Daily note generation
- Dashboard viewing

**The presentations system is production-ready and works independently!**
