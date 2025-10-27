# Dashboard Enhancement: Implementation Specification
## Presentations & Papers Tracking System

**Date**: 2025-10-27
**Status**: Implementation Ready
**Priority**: Presentations > Papers

---

## Overview

Implement a workflow-focused system for tracking presentations and papers:
1. **Create** - Add new presentation/paper
2. **Working** - Mark as in-progress  
3. **Complete** - Mark as done
4. **Archive** - Move to archive

**Philosophy**: Simple state machine, clear CLI commands, integrated into morning GTD routine.

---

## Workflow State Machine

### Presentations

```
┌─────────┐
│ Planned │ ──────────────────────┐
└─────────┘                        │
     │                             │
     │ start working               │
     ↓                             │
┌─────────────┐                    │
│ In Progress │                    │
└─────────────┘                    │
     │                             │
     │ complete                    │
     ↓                             │
┌───────────┐                      │
│ Completed │                      │
└───────────┘                      │
     │                             │
     │ archive (after 30 days)     │
     ↓                             │
┌──────────┐ ←─────────────────────┘
│ Archived │     archive (skip completed)
└──────────┘
```

**States:**
- `planned` - Created but not started (default)
- `in-progress` - Actively working on
- `completed` - Done (but still visible for recent reference)
- `archived` - Moved to archive (hidden from main dashboard)

**Transitions:**
```bash
pnpm run pres:add         # → planned
pnpm run pres:start <id>  # planned → in-progress
pnpm run pres:complete <id>  # in-progress → completed
pnpm run pres:archive <id>   # any → archived
```

### Papers

```
┌─────────┐
│ To Read │
└─────────┘
     │
     │ start reading
     ↓
┌─────────┐
│ Reading │
└─────────┘
     │
     │ finish
     ↓
┌──────┐
│ Read │
└──────┘
     │
     │ archive (after 90 days)
     ↓
┌──────────┐
│ Archived │
└──────────┘
```

**States:**
- `to-read` - In queue (default)
- `reading` - Currently reading
- `read` - Finished
- `archived` - Moved to archive

**Transitions:**
```bash
pnpm run papers:add          # → to-read
pnpm run papers:start <id>   # to-read → reading
pnpm run papers:finish <id>  # reading → read
pnpm run papers:archive <id> # any → archived
```

---

## Data Schemas

### Presentations: `data/presentations.json`

```json
{
  "version": "1.0",
  "presentations": [
    {
      "id": "pres-20251027-001",
      "title": "Q4 Board Presentation",
      "url": "https://docs.google.com/presentation/d/ABC123/edit",
      "status": "in-progress",
      "priority": "high",
      "deadline": "2025-11-15",
      "createdDate": "2025-10-27T10:00:00Z",
      "startedDate": "2025-10-28T09:00:00Z",
      "completedDate": null,
      "archivedDate": null,
      "tags": ["board", "quarterly"],
      "notes": "Need to add financial slides by Nov 10",
      "reminderTaskId": "reminder-uuid-123",
      "estimatedHours": 8,
      "actualHours": 3
    }
  ]
}
```

**Field Definitions:**
- `id` - Unique identifier (format: `pres-YYYYMMDD-NNN`)
- `title` - Presentation name
- `url` - Google Slides URL
- `status` - One of: `planned`, `in-progress`, `completed`, `archived`
- `priority` - One of: `low`, `medium`, `high`, `urgent`
- `deadline` - ISO date (YYYY-MM-DD) or null
- `createdDate` - ISO timestamp when added
- `startedDate` - ISO timestamp when started (null if not started)
- `completedDate` - ISO timestamp when completed (null if not completed)
- `archivedDate` - ISO timestamp when archived (null if active)
- `tags` - Array of strings for categorization
- `notes` - Free-form text notes
- `reminderTaskId` - Link to Apple Reminder (null if no link)
- `estimatedHours` - Estimated work hours (null if not estimated)
- `actualHours` - Actual hours spent (null/0 if not tracked)

### Papers: `data/reading-queue.json`

```json
{
  "version": "1.0",
  "papers": [
    {
      "id": "paper-20251027-001",
      "title": "AI Architectures for Knowledge Work",
      "filename": "2025-10-27-ai-architectures.pdf",
      "path": "data/papers/to-read/2025-10-27-ai-architectures.pdf",
      "status": "to-read",
      "priority": "high",
      "deadline": "2025-11-01",
      "createdDate": "2025-10-27T10:00:00Z",
      "startedDate": null,
      "finishedDate": null,
      "archivedDate": null,
      "source": "email",
      "tags": ["ai", "architecture", "research"],
      "notes": "Recommended by Kevin - discusses LLM agent patterns",
      "estimatedMinutes": 30,
      "reminderTaskId": null
    }
  ]
}
```

