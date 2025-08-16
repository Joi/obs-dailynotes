---
tags: [documentation, deprecated]
type: redirect
slug: gtd-system-design
id: note:gtd-system-design
redirect_to: gtd/README.md
---

# GTD System: Apple Reminders + Obsidian

> ⚠️ **This documentation has been reorganized!**
> 
> Please see the new documentation structure at **[gtd/README.md](gtd/README.md)**

## Quick Links to New Documentation

- 📚 **[Overview & Quick Start](gtd/README.md)** - Start here
- 🧠 **[Concepts & Principles](gtd/concepts.md)** - GTD methodology
- ⚙️ **[Implementation Details](gtd/implementation.md)** - Technical architecture
- 📅 **[Operations Guide](gtd/operations.md)** - Daily workflows
- 📖 **[Quick Reference](gtd/reference.md)** - Tags, commands, config

---

## Original Content (Deprecated)

The content below is preserved for reference but is now maintained in the new structure.

## What this gives you

- Clear daily focus: urgent and high‑priority tasks surfaced automatically
- One trusted task list: capture anywhere (phone, Mac, Siri) and review in Obsidian
- People-centric workflow: tasks can link to people; meeting pages can show agendas (optional)
- Stability-first sync: completions flow back to Apple Reminders reliably; creation/edits are opt‑in

## How it works (in plain language)

- You continue using Apple Reminders to capture tasks (via Siri, phone, Mac).
- The system organizes your tasks using simple tags (like #next, #waiting). Contexts are deprecated.
- Obsidian shows easy-to-skim views (Dashboard, Next Actions, Email, Waiting For, Scheduled).
- When you have a meeting, your daily note can include a short agenda pulled from the relevant person’s reminder list.

## Quick capture examples

- “Email Sarah about budget #email !!” → urgent email task
- “Call dentist #next” → next action
- “Waiting for contract from vendor #waiting” → tracked in “Waiting For”

You can also say things like “tomorrow”, “next Friday”, or “in 2 weeks” in the task text; the system understands common phrases and sets a due date accordingly.

## Tags

- GTD tags: `#inbox`, `#next`, `#waiting`, `#someday`, `#project:name`
- Communication tags: `#email`, `#email-reply`, `#email-waiting`, `#call`, `#meeting`
- Priorities: add `!!` for urgent (today), `!` for high (this week)

## Daily rhythm

- Morning (5 min)
  - Run: `npm run gtd:morning`
  - Glance at the Dashboard; pick 3 most important tasks
- During the day
  - Capture freely in Reminders; optionally jot checklists in daily notes
- Evening (5–10 min)
  - Run: `npm run gtd:sync` (stability mode: sync completions, pull fresh tasks, refresh views)
  - Clear anything that’s done or no longer needed
- Weekly (20–30 min)
  - Review Dashboard, Waiting For, and Scheduled
  - Decide the few tasks that really matter for the next week

## Suggested smart lists in Apple Reminders (optional)

- Email – Action Required: has `#email`, not `#waiting`
- Waiting For: has `#waiting`
- Today Focus: due today or priority high

## Meeting agendas (optional, if you use person pages)

If a person page includes a Reminders list, relevant items appear under that person in your meeting note. You’ll see something like:

- Agenda for [[John Smith]]:
  - [ ] Review proposal
  - [ ] Confirm date

## Stability mode defaults

Add to `.env` (or rely on defaults):

```env
SYNC_MINIMAL_SOURCES=true      # Only today’s note + reminders/todo-today.md
SYNC_CREATE_NEW=false          # Do not create new reminders from markdown
SYNC_EDIT_EXISTING=false       # Do not edit reminder text from markdown
ENABLE_AGENDAS=false           # Do not inject per-person agendas by default
```

To opt into richer two‑way behavior, turn specific flags on as needed.

## Outbox flow (safe two‑step capture from Obsidian)

If you want to promote Markdown checklist items into Apple Reminders safely:

- Stage tasks per person:
  - `npm run reminders:export-outbox` → writes to `reminders/outbox/<Person>.md`
- Apply to Reminders (writes back IDs):
  - `npm run reminders:apply-outbox`

This avoids surprises and keeps a review step between notes and Reminders.

## Getting started

1. Use your existing Reminders lists. Add simple tags to task titles (examples above).
2. Run: `npm run gtd:morning` to generate helpful views in `GTD/`.
3. Use `npm run gtd:sync` whenever you want to sync completions and refresh views (stability mode).
4. Optional: create person pages (with emails/aliases) to enable people linking and agendas.

This setup keeps Apple Reminders as your reliable, everywhere task system while Obsidian provides calm, focused overviews for planning and review.
