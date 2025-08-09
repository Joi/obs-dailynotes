# Testing Documentation for obs-dailynotes

## Overview

This project uses a comprehensive testing framework built on pytest to ensure code quality, prevent regressions, and validate data integrity across the Obsidian vault. The testing system includes unit tests, integration tests, and automated fix generation for common issues.

## Quick Start

### Installation

```bash
# Install testing dependencies
pip install pytest pytest-cov pytest-watch pytest-json-report pyyaml

# Run all tests
python run_tests.py all

# Check for issues and generate fix prompts
python run_tests.py check
```

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── unit/                    # Unit tests for individual components
│   ├── test_link_management.py     # Link extraction, updating, and validation
│   ├── test_person_pages.py        # Person page structure and validation
│   └── test_gtd_processing.py      # GTD methodology and reminder processing
└── integration/             # Integration tests for complete workflows
    └── test_daily_notes_generation.py  # End-to-end daily note creation
```

## Test Commands

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `all` | Run all tests | `python run_tests.py all` |
| `unit` | Run unit tests only | `python run_tests.py unit` |
| `integration` | Run integration tests only | `python run_tests.py integration` |
| `check` | Run tests and generate fix prompt if failures | `python run_tests.py check` |

### Specialized Commands

| Command | Description | Example |
|---------|-------------|---------|
| `links` | Check for broken links | `python run_tests.py links` |
| `people` | Validate person pages | `python run_tests.py people` |
| `coverage` | Run with coverage report | `python run_tests.py coverage` |
| `watch` | Continuous test mode | `python run_tests.py watch` |

### Options

- `-v, --verbose`: Verbose output showing individual test results
- `-t, --test PATH`: Run specific test file or test case

### Examples

```bash
# Run all tests with verbose output
python run_tests.py all -v

# Run specific test class
python run_tests.py -t tests/unit/test_link_management.py::TestLinkExtraction

# Run specific test method
python run_tests.py -t tests/unit/test_person_pages.py::TestPersonPageFrontmatter::test_parse_valid_frontmatter

# Check and generate fix prompt for Claude Code
python run_tests.py check
```

## Test Categories

### 1. Link Management Tests (`test_link_management.py`)

Tests for link integrity and management across the vault.

**Test Classes:**
- `TestLinkExtraction`: Extract wikilinks and markdown links from content
- `TestLinkUpdating`: Update links when files move
- `TestBrokenLinkDetection`: Find broken links in vault
- `TestLinkHelpers`: Utility functions for link management

**What's Tested:**
- Wikilink format: `[[Page Name]]` and `![[image.png]]`
- Markdown links: `[text](url)` and `![alt](image.png)`
- Link updates when files move to Resources folders
- Detection of broken references
- Path normalization

### 2. Person Page Tests (`test_person_pages.py`)

Tests for person page structure, validation, and generation.

**Test Classes:**
- `TestPersonPageFrontmatter`: YAML frontmatter parsing and validation
- `TestPersonPageContent`: Extract emails and references from content
- `TestPersonPageGeneration`: Create new person pages from templates
- `TestPersonPageIndex`: Build and search person index
- `TestPersonPageValidation`: Validate page structure and data

**What's Tested:**
- Frontmatter structure with tags, name, emails, aliases
- Email extraction and validation
- Tag standardization (`tags: people` → `tags: [people]`)
- Duplicate person detection and merging
- Meeting and task references

### 3. GTD Processing Tests (`test_gtd_processing.py`)

Tests for Getting Things Done methodology implementation.

**Test Classes:**
- `TestGTDTagParsing`: Parse GTD tags (#inbox, #next, #waiting, #someday)
- `TestReminderProcessing`: Process Apple Reminders data
- `TestGTDViews`: Generate GTD views and reports
- `TestGTDIntegration`: Integration with daily notes
- `TestGTDHelpers`: Utility functions

**What's Tested:**
- Tag extraction: `#next`, `#waiting`, etc.
- Context parsing: `@home`, `@office`, `@computer`
- Priority markers: `!!` (high), `!` (medium)
- Reminder categorization by GTD status
- Due date formatting and sorting
- Weekly review metrics

### 4. Integration Tests (`test_daily_notes_generation.py`)

End-to-end tests for complete workflows.

**Test Classes:**
- `TestDailyNoteGeneration`: Daily note creation with meetings
- `TestRemindersIntegration`: Apple Reminders sync
- `TestPeopleGeneration`: Auto-generate person pages
- `TestEndToEndWorkflow`: Complete daily workflow

**What's Tested:**
- Calendar event filtering and parsing
- Meeting link extraction (Zoom, Google Meet)
- Attendee formatting with wikilinks
- Reminder pulling and syncing
- Person page creation from daily notes

## Fixtures (in `conftest.py`)

Reusable test data and utilities:

