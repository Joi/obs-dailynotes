# Reading Queue - Quick Start

Track articles, blog posts, and documentation alongside PDFs.

## Quick Start

```bash
# Add a URL to read
work read add "https://example.com/article" \
  --title "Great Article About AI" \
  --tags ai,research \
  --estimate 15

# List your reading queue
work read list

# Start reading (opens in browser)
work read start read-20251027-001

# Finish when done
work read finish read-20251027-001 \
  --notes "Key insight: LLMs need grounding"

# View dashboard
work dash --read
```

## Workflow

```
to-read → reading → read → archived
```

Same workflow whether URL or PDF!

## Common Use Cases

### Article from Newsletter/Twitter

```bash
# See interesting article, copy URL
work read add "https://example.com/article" \
  --title "Article Title" \
  --tags topic,theme \
  --source newsletter \
  --estimate 10
```

### Paper Link (arXiv, etc.)

```bash
work read add "https://arxiv.org/abs/12345" \
  --title "Research Paper Title" \
  --tags ml,research \
  --priority high \
  --deadline 2025-11-15
```

### Documentation

```bash
work read add "https://docs.example.com/guide" \
  --title "Framework Documentation" \
  --tags dev,learning \
  --estimate 30
```

## Features

**URL Detection**: Automatically detects URLs vs file paths
**Priority**: low/medium/high/urgent
**Deadlines**: Track when you need to read by
**Tags**: Categorize and filter
**Notes**: Add insights after reading
**Time Tracking**: Estimate and actual time
**Dashboard**: See all reading in one place

## Commands

```bash
work read add <url>         # Add to queue
work read start <id>        # Start reading (opens browser)
work read finish <id>       # Mark as read
work read list              # View all
work read list --type url   # URLs only
work read open <id>         # Open URL
work dash --read            # Open dashboard (coming soon)
```

## Integration with Apple Reminders

**Currently in your Reminders:**
- "Read exinstitutional theory https://..." #someday

**Move to reading queue:**
```bash
work read add "URL" --title "..." --tags ... --source reminders

# Then complete in Apple Reminders (declutter Inbox)
```

**Future**: `work read import-from-reminders` will automate this.

## Full Guide

See: `docs/proposals/reading-tracking-urls.md`

---

**Try it now with a URL from your browser!** 🔗
