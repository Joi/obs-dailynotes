# Testing

This project uses pytest. Tests help catch regressions and keep the vault healthy.

## Who this is for
- Developers and power users who want to verify behavior before changes

## Quick start
```bash
# Install test deps (in a virtualenv)
pip install -r requirements-test.txt

# Run everything
python run_tests.py all

# If something fails, generate a fix prompt
python run_tests.py check
```

## Common commands
- `python run_tests.py unit`: unit tests only
- `python run_tests.py integration`: integration tests only
- `python run_tests.py links`: check for broken links
- `python run_tests.py people`: validate person pages
- `python run_tests.py coverage`: coverage report
- `python run_tests.py watch`: re-run tests on file changes

## Layout
```
tests/
  unit/           # small, focused tests
  integration/    # end-to-end workflows
  conftest.py     # fixtures
  js/             # JavaScript unit and lint tests
  SUMMARY.md      # Concise overview of all tests
```

## Tips
- Run tests before committing
- Use temp fixtures to avoid touching the real vault
- Prefer small tests that check one behavior
- For debugging: add `-v` and `pytest.set_trace()`

## JS tests

- Install dev deps (once): `npm install`
- Run: `npm run test:js`

See `tests/SUMMARY.md` for an overview of all tests.

## CI (optional)
You can run `python run_tests.py all -v` and `npm run test:js` in GitHub Actions or any CI runner to gate changes.