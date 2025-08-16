# GTD Documentation Migration Notice

## Documentation has been reorganized!

The GTD documentation has been restructured for better organization and maintainability.

## New Structure

All GTD documentation is now in `/docs/gtd/`:

- **[README.md](gtd/README.md)** - Start here! Overview and quick navigation
- **[concepts.md](gtd/concepts.md)** - GTD methodology and design principles  
- **[implementation.md](gtd/implementation.md)** - Technical architecture details
- **[operations.md](gtd/operations.md)** - Daily workflows and usage patterns
- **[reference.md](gtd/reference.md)** - Quick lookup for tags, commands, config

## Old Files (Deprecated)

The following files are now deprecated but kept for reference:
- `GTD_SYSTEM_DESIGN.md` - Content moved to new structure
- `gtd_system.md` - Content integrated into new docs

## Benefits of New Structure

1. **Separation of Concerns** - Concepts vs implementation vs operations
2. **Better Navigation** - Clear hierarchy and cross-linking
3. **Easier Maintenance** - Focused files for specific topics
4. **Quick Reference** - Dedicated reference guide for lookups
5. **Progressive Disclosure** - Start simple, dive deep as needed

## For Developers

The codebase remains unchanged. Only documentation has been reorganized.

Key implementation files still at:
- `/tools/processGTD.js` - Main processor
- `/lib/services/gtdService.js` - Service layer
- `/lib/pipelines/gtdMorning.js` - Morning workflow
- `/lib/pipelines/gtdSync.js` - Sync workflow

---

*Migration completed: 2025-08-16*
