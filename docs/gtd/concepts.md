# GTD Concepts & Principles

## Core GTD Methodology

This system implements David Allen's Getting Things Done methodology with adaptations for digital workflows.

### The Five Steps

1. **Capture** - Collect what has your attention
2. **Clarify** - Process what it means
3. **Organize** - Put it where it belongs
4. **Review** - Keep your system current
5. **Engage** - Use your system to take action

## Design Principles

### Capture Everywhere, Review in One Place

- **Universal Capture**: Use Apple Reminders as the single capture point
  - Works with Siri ("Hey Siri, remind me to...")
  - Available on all Apple devices
  - Supports quick capture without context switching

- **Focused Review**: Obsidian provides the calm environment for planning
  - Rich formatting and linking
  - Connection to meeting notes and people
  - Powerful search and filtering

### Stability Over Features

The system prioritizes reliability:

- **Safe Defaults**: Sync only marks completions by default
- **Opt-in Complexity**: Enable bidirectional sync only when needed
- **Audit Trail**: All changes tracked with reminders IDs
- **No Data Loss**: Original reminders always preserved

### People-Centric Workflow

Tasks naturally relate to people:

- Meeting agendas auto-populate from person-specific lists
- Tasks can link to [[People Pages]]
- Waiting-for items grouped by person
- Delegation tracking built-in

## GTD Categories Explained

### Inbox
- **Purpose**: Holding area for unclarified items
- **Tag**: `#inbox`
- **Review**: Process to zero daily
- **Example**: "Research new CRM options #inbox"

### Next Actions
- **Purpose**: Tasks you'll do when context/time/energy align
- **Tag**: `#next`
- **Review**: Scan multiple times daily
- **Example**: "Call dentist to schedule cleaning #next"

### Waiting For
- **Purpose**: Track delegated items and dependencies
- **Tag**: `#waiting`
- **Review**: Weekly during review
- **Example**: "Waiting for contract from vendor #waiting"

### Someday/Maybe
- **Purpose**: Ideas and possibilities, not commitments
- **Tag**: `#someday`
- **Review**: Monthly or quarterly
- **Example**: "Learn Spanish #someday"

### Projects
- **Purpose**: Multi-step outcomes requiring multiple actions
- **Tag**: `#project:name`
- **Review**: Weekly for active projects
- **Example**: "Draft Q1 report outline #project:quarterly-review"

## Priority System

### Urgent (!!)
- **Meaning**: Must be done today
- **Visual**: Appears at top of dashboard
- **Use When**: Deadlines, emergencies, time-sensitive
- **Avoid**: Overuse dilutes urgency

### High Priority (!)
- **Meaning**: Should be done this week
- **Visual**: Second section of dashboard
- **Use When**: Important but not immediate
- **Balance**: 3-5 high priority items max

### Normal Priority
- **Meaning**: Do when appropriate
- **Visual**: Organized by context/project
- **Default**: Most tasks should be normal priority

## Communication Tags

Special tags for communication-related tasks:

### Email Tags
- `#email` - General email task
- `#email-reply` - Needs response
- `#email-waiting` - Sent, awaiting reply

### Other Communication
- `#call` - Phone calls
- `#meeting` - Meeting-related tasks

## Natural Language Processing

The system understands informal date expressions:

- **Relative Dates**: "tomorrow", "today"
- **Day Names**: "next Friday", "next Monday"
- **Durations**: "in 2 days", "in 1 week"
- **Formal Dates**: Still supported (2025-08-20)

## Context Deprecation

Previously, the system used contexts (@home, @office, @calls). These have been deprecated because:

1. **Modern Reality**: Most work happens anywhere with a laptop
2. **Reduced Friction**: One less decision during capture
3. **Simplified Views**: Fewer files to maintain
4. **Tag Superiority**: Tags provide better flexibility

If you need context-like organization, use tags: `#home`, `#office`, etc.

## Two-Phase Capture

For Obsidian-originated tasks, we use a two-phase approach:

1. **Stage in Outbox**: Write tasks in markdown, export to staging
2. **Review & Apply**: Confirm before creating in Reminders

This prevents accidental task duplication and maintains intentionality.

## Trust the System

The system works when you:

1. **Capture everything** - Don't try to remember
2. **Process regularly** - Empty inbox daily
3. **Review weekly** - Keep system current
4. **Use consistently** - Build the habit
5. **Keep it simple** - Resist over-engineering

---

*Based on "Getting Things Done" by David Allen, adapted for digital knowledge work*
