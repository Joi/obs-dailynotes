"""
Unit tests for GTD (Getting Things Done) processing
"""

import pytest
import json
from pathlib import Path
import sys
import re
from datetime import datetime, timedelta

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'tools'))


class TestGTDTagParsing:
    """Test parsing of GTD tags and contexts"""
    
    def test_parse_gtd_tags(self):
        """Test extraction of GTD tags from task text"""
        tasks = [
            ("Review document #inbox", ["inbox"]),
            ("Call client #next #waiting", ["next", "waiting"]),
            ("Plan vacation #someday", ["someday"]),
            ("Fix bug #next #urgent", ["next", "urgent"]),
            ("Read book", [])
        ]
        
        for task_text, expected_tags in tasks:
            # Extract tags
            tags = re.findall(r'#(\w+)', task_text)
            assert tags == expected_tags
    
    def test_parse_contexts(self):
        """Test extraction of GTD contexts"""
        tasks = [
            ("Review document @computer", ["computer"]),
            ("Call client @phone @office", ["phone", "office"]),
            ("Buy groceries @errands", ["errands"]),
            ("Think about strategy @anywhere", ["anywhere"]),
            ("Regular task", [])
        ]
        
        for task_text, expected_contexts in tasks:
            # Extract contexts
            contexts = re.findall(r'@(\w+)', task_text)
            assert contexts == expected_contexts
    
    def test_parse_priority_markers(self):
        """Test extraction of priority markers"""
        tasks = [
            ("Review document !!", "high"),
            ("Call client !", "medium"),
            ("Regular task", "normal"),
            ("Urgent fix !! !", "high"),  # Multiple markers, take highest
        ]
        
        for task_text, expected_priority in tasks:
            # Determine priority
            if '!!' in task_text:
                priority = "high"
            elif '!' in task_text:
                priority = "medium"
            else:
                priority = "normal"
            
            assert priority == expected_priority
    
    def test_parse_combined_metadata(self):
        """Test parsing task with all metadata types"""
        task = "Review contract #next @office !! [[John Smith]]"
        
        # Extract all metadata
        tags = re.findall(r'#(\w+)', task)
        contexts = re.findall(r'@(\w+)', task)
        people = re.findall(r'\[\[([^\]]+)\]\]', task)
        priority = "high" if '!!' in task else "medium" if '!' in task else "normal"
        
        assert tags == ['next']
        assert contexts == ['office']
        assert people == ['John Smith']
        assert priority == 'high'


