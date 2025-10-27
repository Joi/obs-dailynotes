# Dashboard Enhancement Proposal
## Presentations, Papers & Enhanced GTD Integration

**Date**: 2025-10-27
**Status**: Draft for Review
**Author**: Claude (with Joi)

---

## Executive Summary

Enhance the obs-dailynotes GTD dashboard to track:
1. **Google Slides presentations** requiring work
2. **PDF papers** requiring reading
3. Better integration with **Apple Reminders** as ground truth

While maintaining the philosophy that Apple Reminders is the operational layer for tasks.

---

## Problem Statement

### Current Gaps

1. **Presentations (Google Slides)**
   - No centralized tracking of presentations in progress
   - URLs don't work well in Apple Reminders
   - Need to see: what presentations exist, status, deadline

2. **Papers/PDFs to Read**
   - No system for tracking reading queue
   - PDFs scattered across Downloads, email attachments, cloud storage
   - Can't attach PDFs well to Apple Reminders
   - Need to prioritize: urgent vs. background reading

3. **Apple Reminders Limitations**
   - Text-only (URLs work but not well displayed)
   - No file attachments
   - No rich metadata (priority, tags work but limited)

4. **Current GTD Dashboard**
   - Excellent for text-based tasks
   - No visibility into document-based work
   - Missing "materials to process" category

---

## Proposed Architecture

### Core Principle: Three-Layer System

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: Ground Truth (Apple Reminders)            │
│  - Text-based tasks                                  │
│  - Siri capture                                      │
│  - Shared lists                                      │
│  - System notifications                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  LAYER 2: Obsidian GTD Dashboard (Integration)      │
│  - Pulls from Apple Reminders (existing)             │
│  - Displays presentations metadata                   │
│  - Displays papers metadata                          │
│  - Single unified view                               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  LAYER 3: Storage (File System + JSON)              │
│  - presentations.json (metadata + URLs)              │
│  - papers/ directory (PDF files)                     │
│  - reading-queue.json (metadata + paths)             │
└─────────────────────────────────────────────────────┘
```

### Design Philosophy

**Apple Reminders = Operational Truth**
- Tasks that need notifications
- Tasks you capture via Siri
- Tasks shared with others
- Simple text-based actions

**Obsidian Dashboard = Thinking Layer**
- See ALL work in one place
- Link tasks to materials (presentations, papers)
- Context and notes
- Planning and reflection

**File System = Materials Storage**
- Presentations tracked via URLs (live in Google)
- Papers stored locally (own the PDFs)
- Metadata in JSON (structured, queryable)

---

## Detailed Design

### 1. Presentations Tracking

#### Storage: `data/presentations.json`

```json
{
  "presentations": [
    {
      "id": "pres-001",
      "title": "Q4 Board Presentation",
      "url": "https://docs.google.com/presentation/d/ABC123/edit",
      "status": "in-progress",
      "deadline": "2025-11-15",
      "priority": "high",
      "tags": ["board", "quarterly"],
      "notes": "Need to add financial slides",
      "lastUpdated": "2025-10-27T10:00:00Z",
      "reminderTaskId": "reminder-uuid-if-linked"
    }
  ]
}
```

#### Dashboard Section: `GTD/presentations.md`

```markdown
# Presentations Dashboard