**Field Definitions:**
- `id` - Unique identifier (format: `paper-YYYYMMDD-NNN`)
- `title` - Paper title
- `filename` - Original filename
- `path` - Current file path (changes based on status)
- `status` - One of: `to-read`, `reading`, `read`, `archived`
- `priority` - One of: `low`, `medium`, `high`, `urgent`
- `deadline` - ISO date or null
- `createdDate` - When added to queue
- `startedDate` - When moved to "reading"
- `finishedDate` - When marked as "read"
- `archivedDate` - When archived
- `source` - Where it came from (e.g., "email", "twitter", "recommendation")
- `tags` - Categorization tags
- `notes` - Reading notes or context
- `estimatedMinutes` - How long to read
- `reminderTaskId` - Link to Apple Reminder

---

## Directory Structure

```
obs-dailynotes/
├── data/
│   ├── presentations.json
│   ├── reading-queue.json
│   └── papers/
│       ├── to-read/
│       │   └── 2025-10-27-ai-architectures.pdf
│       ├── reading/
│       │   └── 2025-10-20-distributed-systems.pdf
│       ├── read/
│       │   └── 2025-09-15-blockchain.pdf
│       └── archived/
│           └── 2024-01-15-old-paper.pdf
├── GTD/
│   ├── dashboard.md (enhanced with presentations/papers)
│   ├── presentations.md (generated)
│   └── reading-queue.md (generated)
└── tools/
    ├── presentations/
    │   ├── addPresentation.js
    │   ├── updatePresentation.js
    │   ├── listPresentations.js
    │   └── generateDashboard.js
    └── papers/
        ├── addPaper.js
        ├── updatePaper.js
        ├── listPapers.js
        └── generateDashboard.js
```

---

## CLI Commands Specification

### Presentations

#### Add Presentation

```bash
pnpm run pres:add <url> [options]

Arguments:
  url                   Google Slides URL (required)

Options:
  --title <title>       Presentation title (required)
  --priority <level>    Priority: low|medium|high|urgent (default: medium)
  --deadline <date>     Deadline in YYYY-MM-DD format
  --tags <tags>         Comma-separated tags
  --notes <text>        Additional notes
  --estimate <hours>    Estimated hours to complete
  --link-reminder <id>  Apple Reminder ID to link

Examples:
  pnpm run pres:add "https://docs.google.com/presentation/d/ABC" \
    --title "Q4 Board Presentation" \
    --priority high \
    --deadline 2025-11-15 \
    --tags board,quarterly \
    --estimate 8

Output:
  ✓ Created presentation: pres-20251027-001
  Title: Q4 Board Presentation
  Status: planned
  View: pnpm run pres:list
```

#### Start Working on Presentation

```bash
pnpm run pres:start <id>

Arguments:
  id                    Presentation ID (e.g., pres-20251027-001)

Examples:
  pnpm run pres:start pres-20251027-001

Output:
  ✓ Started: Q4 Board Presentation
  Status: planned → in-progress
  Started: 2025-10-27 10:30
```

#### Complete Presentation

```bash
pnpm run pres:complete <id> [options]

Arguments:
  id                    Presentation ID

Options:
  --hours <hours>       Actual hours spent (updates actualHours)
  --notes <text>        Completion notes

Examples:
  pnpm run pres:complete pres-20251027-001 --hours 10

Output:
  ✓ Completed: Q4 Board Presentation
  Status: in-progress → completed
  Completed: 2025-11-14 16:00
  Estimated: 8h, Actual: 10h
```

#### Archive Presentation

```bash
pnpm run pres:archive <id>

Arguments:
  id                    Presentation ID

Examples:
  pnpm run pres:archive pres-20251027-001

Output:
  ✓ Archived: Q4 Board Presentation
  Status: completed → archived
  Archived: 2025-12-15 09:00
```

#### List Presentations