class TestReminderProcessing:
    """Test processing of Apple Reminders data"""
    
    def test_process_reminder_from_cache(self):
        """Test processing a reminder from cache format"""
        reminder = {
            "id": "123-456",
            "title": "Review document #next @computer !!",
            "list": "Inbox",
            "notes": "Check sections 3 and 4",
            "flagged": False,
            "priority": 0,
            "due": "2025-08-10T15:00:00Z",
            "completed": False
        }
        
        # Process reminder
        processed = {
            'id': reminder['id'],
            'title': reminder['title'].replace('#next', '').replace('@computer', '').replace('!!', '').strip(),
            'list': reminder['list'],
            'notes': reminder['notes'],
            'tags': re.findall(r'#(\w+)', reminder['title']),
            'contexts': re.findall(r'@(\w+)', reminder['title']),
            'priority': 'high' if '!!' in reminder['title'] else 'medium' if '!' in reminder['title'] else 'normal',
            'due': reminder['due'],
            'completed': reminder['completed']
        }
        
        assert processed['title'] == 'Review document'
        assert processed['tags'] == ['next']
        assert processed['contexts'] == ['computer']
        assert processed['priority'] == 'high'
        assert processed['due'] == "2025-08-10T15:00:00Z"
    
    def test_categorize_by_gtd_status(self):
        """Test categorizing reminders by GTD status"""
        reminders = [
            {"title": "Task 1 #inbox", "completed": False},
            {"title": "Task 2 #next", "completed": False},
            {"title": "Task 3 #waiting", "completed": False},
            {"title": "Task 4 #someday", "completed": False},
            {"title": "Task 5", "completed": True},
            {"title": "Task 6", "completed": False}
        ]
        
        # Categorize
        categories = {
            'inbox': [],
            'next': [],
            'waiting': [],
            'someday': [],
            'no_tag': [],
            'completed': []
        }
        
        for reminder in reminders:
            if reminder['completed']:
                categories['completed'].append(reminder)
            elif '#inbox' in reminder['title']:
                categories['inbox'].append(reminder)
            elif '#next' in reminder['title']:
                categories['next'].append(reminder)
            elif '#waiting' in reminder['title']:
                categories['waiting'].append(reminder)
            elif '#someday' in reminder['title']:
                categories['someday'].append(reminder)
            else:
                categories['no_tag'].append(reminder)
        
        assert len(categories['inbox']) == 1
        assert len(categories['next']) == 1
        assert len(categories['waiting']) == 1
        assert len(categories['someday']) == 1
        assert len(categories['no_tag']) == 1
        assert len(categories['completed']) == 1
    
    def test_filter_by_context(self):
        """Test filtering tasks by context"""
        tasks = [
            {"title": "Task 1 @home", "contexts": ["home"]},
            {"title": "Task 2 @office", "contexts": ["office"]},
            {"title": "Task 3 @home @computer", "contexts": ["home", "computer"]},
            {"title": "Task 4", "contexts": []},
        ]
        
        # Filter for @home context
        home_tasks = [t for t in tasks if "home" in t.get("contexts", [])]
        assert len(home_tasks) == 2
        
        # Filter for @office context
        office_tasks = [t for t in tasks if "office" in t.get("contexts", [])]
        assert len(office_tasks) == 1
        
        # Filter for @computer context
        computer_tasks = [t for t in tasks if "computer" in t.get("contexts", [])]
        assert len(computer_tasks) == 1
    
    def test_sort_by_due_date(self):
        """Test sorting tasks by due date"""
        now = datetime.now()
        tasks = [
            {"title": "Task 1", "due": (now + timedelta(days=2)).isoformat()},
            {"title": "Task 2", "due": None},
            {"title": "Task 3", "due": (now - timedelta(days=1)).isoformat()},
            {"title": "Task 4", "due": (now + timedelta(days=1)).isoformat()},
        ]
        
        # Sort with None values at end
        def sort_key(task):
            if task['due'] is None:
                return datetime.max
            return datetime.fromisoformat(task['due'].replace('Z', '+00:00'))
        
        sorted_tasks = sorted(tasks, key=sort_key)
        
        assert sorted_tasks[0]['title'] == 'Task 3'  # Overdue
        assert sorted_tasks[1]['title'] == 'Task 4'  # Tomorrow
        assert sorted_tasks[2]['title'] == 'Task 1'  # In 2 days
        assert sorted_tasks[3]['title'] == 'Task 2'  # No due date


