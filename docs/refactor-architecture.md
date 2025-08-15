## Architecture Refactor Plan

### Goals
- Make the daily note pipeline rock-solid and idempotent
- Clearly separate data (Obsidian vault in `~/switchboard`) from app/runtime (`obs-dailynotes`)
- Reduce fragility by isolating file writes and regex cleanup in a single writer module
- Consolidate Gmail and Reminders flows under clear pipelines

### Priorities
1) Daily note stability (header, meetings, reminders section) with non-destructive per-meeting upserts
2) GTD morning/evening flows based on Apple Reminders as source of truth
3) Gmail: single resilient client and a simple mail-to-actions step

### Target Structure (incremental)
- `src/domain/` types: Event, Meeting, Reminder, Task, DailyNote
- `src/services/`: calendarService, remindersService, gmailService, peopleCacheService
- `src/writers/`: dailyNoteWriter, sectionUpserter, meetingBlockManager
- `src/pipelines/`: dailyNotePipeline, gtdMorningPipeline, gtdSyncPipeline
- `src/utils/`: dates, config, logging, fsSafe
- `cli/`: `bin/obs-dn` entry with subcommands

### Immediate Tasks
- Extract meeting upsert/ordering/pruning into `meetingBlockManager`
- Extract agenda injection into `agendasInjector` with assistant exclusion list via env `ASSISTANT_EMAILS`
- Add config schema/validation and feature flags (`ENABLE_AGENDAS`, `ENABLE_GMAIL`, `ENABLE_REMINDERS`)
- Make all writes atomic (temp file + rename) and add final spacing-normalizer (single blank line between sections)

### GTD/Reminders
- Morning: pull reminders → normalize → generate GTD views → embed links in daily note
- Evening: sync completed items from dashboard/reminders/today back to Reminders
- Keep tasks with today/next/urgent surfaced at the top of daily note

### Gmail
- Unify token bootstrap/refresh → cached fetch → transform flagged/starred mail into tasks/inbox
- Keep iPhone triage flow (flagged → task/inbox → daily note embed)

### Testing
- Unit tests for meetingBlockManager, agendasInjector, sectionUpserter
- Golden-file tests for full daily note

### Delivered so far
- Atomic writes + spacing normalization
- Agendas injection and stable meeting keys
- Meeting block manager (init/cleanup, reorder/prune)
- Feature flags and minimal logger
- Daily pipeline extracted to `lib/pipelines/daily.js`
- GTD pipelines scaffolded in `lib/pipelines/gtdMorning.js` and `lib/pipelines/gtdSync.js`

### Rollout
- Continue on branch `refactor/pipelines`
- Land in small PRs, each with tests