```bash
pnpm run pres:list [options]

Options:
  --status <status>     Filter by status (planned|in-progress|completed|archived)
  --priority <level>    Filter by priority
  --tag <tag>           Filter by tag
  --deadline-before <date>  Show items due before date
  --all                 Include archived (default: exclude)

Examples:
  pnpm run pres:list
  pnpm run pres:list --status in-progress
  pnpm run pres:list --deadline-before 2025-11-30
  pnpm run pres:list --priority high --status planned

Output:
  Presentations (3 active, 2 archived):

  🔴 URGENT - Due Soon
  [pres-20251027-001] Q4 Board Presentation
    Status: in-progress | Due: 2025-11-15 (18 days)
    Priority: high | Started: Oct 28
    URL: https://docs.google.com/...
    
  🟡 IN PROGRESS
  [pres-20251025-002] Product Vision Deck
    Status: in-progress | Due: 2025-12-01 
    Priority: medium | Started: Oct 25
    
  🟢 PLANNED
  [pres-20251020-003] Investor Update
    Status: planned | Due: 2025-12-15
    Priority: medium | Not started
```

#### Update Presentation

```bash
pnpm run pres:update <id> [options]

Arguments:
  id                    Presentation ID

Options:
  --title <title>       Update title
  --url <url>           Update URL
  --priority <level>    Update priority
  --deadline <date>     Update deadline
  --notes <text>        Update/append notes
  --add-tag <tag>       Add a tag
  --remove-tag <tag>    Remove a tag

Examples:
  pnpm run pres:update pres-20251027-001 \
    --deadline 2025-11-20 \
    --notes "Extended deadline due to data delays"

Output:
  ✓ Updated: Q4 Board Presentation
  Changed: deadline (2025-11-15 → 2025-11-20)
  Added notes
```

#### Open Presentation

```bash
pnpm run pres:open <id>

Arguments:
  id                    Presentation ID

Examples:
  pnpm run pres:open pres-20251027-001

Output:
  Opening: Q4 Board Presentation
  URL: https://docs.google.com/presentation/d/ABC123/edit
  (Opens in default browser)
```

### Papers

#### Add Paper

```bash
pnpm run papers:add <pdf-path> [options]

Arguments:
  pdf-path              Path to PDF file (required)

Options:
  --title <title>       Paper title (required)
  --priority <level>    Priority: low|medium|high|urgent (default: medium)
  --deadline <date>     Deadline in YYYY-MM-DD format
  --tags <tags>         Comma-separated tags
  --source <source>     Where you got it (email, twitter, etc.)
  --notes <text>        Notes or context
  --estimate <minutes>  Estimated reading time in minutes

Examples:
  pnpm run papers:add ~/Downloads/ai-paper.pdf \
    --title "AI Architectures for Knowledge Work" \
    --priority high \
    --deadline 2025-11-01 \
    --tags ai,research \
    --source email \
    --estimate 30

Output:
  ✓ Added paper: paper-20251027-001
  Title: AI Architectures for Knowledge Work
  Moved: ~/Downloads/ai-paper.pdf
      → data/papers/to-read/2025-10-27-ai-architectures.pdf
  Status: to-read
  View: pnpm run papers:list
```

#### Start Reading Paper

```bash
pnpm run papers:start <id>

Arguments:
  id                    Paper ID

Examples:
  pnpm run papers:start paper-20251027-001

Output:
  ✓ Started reading: AI Architectures for Knowledge Work
  Moved: data/papers/to-read/2025-10-27-ai-architectures.pdf
      → data/papers/reading/2025-10-27-ai-architectures.pdf
  Status: to-read → reading
  Started: 2025-10-27 14:00
```

#### Finish Reading Paper

```bash
pnpm run papers:finish <id> [options]

Arguments:
  id                    Paper ID

Options:
  --notes <text>        Reading notes or key takeaways

Examples:
  pnpm run papers:finish paper-20251027-001 \
    --notes "Key insight: LLM agents work better with specialized tools"

Output:
  ✓ Finished: AI Architectures for Knowledge Work
  Moved: data/papers/reading/2025-10-27-ai-architectures.pdf
      → data/papers/read/2025-10-27-ai-architectures.pdf
  Status: reading → read
  Finished: 2025-10-27 15:30
  Time spent: ~90 minutes
```

#### Archive Paper

```bash
pnpm run papers:archive <id>

Arguments:
  id                    Paper ID

Examples:
  pnpm run papers:archive paper-20251027-001

Output:
  ✓ Archived: AI Architectures for Knowledge Work
  Moved: data/papers/read/2025-10-27-ai-architectures.pdf
      → data/papers/archived/2025-10-27-ai-architectures.pdf
  Status: read → archived
```

#### List Papers