class TestGTDViews:
    """Test generation of GTD views and reports"""
    
    def test_generate_inbox_view(self):
        """Test generating inbox processing view"""
        inbox_tasks = [
            {"title": "Review document", "id": "1"},
            {"title": "Call client", "id": "2"},
            {"title": "Plan meeting", "id": "3"}
        ]
        
        # Generate markdown view
        lines = ["## Inbox Processing", ""]
        for task in inbox_tasks:
            lines.append(f"- [ ] {task['title']} (id:{task['id']})")
        
        view = "\n".join(lines)
        
        assert "## Inbox Processing" in view
        assert "- [ ] Review document" in view
        assert "- [ ] Call client" in view
        assert "- [ ] Plan meeting" in view
    
    def test_generate_next_actions_by_context(self):
        """Test generating next actions grouped by context"""
        next_actions = [
            {"title": "Review document", "contexts": ["computer"]},
            {"title": "Call client", "contexts": ["phone"]},
            {"title": "Write report", "contexts": ["computer"]},
            {"title": "Buy supplies", "contexts": ["errands"]},
        ]
        
        # Group by context
        by_context = {}
        for task in next_actions:
            for context in task.get('contexts', ['no-context']):
                if context not in by_context:
                    by_context[context] = []
                by_context[context].append(task)
        
        # Generate view
        lines = ["## Next Actions by Context", ""]
        for context in sorted(by_context.keys()):
            lines.append(f"### @{context}")
            for task in by_context[context]:
                lines.append(f"- [ ] {task['title']}")
            lines.append("")
        
        view = "\n".join(lines)
        
        assert "### @computer" in view
        assert "### @phone" in view
        assert "### @errands" in view
        assert view.count("Review document") == 1
        assert view.count("Write report") == 1
    
    def test_generate_waiting_for_view(self):
        """Test generating waiting for list"""
        waiting_tasks = [
            {"title": "Contract from lawyer", "person": "John Smith", "date_added": "2025-08-01"},
            {"title": "Budget approval", "person": "Jane Doe", "date_added": "2025-08-05"},
            {"title": "Feedback on proposal", "person": None, "date_added": "2025-08-07"}
        ]
        
        # Generate view
        lines = ["## Waiting For", ""]
        for task in waiting_tasks:
            person = f"[[{task['person']}]]" if task['person'] else "someone"
            lines.append(f"- [ ] {task['title']} (from {person}, since {task['date_added']})")
        
        view = "\n".join(lines)
        
        assert "## Waiting For" in view
        assert "[[John Smith]]" in view
        assert "[[Jane Doe]]" in view
        assert "(from someone" in view
    
    def test_generate_weekly_review_metrics(self):
        """Test generating metrics for weekly review"""
        tasks = [
            {"status": "completed", "completed_date": "2025-08-05"},
            {"status": "completed", "completed_date": "2025-08-06"},
            {"status": "completed", "completed_date": "2025-08-07"},
            {"status": "inbox"},
            {"status": "inbox"},
            {"status": "next"},
            {"status": "next"},
            {"status": "next"},
            {"status": "waiting"},
            {"status": "someday"},
        ]
        
        # Calculate metrics
        metrics = {
            'completed_this_week': len([t for t in tasks if t.get('status') == 'completed']),
            'inbox_count': len([t for t in tasks if t.get('status') == 'inbox']),
            'next_count': len([t for t in tasks if t.get('status') == 'next']),
            'waiting_count': len([t for t in tasks if t.get('status') == 'waiting']),
            'someday_count': len([t for t in tasks if t.get('status') == 'someday']),
            'total_active': len([t for t in tasks if t.get('status') != 'completed'])
        }
        
        assert metrics['completed_this_week'] == 3
        assert metrics['inbox_count'] == 2
        assert metrics['next_count'] == 3
        assert metrics['waiting_count'] == 1
        assert metrics['someday_count'] == 1
        assert metrics['total_active'] == 7


class TestGTDIntegration:
    """Test GTD integration with daily notes"""
    
    def test_insert_gtd_into_daily_note(self):
        """Test inserting GTD content into daily note"""
        daily_note = """---
date: 2025-08-09
---

## To Do Today

## Notes
"""
        
        gtd_content = """### Next Actions
- [ ] Review document
- [ ] Call client"""
        
        # Insert after "## To Do Today"
        lines = daily_note.split('\n')
        insert_index = None
        for i, line in enumerate(lines):
            if line.strip() == '## To Do Today':
                insert_index = i + 1
                break
        
        if insert_index:
            lines.insert(insert_index, '')
            lines.insert(insert_index + 1, gtd_content)
        
        updated = '\n'.join(lines)
        
        assert '### Next Actions' in updated
        assert '- [ ] Review document' in updated
        assert updated.index('## To Do Today') < updated.index('### Next Actions')
        assert updated.index('### Next Actions') < updated.index('## Notes')
    
    def test_auto_link_people_in_titles(self, tmp_path):
        """People names in task titles become wikilinks using people.index.json"""
        # Create a minimal people index
        people_index = {
            "John Smith": {"name": "John Smith", "aliases": ["John"], "emails": ["john@example.com"], "pagePath": "John Smith.md"}
        }
        # Write to a temporary vault root next to a fake dailynote path
        vault = tmp_path / 'vault'
        (vault / 'dailynote').mkdir(parents=True)
        (vault / 'people.index.json').write_text(json.dumps(people_index))
        # Point env so processor looks in this vault
        import os
        os.environ['DAILY_NOTE_PATH'] = str(vault / 'dailynote')

        from tools.processGTD import categorizeReminders
        reminders = [
            {
                'id': '1',
                'name': 'Call John Smith about contract #next',
                'list': 'Inbox',
                'notes': '',
                'flagged': False,
                'priority': 0,
                'dueDate': None,
                'completed': False,
            }
        ]
        cats = categorizeReminders(reminders)
        # Should appear in nextActions and have wikilinked title
        assert any('[[John Smith]]' in t['title'] for t in cats['nextActions'])
    
    def test_extract_person_tasks(self):
        """Test extracting tasks related to specific people"""
        tasks = [
            {"title": "Review contract with [[John Smith]]", "people": ["John Smith"]},
            {"title": "Call [[Jane Doe]] about project", "people": ["Jane Doe"]},
            {"title": "Meeting with [[John Smith]] and [[Jane Doe]]", "people": ["John Smith", "Jane Doe"]},
            {"title": "Send report", "people": []},
        ]
        
        # Extract tasks for John Smith
        john_tasks = [t for t in tasks if "John Smith" in t.get("people", [])]
        assert len(john_tasks) == 2
        
        # Extract tasks for Jane Doe
        jane_tasks = [t for t in tasks if "Jane Doe" in t.get("people", [])]
        assert len(jane_tasks) == 2
        
        # Extract tasks with no people
        no_people_tasks = [t for t in tasks if not t.get("people")]
        assert len(no_people_tasks) == 1
    
    def test_update_reminder_cache(self):
        """Test updating the reminders cache structure"""
        cache = {
            "byList": {
                "Inbox": [
                    {"id": "1", "title": "Task 1"},
                    {"id": "2", "title": "Task 2"}
                ]
            }
        }
        
        # Add new task
        new_task = {"id": "3", "title": "Task 3"}
        cache["byList"]["Inbox"].append(new_task)
        
        assert len(cache["byList"]["Inbox"]) == 3
        assert cache["byList"]["Inbox"][-1]["id"] == "3"
        
        # Create new list
        cache["byList"]["Project X"] = [{"id": "4", "title": "Project task"}]
        
        assert "Project X" in cache["byList"]
        assert len(cache["byList"]["Project X"]) == 1
        
        # Remove completed task
        cache["byList"]["Inbox"] = [t for t in cache["byList"]["Inbox"] if t["id"] != "1"]
        
        assert len(cache["byList"]["Inbox"]) == 2
        assert all(t["id"] != "1" for t in cache["byList"]["Inbox"])


