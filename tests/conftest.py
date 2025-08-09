"""
Pytest configuration and shared fixtures for all tests
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime, date

# Add parent directory to path so we can import our modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / 'tools'))

@pytest.fixture
def temp_vault(tmp_path):
    """Create a temporary vault structure for testing"""
    vault = tmp_path / "test_vault"
    vault.mkdir()
    
    # Create standard directories
    (vault / "People").mkdir()
    (vault / "dailynote").mkdir()
    (vault / "Resources" / "PDFs").mkdir(parents=True)
    (vault / "Resources" / "Images").mkdir(parents=True)
    (vault / "Resources" / "Templates").mkdir(parents=True)
    (vault / "Meetings" / "2025").mkdir(parents=True)
    (vault / "GTD").mkdir()
    (vault / "reminders").mkdir()
    (vault / "Attachments").mkdir()
    
    return vault

@pytest.fixture
def sample_person_page():
    """Sample person page content"""
    return """---
tags: [people]
name: John Smith
emails: [john@example.com, jsmith@company.org]
aliases: [John, J. Smith]
reminders:
  listName: "John Smith"
---

# John Smith

## Contact
- Email: john@example.com
- Added: 2025-01-01

## Notes
- Met at conference
"""

@pytest.fixture
def sample_daily_note():
    """Sample daily note content"""
    return """---
date: 2025-08-09
---

[[2025-08-08]] << Previous | Next >> [[2025-08-10]]

## To Do Today
![[reminders/todo-today.md]]

## Meetings

### Strategy Meeting #mtg
- 14:00 - 15:00 ([[John Smith]], [[Jane Doe]])
- [Call Link](https://meet.google.com/abc-defg-hij)
- Agenda for [[John Smith]]:
  - [ ] Discuss Q4 goals
  - [ ] Review budget

## Notes
Met with [[John Smith]] (john@example.com) about the project.
Reference: ![[document.pdf]] and ![[Screenshot 2025-08-09.png]]
"""

@pytest.fixture
def sample_reminders_cache():
    """Sample reminders cache data"""
    return {
        "byList": {
            "Inbox": [
                {
                    "id": "123-456",
                    "title": "Review document #email @computer !!",
                    "list": "Inbox",
                    "notes": "",
                    "flagged": False,
                    "priority": 0,
                    "due": "2025-08-09T15:00:00Z",
                    "completed": False
                },
                {
                    "id": "789-012",
                    "title": "Call client #waiting",
                    "list": "Inbox",
                    "notes": "",
                    "flagged": False,
                    "priority": 0,
                    "due": None,
                    "completed": False
                }
            ],
            "John Smith": [
                {
                    "id": "345-678",
                    "title": "Discuss project timeline",
                    "list": "John Smith",
                    "notes": "",
                    "flagged": False,
                    "priority": 0,
                    "due": None,
                    "completed": False
                }
            ]
        }
    }

@pytest.fixture
def mock_reminders_cli(monkeypatch, sample_reminders_cache):
    """Mock the reminders CLI commands"""
    import subprocess
    
    def mock_run(*args, **kwargs):
        cmd = args[0] if args else kwargs.get('args', [])
        
        if 'reminders' in str(cmd) and 'show-lists' in str(cmd):
            return subprocess.CompletedProcess(
                cmd, 0, 
                stdout='\n'.join(sample_reminders_cache['byList'].keys()),
                stderr=''
            )
        elif 'reminders' in str(cmd) and 'show' in str(cmd):
            # Return JSON format
            return subprocess.CompletedProcess(
                cmd, 0,
                stdout=json.dumps(list(sample_reminders_cache['byList']['Inbox'])),
                stderr=''
            )
        else:
            return subprocess.CompletedProcess(cmd, 0, '', '')
    
    monkeypatch.setattr(subprocess, 'run', mock_run)
    return sample_reminders_cache

@pytest.fixture
def sample_config():
    """Sample configuration for testing"""
    return {
        "DAILY_NOTE_PATH": "/tmp/test_vault/dailynote",
        "GCAL_TOKEN_PATH": "/tmp/test_token.json",
        "GCAL_CREDS_PATH": "/tmp/test_creds.json",
        "EVENTS_FILTER": "Test Event"
    }