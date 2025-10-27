# Reading Tracking: URLs + PDFs

**Date**: 2025-10-27
**Enhancement**: Support URL-based reading (articles, docs, etc.) alongside PDFs

---

## Problem

Current plan only tracks PDF papers. But you also need to track:
- Articles (Medium, blogs, Substack)
- Documentation (technical docs)
- Reports (online PDFs, Google Docs)
- Research links (papers on arXiv, etc.)

**Current Apple Reminders has:**
- "Read exinstitutional theory https://medium.com/..." #someday

This should be tracked in reading system, not just Apple Reminders.

---

## Solution: Unified Reading Queue

Track both PDFs and URLs in same system with same workflow.

### Data Schema Enhancement

**reading-queue.json** - Support both types:

```json
{
  "version": "1.0",
  "items": [
    {
      "id": "read-20251027-001",
      "title": "Introduction to Extitutional Theory",
      "type": "url",
      "url": "https://medium.com/berkman-klein-center/...",
      "status": "to-read",
      "priority": "medium",
      "deadline": null,
      "addedDate": "2025-10-27T10:00:00Z",
      "startedDate": null,
      "finishedDate": null,
      "source": "apple-reminders",
      "tags": ["theory", "governance"],
      "notes": "",
      "estimatedMinutes": 15,
      "reminderTaskId": "3A6BC00B-5B0E-4C32-937A-80C360CC0285"
    },
    {
      "id": "read-20251027-002",
      "title": "AI Architectures for Knowledge Work",
      "type": "pdf",
      "path": "data/papers/to-read/2025-10-27-ai-architectures.pdf",
      "url": null,
      "status": "to-read",
      "priority": "high",
      "deadline": "2025-11-01",
      "addedDate": "2025-10-27T10:00:00Z",
      "source": "email",
      "tags": ["ai", "architecture"],
      "notes": "Recommended by Kevin",
      "estimatedMinutes": 30,
      "reminderTaskId": null
    }
  ]
}
```

**Key fields:**
- `type`: "url" or "pdf"
- `url`: For links (null for PDFs)
- `path`: For PDFs (null for URLs)
- One or the other populated

---

## Workflow States (Same for Both)

```
to-read → reading → read → archived
```

Both URLs and PDFs follow same workflow.

---

## Commands

### Add URL

```bash
work read add "https://medium.com/article" \
  --title "Introduction to Extitutional Theory" \
  --priority medium \
  --tags theory,governance \
  --estimate 15

# Output:
✓ Added to reading queue: read-20251027-001
Type: URL
Open with: work read open read-20251027-001
```

### Add PDF

```bash
work read add ~/Downloads/paper.pdf \
  --title "AI Architectures Paper" \
  --priority high \
  --deadline 2025-11-01 \
  --tags ai,research \
  --estimate 30

# Output:
✓ Added to reading queue: read-20251027-002
Type: PDF
Moved to: data/papers/to-read/2025-10-27-ai-architectures.pdf
```

### Same Workflow for Both

```bash
# Start reading (either type)
work read start read-20251027-001

# For URLs: Opens in browser
# For PDFs: Opens in PDF viewer

# Finish reading
work read finish read-20251027-001 \
  --notes "Key insight: Institutions can emerge from protocols"

# Archive
work read archive read-20251027-001
```

### List Reading Queue

```bash
work read list

# Output:
📚 Reading Queue (5 items)

TO READ:
  [read-20251027-001] 🔗 Introduction to Extitutional Theory
    Type: URL | Est: 15 min
    https://medium.com/...
    
  [read-20251027-002] 📄 AI Architectures Paper  
    Type: PDF | Due: Nov 1 | Est: 30 min
    Path: data/papers/to-read/2025-10-27-ai-architectures.pdf

READING:
  [read-20251020-003] 📄 Distributed Systems
    Type: PDF | Started: Oct 20
```

---

## Dashboard Display

**reading-queue.md**:

```markdown
## 📕 Priority Reading

### 🔗 [Introduction to Extitutional Theory](https://medium.com/...)
- **Type**: URL
- **Status**: To Read
- **Estimated**: 15 minutes
- **Tags**: #theory #governance
- **Added**: Oct 27
- [Open Link](https://medium.com/...)

### 📄 AI Architectures for Knowledge Work
- **Type**: PDF
- **Status**: To Read
- **Due**: Nov 1 🔥
- **Estimated**: 30 minutes
- **Tags**: #ai #research
- [Open PDF](data/papers/to-read/2025-10-27-ai-architectures.pdf)
```

Clear distinction with icons: 🔗 for URLs, 📄 for PDFs

---

## Import from Apple Reminders

**Many reading links already in Reminders!**

