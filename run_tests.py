#!/usr/bin/env python3
"""
Test runner with auto-fix capabilities for the obs-dailynotes project
"""

import sys
import subprocess
import argparse
from pathlib import Path
import json
from datetime import datetime

class TestRunner:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.test_dir = self.project_root / "tests"
        self.fix_prompt_file = self.project_root / "fix_prompt_for_claude.md"
        
    def run_all_tests(self, verbose=False):
        """Run all tests and return results"""
        print("🧪 Running all tests...")
        print("=" * 50)
        
        cmd = ["pytest", str(self.test_dir)]
        if verbose:
            cmd.append("-v")
        else:
            cmd.append("-q")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        print(result.stdout)
        if result.stderr:
            print("Errors:", result.stderr)
        
        return result.returncode == 0
    
    def run_unit_tests(self, verbose=False):
        """Run only unit tests"""
        print("🧪 Running unit tests...")
        print("=" * 50)
        
        cmd = ["pytest", str(self.test_dir / "unit")]
        if verbose:
            cmd.append("-v")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(result.stdout)
        
        return result.returncode == 0
    
    def run_integration_tests(self, verbose=False):
        """Run only integration tests"""
        print("🧪 Running integration tests...")
        print("=" * 50)
        
        cmd = ["pytest", str(self.test_dir / "integration")]
        if verbose:
            cmd.append("-v")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(result.stdout)
        
        return result.returncode == 0
    
    def run_specific_test(self, test_path, verbose=False):
        """Run a specific test file or test case"""
        print(f"🧪 Running test: {test_path}")
        print("=" * 50)
        
        cmd = ["pytest", test_path]
        if verbose:
            cmd.append("-v")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(result.stdout)
        
        return result.returncode == 0
    
    def check_and_generate_fix_prompt(self):
        """Run all tests and generate a fix prompt for Claude Code if failures occur"""
        print("🧪 Running comprehensive test suite...")
        print("=" * 50)
        
        # Run pytest with verbose output
        cmd = ["pytest", str(self.test_dir), "-v", "--tb=short"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        print(result.stdout)
        
        if result.returncode != 0:
            # Tests failed, generate fix prompt
            self._generate_claude_fix_prompt(result.stdout, result.stderr)
            print(f"\n📝 Fix prompt generated: {self.fix_prompt_file}")
            print("   Copy the contents to Claude Code to fix the issues.")
            return False
        
        print("\n✅ All tests passed!")
        return True
    
    def _generate_claude_fix_prompt(self, stdout, stderr):
        """Generate a prompt file for Claude Code to fix issues"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        prompt = f"""# Test Failure Fix Request for Claude Code
Generated: {timestamp}

## Summary
The test suite has detected failures that need to be fixed. Please review the errors below and fix the issues.

## Test Output
```
{stdout}
```

## Errors (if any)
```
{stderr if stderr else "No stderr output"}
```

## Specific Issues to Fix

### Failed Tests
Please analyze the test failures above and:
1. Identify the root cause of each failure
2. Fix the implementation code (not the tests) to make the tests pass
3. Ensure no regression in other functionality

### Common Issues to Check
- [ ] Broken links in markdown files (run fix_broken_links.py if needed)
- [ ] Invalid person page frontmatter (standardize tags format)
- [ ] Missing required fields in frontmatter
- [ ] GTD processing logic errors
- [ ] Path resolution issues

## Suggested Fix Approach
1. Start by reading the specific test files that failed to understand what they're testing
2. Read the implementation files being tested
3. Make the necessary fixes to pass the tests
4. Run the tests again to verify: `python run_tests.py all`

## Commands to Use
- Run all tests: `python run_tests.py all -v`
- Run unit tests only: `python run_tests.py unit`
- Fix broken links: `python tools/fix_broken_links.py`
- Fix attachment links: `python tools/fix_attachment_links.py`
- Standardize person pages: `python tools/organize_switchboard.py`

Please fix these issues and ensure all tests pass.
"""
        
        self.fix_prompt_file.write_text(prompt)
    
    def check_broken_links(self):
        """Check for broken links in the vault"""
        print("🔍 Checking for broken links...")
        print("=" * 50)
        
        # Run the link checking test
        result = self.run_specific_test(
            str(self.test_dir / "unit/test_link_management.py::TestBrokenLinkDetection"),
            verbose=True
        )
        
        if not result:
            print("\n⚠️  Broken links detected!")
            self._generate_link_fix_prompt()
            return False
        
        print("✅ No broken links found!")
        return True
    
    def _generate_link_fix_prompt(self):
        """Generate a specific prompt for fixing broken links"""
        prompt = f"""# Fix Broken Links Request for Claude Code
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Issue
The link integrity tests have detected broken links in the vault.

## To Fix
Please run the following commands in order:

1. First, check what links are broken:
   ```bash
   python run_tests.py links
   ```

2. Run the automatic fix scripts:
   ```bash
   python tools/fix_broken_links.py
   python tools/fix_attachment_links.py
   ```

3. Verify the fixes:
   ```bash
   python run_tests.py links
   ```

4. If issues persist, manually review and fix remaining broken links.

## Common Link Issues
- Files moved to Resources/PDFs/ or Resources/Images/ folders
- Screenshots in Attachments folder not properly linked
- Person page references that don't exist
- Meeting note references with wrong date format
"""
        
        link_prompt_file = self.project_root / "fix_links_prompt.md"
        link_prompt_file.write_text(prompt)
        print(f"\n📝 Link fix prompt generated: {link_prompt_file}")
    
    def validate_person_pages(self):
        """Validate all person pages"""
        print("👥 Validating person pages...")
        print("=" * 50)
        
        result = self.run_specific_test(
            str(self.test_dir / "unit/test_person_pages.py::TestPersonPageValidation"),
            verbose=True
        )
        
        if not result:
            print("\n⚠️  Person page validation failed!")
            self._generate_person_fix_prompt()
            return False
        
        print("✅ All person pages valid!")
        return True
    
    def _generate_person_fix_prompt(self):
        """Generate a prompt for fixing person page issues"""
        prompt = f"""# Fix Person Pages Request for Claude Code
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Issue
Person page validation tests have failed.

## To Fix
1. Run the validation test to see specific issues:
   ```bash
   python run_tests.py people
   ```

2. Common fixes needed:
   - Standardize tags from `tags: person` to `tags: [person]`
   - Add missing required fields (name, emails array)
   - Fix invalid email formats
   - Ensure reminders.listName matches person name

3. Run the standardization script:
   ```bash
   python tools/organize_switchboard.py
   ```

4. Verify fixes:
   ```bash
   python run_tests.py people
   ```

## Person Page Template
```yaml
---
tags: [people]
name: Person Name
emails: [email@example.com]
aliases: []
reminders:
  listName: "Person Name"
---

# Person Name

## Contact
- Email: email@example.com
- Added: YYYY-MM-DD

## Notes

## Meetings

## Tasks
```
"""
        
        person_prompt_file = self.project_root / "fix_people_prompt.md"
        person_prompt_file.write_text(prompt)
        print(f"\n📝 Person page fix prompt generated: {person_prompt_file}")
    
    def run_coverage(self):
        """Run tests with coverage report"""
        print("📊 Running tests with coverage...")
        print("=" * 50)
        
        cmd = [
            "pytest",
            str(self.test_dir),
            "--cov=.",
            "--cov-report=term-missing",
            "--cov-report=html"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(result.stdout)
        
        if result.returncode == 0:
            print("\n✅ Coverage report generated in htmlcov/index.html")
        
        return result.returncode == 0
    
    def run_continuous(self):
        """Run tests in watch mode (requires pytest-watch)"""
        print("👁️  Running tests in watch mode...")
        print("Press Ctrl+C to stop")
        print("=" * 50)
        
        try:
            subprocess.run(["ptw", str(self.test_dir)])
        except KeyboardInterrupt:
            print("\n✋ Watch mode stopped")
        except FileNotFoundError:
            print("❌ pytest-watch not installed. Run: pip install pytest-watch")


def main():
    parser = argparse.ArgumentParser(description="Test runner for obs-dailynotes")
    parser.add_argument(
        "command",
        choices=["all", "unit", "integration", "links", "people", "coverage", "watch", "check"],
        help="Test command to run"
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("-t", "--test", help="Specific test path to run")
    
    args = parser.parse_args()
    
    runner = TestRunner()
    
    success = False
    
    if args.command == "all":
        success = runner.run_all_tests(args.verbose)
    elif args.command == "unit":
        success = runner.run_unit_tests(args.verbose)
    elif args.command == "integration":
        success = runner.run_integration_tests(args.verbose)
    elif args.command == "links":
        success = runner.check_broken_links()
    elif args.command == "people":
        success = runner.validate_person_pages()
    elif args.command == "coverage":
        success = runner.run_coverage()
    elif args.command == "watch":
        runner.run_continuous()
        success = True
    elif args.command == "check":
        success = runner.check_and_generate_fix_prompt()
    elif args.test:
        success = runner.run_specific_test(args.test, args.verbose)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()