| Fixture | Description |
|---------|-------------|
| `temp_vault` | Creates temporary vault structure with standard folders |
| `sample_person_page` | Example person page with complete frontmatter |
| `sample_daily_note` | Daily note with meetings, tasks, and references |
| `sample_reminders_cache` | Mock reminders data in cache format |
| `mock_reminders_cli` | Mock subprocess calls to reminders-cli |
| `sample_config` | Configuration for testing |

## Automated Fix Generation

When tests fail, the system can generate fix prompts for Claude Code:

### 1. General Fix Prompt (`fix_prompt_for_claude.md`)

Generated when running `python run_tests.py check`:
- Contains full test output and errors
- Lists specific issues to fix
- Provides suggested fix approach
- Includes relevant commands

### 2. Link Fix Prompt (`fix_links_prompt.md`)

Generated when link tests fail:
- Instructions to run link fix scripts
- Common link issue patterns
- Verification steps

### 3. Person Page Fix Prompt (`fix_people_prompt.md`)

Generated when person page validation fails:
- Tag standardization instructions
- Required field specifications
- Person page template
- Fix commands

## Writing New Tests

### Test Naming Conventions

- Test files: `test_<feature>.py`
- Test classes: `Test<Feature>` (e.g., `TestLinkManagement`)
- Test methods: `test_<specific_behavior>` (e.g., `test_extract_wikilinks`)

### Example Test Structure

```python
import pytest
from pathlib import Path

class TestNewFeature:
    """Test description"""
    
    def test_basic_functionality(self):
        """Test basic feature behavior"""
        # Arrange
        input_data = "test data"
        
        # Act
        result = process_data(input_data)
        
        # Assert
        assert result == expected_value
    
    def test_edge_case(self, temp_vault):
        """Test edge cases using fixtures"""
        # Use fixtures for complex setup
        test_file = temp_vault / "test.md"
        test_file.write_text("content")
        
        # Test behavior
        assert test_file.exists()
```

### Using Fixtures

```python
def test_with_person_page(sample_person_page):
    """Test using sample person page fixture"""
    assert "tags: [people]" in sample_person_page
    assert "John Smith" in sample_person_page

def test_with_vault(temp_vault):
    """Test using temporary vault"""
    people_dir = temp_vault / "People"
    assert people_dir.exists()
```

## Coverage Reports

Generate coverage reports to identify untested code:

```bash
# Generate terminal and HTML coverage reports
python run_tests.py coverage

# View HTML report
open htmlcov/index.html
```

The coverage report shows:
- Line coverage percentage
- Uncovered lines in each file
- Branch coverage information

## Continuous Testing

For development, use watch mode to automatically run tests on file changes:

```bash
# Install pytest-watch
pip install pytest-watch

# Run in watch mode
python run_tests.py watch
```

## Common Test Scenarios

### 1. After Moving Files

```bash
# Check for broken links
python run_tests.py links

# If broken, generate fix prompt
python run_tests.py check
```

### 2. After Adding Person Pages

```bash
# Validate person page structure
python run_tests.py people
```

### 3. After Modifying GTD Logic

```bash
# Run GTD-specific tests
python run_tests.py -t tests/unit/test_gtd_processing.py
```

### 4. Before Committing

```bash
# Run all tests
python run_tests.py all

# If failures, generate fix prompt
python run_tests.py check
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure project paths are correctly added to sys.path in test files
2. **Fixture Not Found**: Check that fixtures are defined in conftest.py
3. **Path Issues**: Use absolute paths or Path objects for file operations
4. **YAML Parse Errors**: Validate frontmatter format in person pages

### Debug Tips

- Use `-v` flag for verbose output
- Add `pytest.set_trace()` for debugging
- Check test isolation (tests shouldn't depend on each other)
- Verify fixture cleanup in temp directories

## CI/CD Integration

To integrate with GitHub Actions or other CI systems:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-cov
    - name: Run tests
      run: python run_tests.py all -v
```

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on others
2. **Use Fixtures**: Leverage fixtures for common setup and teardown
3. **Test Edge Cases**: Include tests for empty inputs, None values, and errors
4. **Descriptive Names**: Use clear, descriptive test names that explain what's being tested
5. **Small Tests**: Keep tests focused on single behaviors
6. **Fast Tests**: Unit tests should run quickly; use mocks for external dependencies
7. **Regular Runs**: Run tests frequently during development
8. **Fix Immediately**: Address test failures as soon as they occur

## Contributing Tests

When adding new features:

1. Write tests first (TDD approach) or immediately after implementation
2. Ensure tests cover both happy path and error cases
3. Run full test suite before committing
4. Update this documentation if adding new test categories

## Future Enhancements

Planned testing improvements:

- [ ] Performance benchmarks for large vaults
- [ ] Mutation testing to verify test effectiveness
- [ ] Visual regression tests for generated markdown
- [ ] API mocking for Google Calendar integration
- [ ] Automated test generation from usage patterns
- [ ] Integration with Obsidian plugin testing framework