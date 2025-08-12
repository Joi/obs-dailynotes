"""
Unit tests for person page management
"""

import pytest
import json
import yaml
from pathlib import Path
import sys
import re

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'tools'))


class TestPersonPageFrontmatter:
    """Test person page frontmatter handling"""
    
    def test_parse_valid_frontmatter(self):
        """Test parsing valid person page frontmatter"""
        content = """---
tags: [person]
name: John Smith
emails: [john@example.com, jsmith@company.org]
aliases: [John, J. Smith]
reminders:
  listName: "John Smith"
---

# John Smith
"""
        
        # Extract frontmatter
        match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        assert match is not None
        
        frontmatter_text = match.group(1)
        
        # Parse YAML
        import yaml
        fm = yaml.safe_load(frontmatter_text)
        
        assert fm['tags'] == ['person']
        assert fm['name'] == 'John Smith'
        assert fm['emails'] == ['john@example.com', 'jsmith@company.org']
        assert fm['aliases'] == ['John', 'J. Smith']
        assert fm['reminders']['listName'] == 'John Smith'
    
    def test_standardize_tags_format(self):
        """Test standardizing tags from string to array"""
        content = """---
tags: person
name: John Smith
---"""
        
        # Standardize tags
        standardized = re.sub(
            r'^tags: person$',
            'tags: [person]',
            content,
            flags=re.MULTILINE
        )
        
        assert 'tags: [person]' in standardized
        assert 'tags: person' not in standardized
    
    def test_extract_emails_from_frontmatter(self):
        """Test extracting emails from frontmatter"""
        content = """---
tags: [person]
emails: 
  - john@example.com
  - jsmith@company.org
  - john.smith@another.com
---"""
        
        match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        fm_text = match.group(1)
        fm = yaml.safe_load(fm_text)
        
        emails = fm.get('emails', [])
        assert len(emails) == 3
        assert 'john@example.com' in emails
        assert 'jsmith@company.org' in emails
        assert 'john.smith@another.com' in emails
    
    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        content = """---
tags: [person]
---"""
        
        match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        fm_text = match.group(1)
        fm = yaml.safe_load(fm_text)
        
        # Check for missing fields
        assert 'name' not in fm
        assert 'emails' not in fm
        assert fm.get('emails', []) == []


class TestPersonPageContent:
    """Test person page content extraction"""
    
    def test_extract_emails_from_content(self):
        """Test extracting emails from page content"""
        content = """
# John Smith

Contact: john@example.com
Alternative email: j.smith@work.org
Personal: johnsmith+personal@gmail.com
"""
        
        # Email regex pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, content)
        
        assert 'john@example.com' in emails
        assert 'j.smith@work.org' in emails
        assert 'johnsmith+personal@gmail.com' in emails
        assert len(emails) == 3
    
    def test_extract_meeting_references(self):
        """Test extracting meeting references from person pages"""
        content = """
# John Smith

## Meetings

- [[2025-01-15-1400|Strategy Meeting]]
- [[2025-02-01-1000|Budget Review]]
- See also: [[2025-03-01-0900]]
"""
        
        # Pattern for meeting references (YYYY-MM-DD-HHMM format)
        meeting_pattern = r'\[\[(\d{4}-\d{2}-\d{2}-\d{4})[^\]]*\]\]'
        meetings = re.findall(meeting_pattern, content)
        
        assert '2025-01-15-1400' in meetings
        assert '2025-02-01-1000' in meetings
        assert '2025-03-01-0900' in meetings
        assert len(meetings) == 3
    
    def test_extract_reminder_references(self):
        """Test extracting reminder references"""
        content = """
## Tasks for John

- [ ] Review contract #next
- [ ] Send proposal #waiting
- [x] Initial meeting #done
"""
        
        # Extract task lines
        task_pattern = r'- \[([ x])\] (.+?)(?:#(\w+))?$'
        tasks = re.findall(task_pattern, content, re.MULTILINE)
        
        assert len(tasks) == 3
        assert tasks[0] == (' ', 'Review contract ', 'next')
        assert tasks[1] == (' ', 'Send proposal ', 'waiting')
        assert tasks[2] == ('x', 'Initial meeting ', 'done')


class TestPersonPageGeneration:
    """Test person page generation from daily notes"""
    
    def test_create_person_page_from_template(self):
        """Test creating a new person page from template"""
        name = "Jane Doe"
        email = "jane@example.com"
        
        template = f"""---
tags: [people]
name: {name}
emails: [{email}]
aliases: []
reminders:
  listName: "{name}"
---

# {name}

## Contact
- Email: {email}
- Added: 2025-08-09

## Notes

## Meetings

## Tasks
"""
        
        assert f'name: {name}' in template
        assert f'emails: [{email}]' in template
        assert f'# {name}' in template
        assert f'listName: "{name}"' in template
    
    def test_merge_duplicate_person_info(self):
        """Test merging information from duplicate person pages"""
        person1 = {
            'name': 'John Smith',
            'emails': ['john@example.com'],
            'aliases': ['John']
        }
        
        person2 = {
            'name': 'John Smith',
            'emails': ['jsmith@company.org'],
            'aliases': ['J. Smith']
        }
        
        # Merge function
        def merge_person_data(p1, p2):
            merged = {
                'name': p1['name'],
                'emails': list(set(p1.get('emails', []) + p2.get('emails', []))),
                'aliases': list(set(p1.get('aliases', []) + p2.get('aliases', [])))
            }
            return merged
        
        merged = merge_person_data(person1, person2)
        
        assert merged['name'] == 'John Smith'
        assert len(merged['emails']) == 2
        assert 'john@example.com' in merged['emails']
        assert 'jsmith@company.org' in merged['emails']
        assert len(merged['aliases']) == 2
        assert 'John' in merged['aliases']
        assert 'J. Smith' in merged['aliases']


