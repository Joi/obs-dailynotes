# Presentations Tracking - Quick Start Guide

The new `work` command helps you track Google Slides presentations through your workflow.

## Installation (One-Time Setup)

Already done! The `work` command is now globally available.

To verify:
```bash
work --version
```

## Quick Start

### Option 1: Interactive Mode (Easiest)

Just type `work` and follow the menus:

```bash
work          # Main menu
work pres     # Jump to presentations menu
```

Navigate with arrow keys, press Enter to select.

### Option 2: Direct Commands (Fast)

```bash
# Add a new presentation
work pres add "https://docs.google.com/presentation/d/YOUR_ID/edit" \
  --title "Q4 Board Presentation" \
  --deadline 2025-11-15 \
  --priority high \
  --notion "https://www.notion.so/your-brief" \
  --tags board,quarterly

# Start working on it
work pres start pres-20251027-001

# When done
work pres complete pres-20251027-001 --hours 8

# View all
work pres list

# Open in browser
work pres open pres-20251027-001           # Opens slides
work pres open pres-20251027-001 --notion  # Opens Notion brief
```

## Workflow States

```
planned → in-progress → completed → archived
```

- **planned**: Created but not started yet
- **in-progress**: Actively working on
- **completed**: Done (visible for reference)
- **archived**: Moved to archive (hidden)

## Common Tasks

### Add Your First Presentation

```bash
work pres add "PASTE_GOOGLE_SLIDES_URL" \
  --title "My Presentation Title" \
  --deadline 2025-12-01 \
  --priority high
```

### Check What's On Your Plate

```bash
work pres list
```

Shows:
- Urgent presentations (due soon)
- In-progress presentations
- Planned presentations
- Recently completed

### Start Working

```bash
# Copy ID from list command output
work pres start pres-20251027-001
```

### Mark Complete

```bash
work pres complete pres-20251027-001 \
  --hours 6 \
  --notes "Delivered at board meeting, well received"
```

### View Dashboard

```bash
# Generate latest dashboard
npm run pres:refresh

# Open in Obsidian
open GTD/presentations.md
```

## Integration with Morning Routine

The presentations dashboard will be generated during your morning GTD routine.

Future enhancement: `tools/gtd_morning.sh` will include `npm run pres:refresh`

## Pro Tips

### Use Notion Briefs

If you have a Notion page with research/notes for the presentation:

```bash
work pres add "SLIDES_URL" \
  --title "..." \
  --notion "https://www.notion.so/your-brief"

# Later, open the brief
work pres open pres-20251027-001 --notion
```

### Filter Lists

```bash
# Show only high priority
work pres list --priority high

# Show only in-progress
work pres list --status in-progress

# Show everything including archived
work pres list --all
```

### Update Metadata

```bash
# Change deadline
work pres update pres-20251027-001 --deadline 2025-12-15

# Add Notion URL later
work pres update pres-20251027-001 --notion "URL"

# Change priority
work pres update pres-20251027-001 --priority urgent
```

## Dashboard Reference

All commands are documented at the bottom of `GTD/presentations.md` for easy copy/paste.

The dashboard shows:
- Summary stats
- Urgent presentations (due this week)
- In-progress presentations
- Planned presentations
- Recently completed
- Quick command reference

## Troubleshooting

### "command not found: work"

Run from the obs-dailynotes directory:
```bash
cd ~/obs-dailynotes
npm link
```

### Invalid Google Slides URL

Make sure the URL includes `docs.google.com/presentation`:
```
✅ https://docs.google.com/presentation/d/ABC123/edit
❌ https://slides.google.com/...
❌ https://drive.google.com/...
```

### Presentation not found

Get the correct ID from:
```bash
work pres list
```

Copy the ID shown in brackets like `pres-20251027-001`

## Next Steps

1. Add your real presentations
2. Use for a week to establish the workflow
3. Provide feedback for improvements
4. Phase 2 will add papers/reading tracking

## Questions?

Check the detailed docs in `docs/proposals/` or create an issue.

Happy presenting! 🎤