```bash
pnpm run papers:list [options]

Options:
  --status <status>     Filter by status (to-read|reading|read|archived)
  --priority <level>    Filter by priority
  --tag <tag>           Filter by tag
  --deadline-before <date>  Show items due before date
  --all                 Include archived (default: exclude)

Examples:
  pnpm run papers:list
  pnpm run papers:list --status to-read
  pnpm run papers:list --priority high
  pnpm run papers:list --tag ai

Output:
  Reading Queue (5 papers):

  📕 URGENT - Due Soon
  [paper-20251027-001] AI Architectures for Knowledge Work
    Status: to-read | Due: 2025-11-01 (4 days)
    Priority: high | Est: 30 min
    Tags: ai, research
    
  📖 CURRENTLY READING
  [paper-20251020-002] Distributed Systems Design
    Status: reading | Started: Oct 20 (7 days ago)
    Est: 60 min
    
  📚 TO READ
  [paper-20251015-003] Blockchain Consensus
    Status: to-read | No deadline
    Priority: low
```

#### Open Paper

```bash
pnpm run papers:open <id>

Arguments:
  id                    Paper ID

Examples:
  pnpm run papers:open paper-20251027-001

Output:
  Opening: AI Architectures for Knowledge Work
  Path: data/papers/to-read/2025-10-27-ai-architectures.pdf
  (Opens in default PDF viewer)
```

---

## Dashboard Generation

### Main Dashboard: `GTD/dashboard.md`

**Enhanced Template:**

```markdown
# GTD Dashboard

*Last updated: 2025-10-27 10:30*

## 🎯 Today's Focus

### 🎤 Presentations (2 active)
- 🔴 **URGENT** [[Q4 Board Presentation]] - Due Nov 15 (18 days)
  - [Open in Google Slides](https://docs.google.com/...)
  - Status: In Progress | Started: Oct 28
  - Notes: Need financial slides by Nov 10
  
- 🟡 [[Product Vision Deck]] - Due Dec 1
  - [Open](https://docs.google.com/...)
  - Status: In Progress

[View All Presentations →](GTD/presentations.md)

### 📚 Reading Queue (3 papers)
- 📕 **READ TODAY** [[AI Architectures]] - Due Nov 1 (Est: 30min)
  - [Open PDF](data/papers/to-read/2025-10-27-ai-architectures.pdf)
  - Priority: High | Tags: ai, research
  
- 📖 Currently Reading: [[Distributed Systems]]
  - Started 7 days ago | Est: 60min

[View Reading Queue →](GTD/reading-queue.md)

## ✅ Tasks (from Apple Reminders)

### 🔥 Urgent (!!)
[Existing urgent tasks from Reminders...]

### ⏭️ Next Actions
[Existing next actions...]

[Rest of existing GTD dashboard continues...]
```

### Presentations Dashboard: `GTD/presentations.md`

```markdown
# Presentations Dashboard

*Generated: 2025-10-27 10:30*

## Summary
- **Active**: 3 presentations
- **Completed this month**: 2
- **Archived**: 5

---

## 🔴 URGENT - Due This Week

### [[Q4 Board Presentation]]
- **ID**: pres-20251027-001
- **Status**: In Progress ✏️
- **Due**: 2025-11-15 (18 days) ⚠️
- **Priority**: High
- **Started**: Oct 28, 2025
- **Estimated**: 8 hours | **Spent**: 3 hours
- **URL**: [Open in Google Slides](https://docs.google.com/presentation/d/ABC123/edit)
- **Tags**: #board #quarterly
- **Notes**: Need to add financial slides by Nov 10
- **Linked Reminder**: [[Finish board deck !!]] ^reminder-123

---

## 🟡 IN PROGRESS

### [[Product Vision Deck]]
- **ID**: pres-20251025-002
- **Status**: In Progress ✏️
- **Due**: 2025-12-01
- **Priority**: Medium
- **Started**: Oct 25, 2025
- **Estimated**: 6 hours | **Spent**: 2 hours
- **URL**: [Open](https://docs.google.com/presentation/d/DEF456/edit)
- **Tags**: #product #strategy

---

## 🟢 PLANNED

### [[Investor Update]]
- **ID**: pres-20251020-003
- **Status**: Planned 📋
- **Due**: 2025-12-15
- **Priority**: Medium
- **Created**: Oct 20, 2025
- **Estimated**: 4 hours
- **URL**: [Open](https://docs.google.com/presentation/d/GHI789/edit)
- **Tags**: #investors #quarterly

---

## ✅ RECENTLY COMPLETED

### [[Q3 Results Presentation]]
- **Completed**: Oct 20, 2025
- **Time**: 6h (est: 5h)
- [View](https://docs.google.com/presentation/d/JKL012/edit)

---

## Commands

```bash
# Add new presentation
pnpm run pres:add <url> --title "..." --deadline YYYY-MM-DD

