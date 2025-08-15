---
tags: [documentation]
type: note
slug: architecture-decision-multilang
id: note:architecture-decision-multilang
---

# Architecture Decision: Multi-Language Codebase

## Current State
This codebase uses both JavaScript and Python strategically:

### JavaScript Domain (Core Operations)
- **Google Calendar Integration** (`index.js`)
- **Apple Reminders Sync** (`tools/*Reminders.js`)
- **GTD Processing** (`tools/processGTD.js`)
- **People Management** (`tools/*People*.js`)
- **Real-time Operations** (anything needing async/await)

### Python Domain (Maintenance & Testing)
- **File Reorganization** (`tools/organize_switchboard.py`)
- **Link Fixing** (`tools/fix_*.py`)
- **Testing Framework** (`tests/`, `run_tests.py`)
- **Bulk Operations** (one-time cleanup scripts)

## Why This Makes Sense

1. **Google Calendar API**: The Node.js client library is officially supported and well-maintained. Switching to Python would require using a less mature library.

2. **Apple Reminders CLI**: Both languages can call it equally well via subprocess, but Node.js async handling is cleaner for the continuous sync operations.

3. **File Manipulation**: Python's pathlib and regex are superior for the complex file reorganization tasks. These are typically one-time or occasional maintenance scripts.

4. **Testing**: pytest is the gold standard for Python testing and provides better fixtures, parametrization, and reporting than JavaScript alternatives.

## Design Principles

### Use JavaScript When:
- Integrating with APIs (especially Google)
- Building continuous/daemon processes
- Needing async/await for concurrent operations
- Creating the core daily workflow

### Use Python When:
- Doing bulk file operations
- Writing maintenance/cleanup scripts
- Creating tests
- Building analysis tools

## Standardization Path (If Needed)

If we must standardize in the future, JavaScript would be the choice because:
1. Core functionality (Calendar + Reminders) is already in JS
2. More files are already in JS (16 vs 9)
3. Single package.json is simpler than requirements.txt + package.json

However, this would require:
- Rewriting the test suite (significant effort)
- Converting file manipulation scripts (moderate effort)
- Finding JS equivalents for Python's excellent file handling

## Conclusion

The mixed-language approach is intentional and beneficial. Each language is used where it excels. The complexity cost is minimal since:
- Clear separation of concerns
- No shared code between languages
- Each tool is self-contained
- Documentation clearly indicates requirements

## Setup Requirements

```bash
# JavaScript dependencies
npm install

# Python dependencies (for testing and maintenance)
pip install -r requirements-test.txt
```

Both are needed for full functionality, but day-to-day operations (daily notes, GTD) only require Node.js.