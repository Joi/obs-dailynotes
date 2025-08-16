# obs-dailynotes Documentation

## Quick Start

Looking for GTD documentation? **[Start here →](gtd/README.md)**

## Documentation Structure

### GTD System Documentation

The complete GTD (Getting Things Done) integration documentation:

- **[GTD Overview](gtd/README.md)** - System overview and quick start
- **[GTD Concepts](gtd/concepts.md)** - Methodology and design principles
- **[GTD Implementation](gtd/implementation.md)** - Technical architecture
- **[GTD Operations](gtd/operations.md)** - Daily workflows and usage
- **[GTD Reference](gtd/reference.md)** - Tags, commands, and configuration

### Other Documentation

- **[GTD_MIGRATION.md](GTD_MIGRATION.md)** - Documentation reorganization notes
- **[GTD_SYSTEM_DESIGN.md](GTD_SYSTEM_DESIGN.md)** - (Deprecated, redirects to new docs)
- **[gtd_system.md](gtd_system.md)** - (Deprecated, legacy notes)

## System Components

```
Apple Reminders ←→ obs-dailynotes ←→ Obsidian Vault
     ↓                    ↓                  ↓
  Capture           Processing           Review
```

## Key Features

- 📱 **Universal Capture** - Apple Reminders + Siri integration
- 🏷️ **Smart Tagging** - GTD methodology with simple tags
- 👥 **People-Centric** - Tasks linked to people and meetings
- 🔄 **Safe Sync** - Stability-first bidirectional sync
- 📊 **Rich Views** - Dashboard, next actions, waiting for, etc.

## Quick Commands

```bash
# Daily workflow
npm run gtd:morning   # Start your day
npm run gtd:sync     # End your day

# Maintenance
npm run reminders:pull    # Refresh data
npm run people:index     # Rebuild people links
```

## File Locations

- **Documentation**: `/Users/joi/obs-dailynotes/docs/`
- **Codebase**: `/Users/joi/obs-dailynotes/`
- **Vault**: `/Users/joi/switchboard/`
- **GTD Views**: `/Users/joi/switchboard/GTD/`

## Getting Help

1. Start with the **[GTD Overview](gtd/README.md)**
2. Check the **[Operations Guide](gtd/operations.md)** for workflows
3. Use the **[Quick Reference](gtd/reference.md)** for lookups
4. Dive into **[Implementation](gtd/implementation.md)** for technical details

---

*Documentation last updated: 2025-08-16*