# Start working
pnpm run pres:start <id>

# Mark complete
pnpm run pres:complete <id>

# List all
pnpm run pres:list

# Refresh dashboard
pnpm run pres:refresh
```
```

### Reading Queue Dashboard: `GTD/reading-queue.md`

```markdown
# Reading Queue

*Generated: 2025-10-27 10:30*

## Summary
- **To Read**: 2 papers
- **Currently Reading**: 1 paper
- **Read this month**: 4 papers
- **Archived**: 12 papers

---

## 📕 URGENT - Must Read

### [[AI Architectures for Knowledge Work]]
- **ID**: paper-20251027-001
- **Status**: To Read 📚
- **Due**: 2025-11-01 (4 days) 🔥
- **Priority**: High
- **Estimated**: 30 minutes
- **Tags**: #ai #architecture #research
- **Source**: Email (recommended by Kevin)
- **Notes**: Discusses LLM agent patterns
- [Open PDF](data/papers/to-read/2025-10-27-ai-architectures.pdf)

---

## 📖 CURRENTLY READING

### [[Distributed Systems Design Patterns]]
- **ID**: paper-20251020-002
- **Status**: Reading 📖
- **Started**: Oct 20, 2025 (7 days ago)
- **Estimated**: 60 minutes
- **Tags**: #systems #infrastructure
- [Open PDF](data/papers/reading/2025-10-20-distributed-systems.pdf)

---

## 📚 TO READ (No Deadline)

### [[Blockchain Consensus Mechanisms]]
- **ID**: paper-20251015-003
- **Status**: To Read 📚
- **Priority**: Low
- **Estimated**: 45 minutes
- **Tags**: #crypto #research
- [Open PDF](data/papers/to-read/2025-10-15-blockchain.pdf)

---

## ✅ RECENTLY READ

### [[Machine Learning Systems]]
- **Read**: Oct 15, 2025
- **Time**: ~45 minutes
- **Key Takeaway**: Focus on data pipelines over model complexity
- [View PDF](data/papers/read/2025-10-05-ml-systems.pdf)

---

## Reading Statistics

- **This Week**: 2 papers
- **This Month**: 4 papers
- **Average Time**: 42 minutes per paper
- **Completion Rate**: 80%

---

## Commands

```bash
# Add paper
pnpm run papers:add <pdf-path> --title "..." --priority high

# Start reading
pnpm run papers:start <id>

# Finish reading
pnpm run papers:finish <id> --notes "Key insights..."

# List all
pnpm run papers:list

# Refresh dashboard
pnpm run papers:refresh
```
```

---

## Integration with GTD Morning Routine

**Update `tools/gtd_morning.sh`:**

```bash
#!/bin/bash
# Enhanced GTD Morning Routine

echo "🌅 Good morning! Running GTD morning routine..."

# 1. Pull Apple Reminders (existing)
echo "📥 Pulling Apple Reminders..."
pnpm run reminders:pull

# 2. Process GTD tags (existing)
echo "🏷️  Processing GTD tags..."
pnpm run gtd:process

# 3. Generate presentation dashboard (NEW)
echo "🎤 Updating presentations dashboard..."
pnpm run pres:refresh

# 4. Generate reading queue dashboard (NEW)
echo "📚 Updating reading queue..."
pnpm run papers:refresh

# 5. Generate main dashboard (enhanced)
echo "📊 Generating main dashboard..."
pnpm run dashboard:generate

echo "✅ Morning routine complete!"
echo ""
echo "📂 View your dashboard:"
echo "   - Main: GTD/dashboard.md"
echo "   - Presentations: GTD/presentations.md"
echo "   - Reading: GTD/reading-queue.md"
```

**New package.json scripts:**

