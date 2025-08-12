---
slug: summary
id: 'undefined:summary'
---
# Test Suite Summary

This document concisely summarizes the Python (pytest) and JavaScript (Jest) tests in this repository.

## Python (pytest)

- Runner: `python run_tests.py`
- Layout: `tests/unit/`, `tests/integration/`
- Key areas covered:
  - GTD processing (categorization, parsing, outputs)
  - Link management and person page generation
  - Integration flow for daily notes generation
- Useful commands:
  - `python run_tests.py unit`
  - `python run_tests.py integration`
  - `python run_tests.py coverage`

## JavaScript (Jest)

- Runner: `npm run test:js`
- Config: `jest.config.js`
- Layout: `tests/js/**/*.test.js`
- Current tests:
  - `dateUtils.test.js`: verifies date formatting and local day bounds
  - `markdownLintOutputs.test.js`: lints generated markdown files in the vault:
    - `GTD/dashboard.md`, `next-actions.md`, `email-tasks.md`, `waiting-for.md`, `scheduled.md`
    - `reminders/reminders.md`, `reminders/reminders_inbox.md`

## Quick Commands

```bash
# All Python tests
python run_tests.py all

# JS tests
npm run test:js
```

## Notes

- Generated markdown lint rules are tuned for machine-written content via `.markdownlint.json`.
- Prefer adding small, focused tests close to the code they validate.