## 🔴 Urgent (Due This Week)
- [[Q4 Board Presentation]] - Due 2025-11-15 ⚡
  - [Open in Google Slides](https://docs.google.com/...)
  - Status: In Progress
  - Notes: Need to add financial slides
  - Linked task: [[Apple Reminders Task]]

## 🟡 In Progress
- [[Product Vision Deck]] - Due 2025-12-01
  - [Open](https://docs.google.com/...)
  - Status: Draft

## 🟢 Planned
- [[Investor Update]] - Due 2025-12-15
  - [Open](https://docs.google.com/...)
  - Status: Not Started
```

#### Integration with Apple Reminders

**Option A: Reference Tasks** (Recommended)
```
Apple Reminder: "Work on Q4 Board Presentation #presentation"
Obsidian: Links to presentation metadata + Google Slides URL
```

**Option B: Standalone Tracking**
```
No Apple Reminder needed
Pure Obsidian-based tracking for planning
Use Apple Reminders only for hard deadlines
```

**Recommendation**: Use Option A for deadline-driven presentations, Option B for ongoing/iterative decks.

---

### 2. Papers/Reading Queue

#### Storage Strategy

**Directory Structure**:
```
data/
  papers/
    to-read/
      2025-10-27-ai-architectures.pdf
      2025-10-25-governance-models.pdf
    reading/
      2025-10-20-distributed-systems.pdf
    read/
      2025-09-15-blockchain-consensus.pdf
  reading-queue.json
```

**Metadata: `data/reading-queue.json`**

```json
{
  "papers": [
    {
      "id": "paper-001",
      "title": "AI Architectures for Knowledge Work",
      "filename": "2025-10-27-ai-architectures.pdf",
      "path": "data/papers/to-read/2025-10-27-ai-architectures.pdf",
      "status": "to-read",
      "priority": "high",
      "source": "email",
      "addedDate": "2025-10-27",
      "deadline": "2025-11-01",
      "tags": ["ai", "architecture", "research"],
      "notes": "Recommended by Kevin",
      "estimatedTime": "30min",
      "reminderTaskId": null
    }
  ]
}
```

#### Dashboard Section: `GTD/reading-queue.md`

```markdown
# Reading Queue

## 📕 Priority Reading (Due Soon)
- [[AI Architectures for Knowledge Work]] - Due 2025-11-01 🔥
  - [Open PDF](data/papers/to-read/2025-10-27-ai-architectures.pdf)
  - Est. 30 min
  - Recommended by Kevin
  - Tags: #ai #architecture

## 📘 Currently Reading
- [[Distributed Systems Paper]] - Started 2025-10-20
  - [Open PDF](data/papers/reading/2025-10-20-distributed-systems.pdf)
  - 60% complete
  - Tags: #systems #infrastructure

## 📗 To Read (No Deadline)
- [[Blockchain Consensus Mechanisms]]
  - [Open PDF](data/papers/to-read/2025-10-15-blockchain.pdf)
  - Tags: #crypto #research

## 📚 Read Archive
- Total papers read: 15
- This month: 3
- View: [[papers/read/index]]
```

#### Paper Ingestion Workflow

**Manual Add**:
```bash
# Add paper to queue
pnpm run papers:add /path/to/paper.pdf \
  --title "Paper Title" \
  --priority high \
  --deadline 2025-11-01 \
  --tags ai,research

# This moves PDF to papers/to-read/ and updates reading-queue.json
```

**Email Integration** (Future):
```bash
# Scan email for PDF attachments
pnpm run papers:scan-email --folder "To Read"
# Presents list, you select which to add
```

---

### 3. Enhanced Dashboard Integration

#### Main Dashboard: `GTD/dashboard.md`

**Current Structure** (from your system):
- Next Actions
- Waiting For
- Projects
- Email Tasks
- Scheduled

**Enhanced Structure**:
```markdown
# GTD Dashboard

Last updated: 2025-10-27 10:30

## 🎯 Today's Focus
- [ ] Complete Q4 presentation slides (3h) #presentation
- [ ] Read AI architectures paper (30min) #reading
- [ ] Review team proposals #next

## 📊 Work Materials

### Presentations (3 active)
- 🔴 [[Q4 Board Presentation]] - Due Nov 15
- 🟡 [[Product Vision]] - Due Dec 1
- 🟢 [[Investor Update]] - Due Dec 15
[View All Presentations →](GTD/presentations.md)

### Reading Queue (5 papers)
- 🔥 [[AI Architectures]] - Due Nov 1 (30min)
- 📖 [[Distributed Systems]] - In Progress
- 📚 3 more in queue
[View Reading Queue →](GTD/reading-queue.md)

## ✅ Tasks (from Apple Reminders)
[Existing GTD categories continue here...]
```

---

### 4. Apple Reminders Integration Strategy

#### The Hybrid Approach

**What Goes in Apple Reminders:**
1. Action-oriented tasks
   - "Review Q4 presentation" ← actionable
   - "Read AI paper before meeting" ← actionable
2. Tasks needing notifications
3. Tasks captured via Siri
4. Shared tasks with others

**What Stays in Obsidian Only:**
1. Material tracking (presentations list, reading queue)
2. Long-term planning
3. Reference links and notes
4. Archive/history

**Linking Strategy:**

```markdown
<!-- In Apple Reminders -->
"Finish Q4 presentation #presentation !!"

<!-- In Obsidian daily note -->
- [ ] Finish Q4 presentation #presentation !! ^reminder-abc123
  - 📊 [[Q4 Board Presentation]] metadata
  - [Open in Google Slides](https://...)

<!-- In presentations.json -->
{
  "reminderTaskId": "reminder-abc123",
  "title": "Q4 Board Presentation"
}
```

**Benefits:**
- Apple Reminders: operational layer (notifications, Siri)
- Obsidian: context layer (links, notes, materials)
- Bidirectional sync via task IDs
- Best of both worlds

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Goals:**
- Set up data structures
- Create basic CLI tools
- Establish file storage

**Deliverables:**
1. `data/presentations.json` schema
2. `data/papers/` directory structure
3. `data/reading-queue.json` schema
4. Basic add/list/update scripts

**Tools to Build:**
```bash
# Presentations
pnpm run pres:add <url> --title "..." --deadline YYYY-MM-DD
pnpm run pres:list
pnpm run pres:update <id> --status in-progress
pnpm run pres:link-reminder <pres-id> <reminder-id>

# Papers
pnpm run papers:add <pdf-path> --title "..." --priority high
pnpm run papers:list
pnpm run papers:move <id> <status>  # to-read → reading → read
pnpm run papers:open <id>  # Opens PDF in default viewer
```

### Phase 2: Dashboard Generation (Week 2)

**Goals:**
- Generate presentation and reading dashboards
- Integrate into main GTD dashboard

**Deliverables:**
1. `tools/generatePresentationsDashboard.js`
2. `tools/generateReadingQueueDashboard.js`
3. Update `tools/processGTD.js` to include new dashboards

**Dashboard Update Flow:**
```bash
# Morning routine (existing + new)
pnpm run gtd:morning
# Now also generates:
# - GTD/presentations.md
# - GTD/reading-queue.md
# - Enhanced GTD/dashboard.md
```

### Phase 3: Apple Reminders Linking (Week 3)

**Goals:**
- Link presentations/papers to Reminders tasks
- Sync updates bidirectionally

**Deliverables:**
1. Extend reminder sync to handle presentation links
2. Add presentation/paper metadata to reminder notes
3. Update sync logic for new task types

**Sync Behavior:**
```bash
# When syncing reminders
pnpm run gtd:sync

# If task has #presentation tag:
# - Look up presentation by reminderTaskId
# - Add presentation context to task in daily note
# - Update presentation status if task completed

# If task has #reading tag:
# - Look up paper by reminderTaskId
# - Add paper context to task
# - Move paper to "read" if task completed
```

### Phase 4: Advanced Features (Week 4+)

**Nice-to-have enhancements:**
1. Email scanning for PDF attachments
2. Google Slides API integration (auto-fetch metadata)
3. Reading time estimates and tracking
4. Statistics dashboard
5. Search across presentations and papers

---

## Tools Architecture

### New CLI Scripts

```
tools/
  presentations/
    addPresentation.js       # Add new presentation
    listPresentations.js     # List all presentations
    updatePresentation.js    # Update presentation metadata
    linkToReminder.js        # Link to Apple Reminder task
    generateDashboard.js     # Generate presentations.md
    
  papers/
    addPaper.js              # Add PDF to reading queue
    movePaper.js             # Move between to-read/reading/read
    listPapers.js            # List papers by status
    openPaper.js             # Open PDF in viewer
    scanEmail.js             # Scan email for PDFs (future)
    generateDashboard.js     # Generate reading-queue.md
    
  dashboard/
    enhancedDashboard.js     # Generate main dashboard with all sections
```

### Integration Points

**Existing Scripts to Modify:**
- `tools/processGTD.js` - Add presentation/paper dashboard generation
- `tools/syncReminders.js` - Handle #presentation and #reading tags
- `tools/pullRemindersWithShared.js` - Include linked presentation/paper data

---

## Data Flow Examples

### Example 1: Adding a Presentation

```bash
# 1. Add presentation
$ pnpm run pres:add "https://docs.google.com/presentation/d/ABC123" \
    --title "Q4 Board Presentation" \
    --deadline 2025-11-15 \
    --priority high

Added presentation: pres-001
Created entry in presentations.json

# 2. Create linked reminder (via Siri or app)
"Work on Q4 presentation #presentation !!"

# 3. Link them
$ pnpm run pres:link-reminder pres-001 reminder-uuid-123

Linked presentation pres-001 to reminder reminder-uuid-123

# 4. Morning routine generates dashboard
$ pnpm run gtd:morning

Generated:
- GTD/presentations.md (shows Q4 presentation)
- GTD/dashboard.md (includes presentations section)
- Daily note (if you have meeting today, reminder appears with link)
```

### Example 2: Reading a Paper

```bash
# 1. Add paper from Downloads
$ pnpm run papers:add ~/Downloads/ai-paper.pdf \
    --title "AI Architectures for Knowledge Work" \
    --priority high \
    --deadline 2025-11-01 \
    --tags ai,research

Added paper: paper-001
Moved PDF to: data/papers/to-read/2025-10-27-ai-architectures.pdf
Updated reading-queue.json

# 2. View reading queue
$ pnpm run papers:list

TO READ (2):
  [paper-001] AI Architectures... (Due: 2025-11-01) 🔥
  [paper-002] Blockchain Consensus... (No deadline)

# 3. Start reading
$ pnpm run papers:move paper-001 reading

Moved paper-001 to "reading" status
PDF: data/papers/reading/2025-10-27-ai-architectures.pdf

# 4. Open PDF
$ pnpm run papers:open paper-001

Opening: data/papers/reading/2025-10-27-ai-architectures.pdf

# 5. Finish reading, optionally create reminder to discuss
"Discuss AI paper with team #next"

# 6. Mark as read
$ pnpm run papers:move paper-001 read

Moved to: data/papers/read/
```

---

## Key Decisions for Review

### 1. Storage Format

**Question**: JSON files vs. SQLite vs. Markdown frontmatter?

**Recommendation**: JSON files
- Pros: Simple, human-readable, easy to edit manually, no new dependencies
- Cons: Not as queryable as SQL, no transactions
- Rationale: Matches existing patterns (people_cache uses JSON), fits file-based philosophy

**Alternative**: SQLite for querying
- Better for complex queries, relationships
- Adds dependency, less transparent
- Overkill for this use case

### 2. Apple Reminders Integration

**Question**: Should every presentation/paper have a reminder?

**Recommendation**: No, opt-in linking
- Presentations with deadlines → create reminder
- Papers you must read by date → create reminder
- Background reading/ongoing decks → Obsidian only
- Rationale: Keep Apple Reminders focused on actionable items

### 3. PDF Storage Location

**Question**: Where to store PDFs?

**Recommendation**: `data/papers/` inside obs-dailynotes
- Pros: Colocated with system, backed up together, clear ownership
- Cons: Repo size grows, not for huge libraries
- Alternative: Separate Papers folder (e.g., `~/Papers/`), reference by path
- Rationale: Start simple, can migrate later if needed

### 4. Dashboard Update Frequency

**Question**: When to regenerate dashboards?

**Recommendation**: On-demand + morning routine
- `pnpm run gtd:morning` regenerates everything
- Explicit `pnpm run pres:refresh` / `papers:refresh` for immediate updates
- Not on every sync (too frequent)
- Rationale: Balance freshness with performance

### 5. Google Slides Integration

**Question**: Fetch metadata from Google Slides API?

**Recommendation**: Phase 2 enhancement, not MVP
- MVP: Manual title entry, store URL
- Future: API fetch for title, thumbnail, last modified
- Rationale: Avoid complexity initially, URLs + manual metadata sufficient

---

## Risks & Mitigations

### Risk 1: Data Duplication

**Risk**: Same presentation/paper tracked in multiple places
**Mitigation**: 
- Use unique IDs everywhere
- Link via reminderTaskId field
- Dashboard shows unified view

### Risk 2: Sync Conflicts

**Risk**: Update presentation in JSON, but reminder out of sync
**Mitigation**:
- Apple Reminders is source of truth for task status
- JSON is source of truth for material metadata
- Sync pulls both, dashboard merges view

### Risk 3: File Management Overhead

**Risk**: PDFs pile up, hard to manage
**Mitigation**:
- Automated moves (to-read → reading → read)
- Archive old papers (>6 months in "read")
- Regular cleanup script: `pnpm run papers:archive --older-than 6m`

### Risk 4: Abandoned Presentations

**Risk**: Presentations added but never worked on
**Mitigation**:
- Weekly review in GTD process
- "Stale" section in dashboard (no updates in 2+ weeks)
- Easy archive/delete: `pnpm run pres:archive <id>`

---

## Success Metrics

**Adoption:**
- Using presentation tracker daily within 1 week
- Reading queue replaces email "To Read" folder within 2 weeks
- All active presentations tracked in system within 1 month

**Effectiveness:**
- Zero missed presentation deadlines
- Reading queue clearance: 1-2 papers/week
- Dashboard viewed daily (integrated into morning routine)

**Efficiency:**
- < 2 min to add presentation/paper
- < 5 min morning dashboard review
- Single source of truth for all work materials

---

## Open Questions

1. **Paper Annotations**: Should we track highlights/notes from PDFs?
   - Option: Store markdown notes alongside PDFs
   - Option: Use PDF annotation tools, just track reading status here

2. **Presentation Versions**: Track Google Slides revision history?
   - Option: Just link to current version
   - Option: Snapshot key versions (before board meeting, etc.)

3. **Collaboration**: Multiple people working on same presentation?
   - Current: Single-user focus
   - Future: Could add "owner" field, shared status

4. **Mobile Access**: How to interact with system on iPhone?
   - Apple Reminders works (for linked tasks)
   - Papers: Could add "email to self" workflow
   - Presentations: Google Slides app already handles this

---

## Next Steps

**If approved:**

1. **Review & refine this proposal**
   - Address questions above
   - Finalize data schemas
   - Confirm storage locations

2. **Create detailed spec** (separate document)
   - API/CLI contracts for each tool
   - Data schema formal definitions
   - Dashboard template designs

3. **Implement Phase 1**
   - Set up data structures
   - Build core CLI tools
   - Test manually

4. **Iterate & expand**
   - Phase 2-4 as outlined
   - Gather feedback
   - Refine workflows

---

## Appendix: Alternative Approaches Considered

### Alternative 1: Everything in Apple Reminders

**Approach**: Force presentations and papers into Reminders as text
**Rejected because**:
- URLs don't display well
- No file attachments
- Loses rich metadata
- Clutters operational task list

### Alternative 2: Separate Apps

**Approach**: Use Notion/Airtable for presentations, separate reading app
**Rejected because**:
- Breaks unified GTD view
- More tools to check
- Doesn't integrate with Obsidian knowledge graph

### Alternative 3: Pure Obsidian (No Reminders)

**Approach**: Track everything in Obsidian markdown
**Rejected because**:
- Loses Siri capture
- No mobile notifications
- Can't share with others
- Against current successful pattern

---

**For Discussion:**
- Does this architecture align with your workflow?
- Are the key decisions reasonable?
- What would you change or add?
- Should we proceed to detailed spec?