```json
{
  "scripts": {
    "pres:add": "node tools/presentations/addPresentation.js",
    "pres:start": "node tools/presentations/updatePresentation.js --start",
    "pres:complete": "node tools/presentations/updatePresentation.js --complete",
    "pres:archive": "node tools/presentations/updatePresentation.js --archive",
    "pres:list": "node tools/presentations/listPresentations.js",
    "pres:update": "node tools/presentations/updatePresentation.js",
    "pres:open": "node tools/presentations/openPresentation.js",
    "pres:refresh": "node tools/presentations/generateDashboard.js",
    
    "papers:add": "node tools/papers/addPaper.js",
    "papers:start": "node tools/papers/updatePaper.js --start",
    "papers:finish": "node tools/papers/updatePaper.js --finish",
    "papers:archive": "node tools/papers/updatePaper.js --archive",
    "papers:list": "node tools/papers/listPapers.js",
    "papers:update": "node tools/papers/updatePaper.js",
    "papers:open": "node tools/papers/openPaper.js",
    "papers:refresh": "node tools/papers/generateDashboard.js",
    
    "dashboard:generate": "node tools/dashboard/generateEnhancedDashboard.js"
  }
}
```

---

## Apple Reminders Linking (Optional)

**When creating a reminder for a presentation/paper:**

```bash
# In Apple Reminders app:
"Work on Q4 presentation #presentation !!"

# Link it to the presentation:
pnpm run pres:update pres-20251027-001 --link-reminder <reminder-id>

# Or create reminder from presentation:
pnpm run pres:create-reminder pres-20251027-001
```

**Sync behavior:**
- When reminder is completed → presentation status doesn't auto-change
- When presentation is completed → can optionally complete linked reminder
- Dashboard shows both states for visibility

---

## File Operations

### PDF Management

**On add:**
```javascript
// Copy/move PDF to data/papers/to-read/
const newFilename = `${dateStr}-${slugify(title)}.pdf`;
const destPath = path.join('data/papers/to-read', newFilename);
fs.copyFileSync(pdfPath, destPath);
```

**On status change:**
```javascript
// Move PDF between directories
const oldPath = paper.path; // data/papers/to-read/...
const newPath = oldPath.replace('/to-read/', '/reading/');
fs.renameSync(oldPath, newPath);
paper.path = newPath;
```

**On archive:**
```javascript
const archivedPath = paper.path.replace(/\/(to-read|reading|read)\//, '/archived/');
fs.renameSync(paper.path, archivedPath);
```

---

## Error Handling

### Common Scenarios

**Presentation URL invalid:**
```
Error: Invalid Google Slides URL
Expected format: https://docs.google.com/presentation/d/[ID]/...
```

**PDF file not found:**
```
Error: PDF file not found: ~/Downloads/paper.pdf
Please check the path and try again.
```

**ID not found:**
```
Error: Presentation pres-20251027-999 not found
Run 'pnpm run pres:list' to see available presentations.
```

**State transition invalid:**
```
Error: Cannot complete presentation in 'planned' status
Suggestion: Run 'pnpm run pres:start pres-20251027-001' first
```

---

## Implementation Priority

### Phase 1: Core Presentations (Week 1)
1. Data structure (`presentations.json`)
2. Add/list/update commands
3. State transitions (start/complete/archive)
4. Basic dashboard generation

### Phase 2: Papers Foundation (Week 2)
1. Data structure (`reading-queue.json`)
2. PDF file management
3. Add/list/update commands
4. State transitions
5. Dashboard generation

### Phase 3: Dashboard Integration (Week 3)
1. Enhanced main dashboard
2. Integration with morning routine
3. Link between dashboards
4. Statistics and summaries

### Phase 4: Polish (Week 4)
1. Apple Reminders linking
2. Better error handling
3. Auto-archive old items
4. Statistics and insights

---

## Testing Strategy

### Manual Testing Checklist

**Presentations:**
- [ ] Add new presentation
- [ ] Start working (planned → in-progress)
- [ ] Complete (in-progress → completed)
- [ ] Archive
- [ ] List with various filters
- [ ] Update metadata
- [ ] Open in browser

**Papers:**
- [ ] Add PDF from Downloads
- [ ] Verify PDF moved to to-read/
- [ ] Start reading (moves to reading/)
- [ ] Finish reading (moves to read/)
- [ ] Archive (moves to archived/)
- [ ] Open PDF in viewer

**Dashboards:**
- [ ] Presentations dashboard generates correctly
- [ ] Reading queue dashboard shows right sections
- [ ] Main dashboard includes both
- [ ] Morning routine updates all dashboards

---

## Next Steps

1. **Review this spec** - Confirm workflows and commands
2. **Start Phase 1** - Build presentations tracking
3. **Test with real use** - Add 2-3 presentations
4. **Iterate** - Refine based on usage
5. **Phase 2** - Add papers once presentations work well

---