Example from your cache:
```
"Read exinstitutional theory https://medium.com/..." #someday
```

### Import Command

```bash
work read import-from-reminders

# Scans Apple Reminders cache
# Finds tasks starting with "Read" or containing URLs
# Prompts: Import these to reading queue?
# Creates reading queue entries
# Optionally completes the reminders
```

**Interactive flow:**
```
Found 3 reading items in Apple Reminders:

1. Read exinstitutional theory https://... #someday
2. Check out this article https://...
3. Review documentation https://docs.example.com

Import to reading queue?
> Yes

✓ Imported 3 items
✓ Created in reading queue
✓ Completed in Apple Reminders (optional)

View: work read list
```

---

## File Organization

```
data/
  reading-queue.json     # Unified queue (URLs + PDFs)
  papers/
    to-read/            # Only PDFs stored here
    reading/
    read/
    archived/
```

URLs don't need file storage - just tracked in JSON.

---

## Implementation Priority

### Phase 2A: URLs First (Week 1)

**Why URLs before PDFs:**
- Many reading links already in your Reminders
- No file management needed
- Simpler to implement
- Immediate value

**Build:**
1. reading-queue.json schema
2. work read add <url> command
3. work read list command
4. work read open <id> (opens in browser)
5. Status transitions (start/finish/archive)

### Phase 2B: PDF Support (Week 2)

Add PDF file management:
1. work read add <pdf-path>
2. File movement (to-read → reading → read)
3. Open in PDF viewer

### Phase 2C: Import (Week 3)

Import existing reading links from Apple Reminders

---

## Benefits

**URLs + PDFs in one system:**
- ✅ Single reading queue dashboard
- ✅ Same workflow for both types
- ✅ Prioritize across all reading
- ✅ Track time estimates
- ✅ Archive when done

**Better than Apple Reminders for reading:**
- ✅ Metadata (tags, notes, time estimates)
- ✅ Reading status tracking
- ✅ Dashboard view
- ✅ Archive history
- ✅ Links clickable in Obsidian

**Integration with current system:**
- URLs: Import from Reminders or add directly
- PDFs: From email attachments or downloads
- Both: Show in unified reading dashboard
- Optional: Link back to Reminders for notifications

---

## Proposed Commands

```bash
# URLs
work read add "https://example.com/article" \
  --title "Article Title" \
  --tags tech,ai \
  --estimate 20

# PDFs  
work read add ~/Downloads/paper.pdf \
  --title "Paper Title" \
  --tags research \
  --estimate 45

# Same workflow
work read start <id>     # Opens URL in browser OR PDF in viewer
work read finish <id>    # Marks as read
work read list           # Shows both types
work read list --type url     # Filter by type
work read list --type pdf

# Dashboard
work dash --read         # Open reading queue dashboard
npm run read:refresh     # Regenerate dashboard
```

---

## Migration Path

### Step 1: Extract Reading URLs from Reminders

You have items like:
```
"Read exinstitutional theory https://..." #someday
```

**Import process:**
1. Scan Apple Reminders for URLs
2. Extract title + URL
3. Create reading queue entry
4. Tag #someday in reading system
5. Complete in Apple Reminders

### Step 2: New Reading Capture

Going forward:
```
# Instead of adding to Apple Reminders:
work read add "URL" --title "..."

# OR if you do add to Reminders:
# Import later with: work read import-from-reminders
```

---

## Example Usage

### Scenario 1: Article from Twitter

```bash
# See interesting article on Twitter
# Copy URL

work read add "https://example.com/great-article" \
  --title "Great Article About AI" \
  --tags ai,research \
  --source twitter \
  --estimate 10

# Later:
work read list
# See it in queue

work read start read-20251027-001
# Opens in browser, marks as "reading"

# After reading:
work read finish read-20251027-001 \
  --notes "Key insight: LLMs need better grounding"
```

### Scenario 2: PDF from Email

```bash
# Download PDF from email

work read add ~/Downloads/report.pdf \
  --title "Q3 Market Report" \
  --priority high \
  --deadline 2025-11-15 \
  --source email

# System moves PDF to data/papers/to-read/

# Later:
work read open read-20251027-002
# Opens PDF in viewer
```

### Scenario 3: Import from Reminders

```bash
work read import-from-reminders

# Interactive:
# Shows: 3 reading links found
# Import? Yes
# Complete in Reminders? Yes

# Result: Reading queue has 3 new items
```

---

## Next Steps

1. **Review this proposal**
2. **Decide**: Build URLs first (simpler) or PDFs first?
3. **Recommendation**: URLs first (Week 1), PDFs later (Week 2)

**Want me to implement the URL reading tracking now?**