class TestPersonPageIndex:
    """Test person page indexing and search"""
    
    def test_build_person_index(self, temp_vault):
        """Test building an index of all person pages"""
        # Create some person pages
        people_dir = temp_vault / "People"
        people_dir.mkdir(exist_ok=True)
        
        # Person 1
        (people_dir / "John Smith.md").write_text("""---
tags: [person]
name: John Smith
emails: [john@example.com]
---""")
        
        # Person 2
        (people_dir / "Jane Doe.md").write_text("""---
tags: [person]
name: Jane Doe
emails: [jane@example.com]
---""")
        
        # Build index
        index = {}
        for person_file in people_dir.glob("*.md"):
            content = person_file.read_text()
            match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
            if match:
                fm = yaml.safe_load(match.group(1))
                if 'person' in fm.get('tags', []):
                    name = fm.get('name', person_file.stem)
                    index[name] = {
                        'file': person_file.name,
                        'emails': fm.get('emails', []),
                        'aliases': fm.get('aliases', [])
                    }
        
        assert 'John Smith' in index
        assert 'Jane Doe' in index
        assert index['John Smith']['emails'] == ['john@example.com']
        assert index['Jane Doe']['emails'] == ['jane@example.com']
    
    def test_find_person_by_email(self):
        """Test finding a person page by email address"""
        index = {
            'John Smith': {
                'file': 'John Smith.md',
                'emails': ['john@example.com', 'jsmith@work.org']
            },
            'Jane Doe': {
                'file': 'Jane Doe.md',
                'emails': ['jane@example.com']
            }
        }
        
        def find_by_email(email, index):
            for name, data in index.items():
                if email in data.get('emails', []):
                    return name
            return None
        
        assert find_by_email('john@example.com', index) == 'John Smith'
        assert find_by_email('jsmith@work.org', index) == 'John Smith'
        assert find_by_email('jane@example.com', index) == 'Jane Doe'
        assert find_by_email('unknown@example.com', index) is None
    
    def test_find_person_by_alias(self):
        """Test finding a person page by alias"""
        index = {
            'John Smith': {
                'file': 'John Smith.md',
                'aliases': ['John', 'J. Smith', 'JSmith']
            },
            'Jane Doe': {
                'file': 'Jane Doe.md',
                'aliases': ['Jane', 'J. Doe']
            }
        }
        
        def find_by_alias(alias, index):
            for name, data in index.items():
                if alias in data.get('aliases', []):
                    return name
            return None
        
        assert find_by_alias('John', index) == 'John Smith'
        assert find_by_alias('J. Smith', index) == 'John Smith'
        assert find_by_alias('Jane', index) == 'Jane Doe'
        assert find_by_alias('Bob', index) is None


class TestPersonPageValidation:
    """Test validation of person pages"""
    
    def test_validate_email_format(self):
        """Test email format validation"""
        def is_valid_email(email):
            pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
            return re.match(pattern, email) is not None
        
        assert is_valid_email('john@example.com')
        assert is_valid_email('john.smith+tag@company.org')
        assert is_valid_email('user123@sub.domain.com')
        assert not is_valid_email('invalid.email')
        assert not is_valid_email('@example.com')
        assert not is_valid_email('user@')
        assert not is_valid_email('user@.com')
    
    def test_validate_person_page_structure(self):
        """Test validation of person page structure"""
        def validate_person_page(content):
            errors = []
            
            # Check for frontmatter
            if not content.startswith('---'):
                errors.append('Missing frontmatter')
            
            # Extract frontmatter
            match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
            if match:
                try:
                    fm = yaml.safe_load(match.group(1))
                    
                    # Check required fields
                    if 'tags' not in fm:
                        errors.append('Missing tags field')
                    elif 'person' not in fm.get('tags', []):
                        errors.append('Missing people tag')
                    
                    if 'name' not in fm:
                        errors.append('Missing name field')
                    
                    # Check field types
                    if 'emails' in fm and not isinstance(fm['emails'], list):
                        errors.append('emails should be a list')
                    
                    if 'aliases' in fm and not isinstance(fm['aliases'], list):
                        errors.append('aliases should be a list')
                except yaml.YAMLError:
                    errors.append('Invalid YAML in frontmatter')
            
            return errors
        
        # Valid page
        valid_content = """---
tags: [person]
name: John Smith
emails: [john@example.com]
---"""
        assert validate_person_page(valid_content) == []
        
        # Missing frontmatter
        invalid_content1 = "# John Smith"
        errors1 = validate_person_page(invalid_content1)
        assert 'Missing frontmatter' in errors1
        
        # Missing people tag
        invalid_content2 = """---
tags: [note]
name: John Smith
---"""
        errors2 = validate_person_page(invalid_content2)
        assert 'Missing people tag' in errors2
        
        # Wrong field type
        invalid_content3 = """---
tags: [person]
name: John Smith
emails: "john@example.com"
---"""
        errors3 = validate_person_page(invalid_content3)
        assert 'emails should be a list' in errors3