**Questions:**
1. Is the workflow (planned → in-progress → completed → archived) right?
2. Should we auto-archive completed items after X days?
3. Any other metadata fields needed?
4. Ready to start building?

---

## ADDENDUM: Notion Integration

**Date Added**: 2025-10-27

### Feature: Notion Brief Pages

Many presentations have companion Notion pages that contain:
- Detailed briefs
- Research and notes
- Collaboration with team
- Draft content

### Phase 1: Manual URL Field

**Add to presentation schema:**

```json
{
  "id": "pres-20251027-001",
  "title": "Q4 Board Presentation",
  "url": "https://docs.google.com/presentation/d/ABC123/edit",
  "notionUrl": "https://www.notion.so/Brief-Q4-Board-ABC123",  // NEW
  "status": "in-progress",
  // ... rest of fields
}
```

**Add to CLI:**

```bash
# When adding presentation
work pres add <slides-url> \
  --title "Q4 Board Presentation" \
  --notion "https://www.notion.so/Brief-Q4-Board-ABC123"

# Update existing presentation
work pres update pres-20251027-001 \
  --notion "https://www.notion.so/Brief-Q4-Board-ABC123"

# Open Notion brief
work pres open pres-20251027-001 --notion
```

**Dashboard display:**

```markdown
### [[Q4 Board Presentation]]
- **Status**: In Progress
- **Due**: 2025-11-15
- [🎤 Open Slides](https://docs.google.com/presentation/d/...)
- [📝 Open Brief (Notion)](https://www.notion.so/Brief-Q4-Board-ABC123)  // NEW
```

### Future Phase: Notion API Sync

**Roadmap for later enhancement** (if this becomes core workflow):

#### What Could Be Synced