class TestGTDHelpers:
    """Test GTD helper functions"""
    
    def test_clean_task_title(self):
        """Test cleaning task title of metadata"""
        def clean_title(title):
            # Remove tags, contexts, priority markers
            cleaned = re.sub(r'#\w+', '', title)
            cleaned = re.sub(r'@\w+', '', cleaned)
            cleaned = re.sub(r'!!?', '', cleaned)
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            return cleaned
        
        assert clean_title("Review document #next @computer !!") == "Review document"
        assert clean_title("Call client #waiting @phone") == "Call client"
        assert clean_title("Simple task") == "Simple task"
        assert clean_title("#inbox @anywhere Task with metadata") == "Task with metadata"
    
    def test_format_due_date(self):
        """Test formatting due dates for display"""
        from datetime import datetime, timedelta
        
        def format_due(due_str):
            if not due_str:
                return ""
            
            due = datetime.fromisoformat(due_str.replace('Z', '+00:00'))
            now = datetime.now(due.tzinfo)
            diff = (due - now).days
            
            if diff < -1:
                return f"Overdue by {-diff} days"
            elif diff == -1:
                return "Yesterday"
            elif diff == 0:
                return "Today"
            elif diff == 1:
                return "Tomorrow"
            elif diff <= 7:
                return f"In {diff} days"
            else:
                return due.strftime("%Y-%m-%d")
        
        now = datetime.now()
        
        # Test various dates
        yesterday = (now - timedelta(days=1)).isoformat() + 'Z'
        today = now.isoformat() + 'Z'
        tomorrow = (now + timedelta(days=1)).isoformat() + 'Z'
        next_week = (now + timedelta(days=5)).isoformat() + 'Z'
        next_month = (now + timedelta(days=30)).isoformat() + 'Z'
        
        assert "Yesterday" in format_due(yesterday)
        assert "Today" in format_due(today)
        assert "Tomorrow" in format_due(tomorrow)
        assert "In 5 days" in format_due(next_week)
        assert "-" in format_due(next_month)  # Shows date
    
    def test_parse_reminder_list_name(self):
        """Test parsing reminder list names"""
        def normalize_list_name(name):
            # Normalize list names for consistent matching
            return name.strip().lower().replace(' ', '-')
        
        assert normalize_list_name("Inbox") == "inbox"
        assert normalize_list_name("John Smith") == "john-smith"
        assert normalize_list_name("  Project X  ") == "project-x"
        assert normalize_list_name("Some-List") == "some-list"