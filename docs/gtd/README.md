# GTD System Documentation

## Overview

This GTD (Getting Things Done) system integrates Apple Reminders with Obsidian to create a unified task management workflow that captures anywhere and reviews in one place.

## Quick Navigation

- **[Concepts](concepts.md)** - GTD methodology and design principles
- **[Implementation](implementation.md)** - Technical architecture and code structure
- **[Operations](operations.md)** - Daily workflows and usage patterns
- **[Reference](reference.md)** - Tags, commands, and configuration

## System Components

```
Apple Reminders ←→ obs-dailynotes ←→ Obsidian Vault
     ↓                    ↓                  ↓
  Capture           Processing           Review
  (Siri/iOS)       (Node.js)           (GTD Views)
```

## Quick Start

1. **Capture** tasks in Apple Reminders with simple tags:
   - `"Email Sarah about budget #email !!"` → urgent email task
   - `"Call dentist #next"` → next action
   - `"Waiting for contract #waiting"` → delegation tracking

2. **Process** with morning routine:
   ```bash
   npm run gtd:morning
   ```

3. **Review** in Obsidian GTD Dashboard at `GTD/dashboard.md`

4. **Sync** completions in evening:
   ```bash
   npm run gtd:sync
   ```

## Key Features

- ✅ **Universal Capture** - Add tasks via Siri, iPhone, Mac, or Obsidian
- ✅ **Smart Views** - Automatic organization by priority, context, and project
- ✅ **People-Centric** - Tasks link to people pages with meeting agendas
- ✅ **Stability-First** - Safe two-way sync with configurable boundaries
- ✅ **Natural Language** - Understands "tomorrow", "next Friday", etc.

## File Structure

```
/Users/joi/
├── obs-dailynotes/          # System codebase
│   ├── docs/gtd/            # This documentation
│   ├── tools/               # Processing scripts
│   └── lib/                 # Core services
└── switchboard/             # Obsidian vault
    ├── GTD/                 # Generated views
    │   ├── dashboard.md
    │   ├── next-actions.md
    │   ├── email-tasks.md
    │   ├── waiting-for.md
    │   └── scheduled.md
    ├── dailynote/           # Daily notes
    └── reminders/           # Sync data
```

## Philosophy

This system follows David Allen's GTD methodology with modern adaptations:

- **Capture everything** in a trusted system (Apple Reminders)
- **Clarify** with simple tags during capture or review
- **Organize** automatically into contextual views
- **Review** regularly in a calm, focused environment (Obsidian)
- **Engage** with confidence knowing nothing is forgotten

## Getting Help

- Check [Operations Guide](operations.md) for daily workflow
- See [Reference](reference.md) for tag syntax and commands
- Review [Implementation](implementation.md) for technical details
- Consult [Concepts](concepts.md) for methodology questions

---

*Last updated: 2025-08-16*