**From Notion → Obsidian:**
- Page title (keep in sync with presentation title)
- Last edited date (detect stale briefs)
- Key content sections (summary, objectives, etc.)
- Collaborators (who's working on the brief)
- Status tags from Notion

**From Obsidian → Notion:**
- Presentation status (planned/in-progress/completed)
- Deadline updates
- Completion date
- Links back to Obsidian dashboard

#### Sync Strategy Options

**Option A: One-Way Sync (Notion → Obsidian)**
- Pull key metadata from Notion
- Display in dashboard for visibility
- Notion remains source of truth for brief content
- Lower complexity, safer

**Option B: Two-Way Sync (Bidirectional)**
- Status updates flow both directions
- Notion database property for "Obsidian Status"
- More powerful but higher risk of conflicts

**Option C: Notion as Database Source**
- Use Notion database as THE source for presentations
- Obsidian dashboard pulls everything from Notion
- Highest integration but most dependency

#### Implementation Approach

**Phase 2A: Read-Only Sync**
1. Use Notion API to fetch page metadata
2. Store in presentations.json as cache
3. Display in dashboard
4. Manual refresh command

```bash
# Fetch latest from Notion
work pres sync-notion <id>

# Sync all presentations that have Notion URLs
work pres sync-notion --all
```

**Phase 2B: Status Updates**
1. When presentation status changes in Obsidian
2. Update corresponding Notion page property
3. Keeps Notion database in sync

**Phase 2C: Auto-Sync**
1. Morning routine includes Notion sync
2. Pulls updates automatically
3. Shows warnings for conflicts

#### Technical Requirements

**Notion API Setup:**
```bash
# Install Notion SDK
npm install @notionhq/client

# Environment variables
NOTION_API_KEY=secret_xyz...
NOTION_DATABASE_ID=abc123...  # If using database
```

**Data Model:**

```json
{
  "id": "pres-20251027-001",
  "title": "Q4 Board Presentation",
  "url": "https://docs.google.com/presentation/d/ABC123/edit",
  "notionUrl": "https://www.notion.so/Brief-Q4-Board-ABC123",
  "notionPageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // NEW
  "notionLastEdited": "2025-10-26T15:30:00Z",  // NEW
  "notionCollaborators": ["user@example.com"],  // NEW
  "notionSyncEnabled": true,  // NEW: Opt-in per presentation
  "lastSyncedAt": "2025-10-27T09:00:00Z"  // NEW
}
```

#### Dashboard Enhancements

**With Notion sync:**

```markdown
### [[Q4 Board Presentation]]
- **Status**: In Progress
- **Due**: 2025-11-15
- [🎤 Slides](https://docs.google.com/...)
- [📝 Brief](https://www.notion.so/...)
  - Last edited: Oct 26 (1 day ago)
  - Collaborators: Sarah, John
  - ⚠️ Brief not updated in 3 days
```

#### Conflict Resolution

**What if status differs?**

```
Notion says: "In Progress"
Obsidian says: "Completed"

Action: Show warning in dashboard
Allow user to:
  1. Keep Obsidian status (override Notion)
  2. Pull from Notion (override Obsidian)
  3. Manually resolve
```

#### Privacy & Control

**Opt-in per presentation:**
```bash
# Enable Notion sync for specific presentation
work pres update pres-20251027-001 --notion-sync enable

# Disable
work pres update pres-20251027-001 --notion-sync disable
```

**Benefits of opt-in:**
- Control what syncs
- Can keep some presentations local-only
- Gradual rollout (test with one presentation first)

### Decision Points for Future

**Before building Notion sync, evaluate:**

1. **Usage Pattern**
   - After 1 month, how many presentations have Notion URLs?
   - Are you actually using the Notion briefs actively?
   - Is manual URL entry sufficient?

2. **Value vs Complexity**
   - Is seeing "last edited" worth the API complexity?
   - Do you need status to sync back to Notion?
   - Would you use auto-sync or prefer manual?

3. **Alternative: Simple Links**
   - Maybe just having the URL clickable is enough
   - Notion can link back to Obsidian
   - Keep systems loosely coupled

### Recommended Approach

**Phase 1 (Now):**
- Add `notionUrl` field
- Display as clickable link in dashboard
- Command to open Notion brief

**Phase 2 (If useful after 1 month):**
- Add read-only sync
- Pull metadata (last edited, collaborators)
- Display in dashboard

**Phase 3 (If critical after 3 months):**
- Add status sync (Obsidian → Notion)
- Keep statuses in sync

**Phase 4 (Only if essential):**
- Full bidirectional sync
- Conflict resolution
- Auto-sync in morning routine

### Implementation Priority

**Week 1 (Phase 1 Core):**
- ✅ Basic presentations tracking
- ✅ Workflow states
- ✅ Dashboard generation
- ✅ `notionUrl` field (ADDED)
- ✅ Open Notion brief command (ADDED)

**Week 5+ (After initial adoption):**
- Evaluate usage patterns
- Decide if Notion sync needed
- If yes, start with read-only metadata pull

---

## Updated Phase 1 Spec with Notion URLs

### Schema Changes

```json
{
  "presentations": [
    {
      "id": "pres-20251027-001",
      "title": "Q4 Board Presentation",
      "url": "https://docs.google.com/presentation/d/ABC123/edit",
      "notionUrl": "https://www.notion.so/Brief-Q4-Board-ABC123",  // NEW
      "status": "in-progress",
      "priority": "high",
      "deadline": "2025-11-15",
      // ... rest of fields
    }
  ]
}
```

### CLI Changes

```javascript
// Add command
pres
  .command('add <url>')
  .option('--notion <url>', 'Notion brief URL')  // NEW
  .action(presAdd);

// Update command
pres
  .command('update <id>')
  .option('--notion <url>', 'Update Notion URL')  // NEW
  .action(presUpdate);

// Open command enhancement
pres
  .command('open <id>')
  .option('--notion', 'Open Notion brief instead of slides')  // NEW
  .action(presOpen);
```

### Interactive Menu Changes

```javascript
// When adding presentation
const answers = await inquirer.prompt([
  // ... existing prompts
  {
    type: 'input',
    name: 'notionUrl',
    message: '📝 Notion brief URL (or leave blank):',
    default: ''
  }
]);
```

### Dashboard Changes

```markdown
### [[Q4 Board Presentation]]
- **Status**: In Progress
- **Due**: 2025-11-15 (18 days)
- **Links**:
  - [🎤 Open Slides](https://docs.google.com/presentation/d/ABC123/edit)
  - [📝 Open Brief](https://www.notion.so/Brief-Q4-Board-ABC123)  // NEW
- **Notes**: Need financial slides by Nov 10
```

### Commands Summary

```bash
# Add with Notion URL
work pres add "SLIDES_URL" \
  --title "Q4 Board" \
  --notion "NOTION_URL"

# Update Notion URL later
work pres update pres-20251027-001 \
  --notion "https://www.notion.so/..."

# Open slides (default)
work pres open pres-20251027-001

# Open Notion brief
work pres open pres-20251027-001 --notion

# List shows which have Notion briefs
work pres list
# Output shows 📝 icon for presentations with Notion URLs
```

---

**This addition requires minimal changes to Phase 1 implementation and sets foundation for future Notion sync if needed.**
