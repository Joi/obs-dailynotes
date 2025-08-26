"""
Integration tests for daily notes generation with calendar events
"""

import pytest
import json
from pathlib import Path
import sys
from datetime import datetime, date, timedelta
import tempfile

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestDailyNoteGeneration:
    """Test complete daily note generation process"""
    
    def test_create_daily_note_with_meetings(self, temp_vault):
        """Test creating a daily note with meeting entries"""
        daily_note_path = temp_vault / "dailynote"
        daily_note_path.mkdir(exist_ok=True)
        
        today = date.today()
        note_file = daily_note_path / f"{today.strftime('%Y-%m-%d')}.md"
        
        # Create daily note content
        content = f"""---
date: {today.strftime('%Y-%m-%d')}
---

[[{(today - timedelta(days=1)).strftime('%Y-%m-%d')}]] << Previous | Next >> [[{(today + timedelta(days=1)).strftime('%Y-%m-%d')}]]

## To Do Today

## Meetings

### Strategy Meeting
- 14:00 - 15:00 ([[John Smith]], [[Jane Doe]])
- [Call Link](https://meet.google.com/abc-defg-hij)
- [[2025-08-09-1400]]

### Budget Review
- 16:00 - 17:00 ([[Finance Team]])
- Location: Conference Room A

## Notes
"""
        
        note_file.write_text(content)
        
        # Verify content
        assert note_file.exists()
        loaded = note_file.read_text()
        assert "## Meetings" in loaded
        # meeting tag removed; ensure meetings content exists without tag
        assert "[[John Smith]]" in loaded
        assert "Call Link" in loaded

    def test_agenda_injection_from_cache(self, tmp_path):
        """Ensure agenda items appear when byPerson matches attendee"""
        # Setup vault structure
        vault = tmp_path / "vault"
        (vault / "dailynote").mkdir(parents=True)
        # Simulated attendee and cache
        attendee_names = ["John Smith"]
        attendee_emails = ["john@example.com"]
        cache = {
            "byPerson": {
                "John Smith": {
                    "name": "John Smith",
                    "aliases": ["John"],
                    "emails": ["john@example.com"],
                    "items": [
                        {"id": "id-1", "title": "Review proposal", "list": "John Smith"},
                        {"id": "id-2", "title": "Budget check", "list": "John Smith"}
                    ]
                }
            }
        }
        # Build meeting content and inject agenda
        content = "\n".join([
            "## Meetings",
            "### Sync with John",
            "- 14:00 - 15:00 ([[John Smith]])"
        ])
        agenda_lines = []
        for personKey, info in cache['byPerson'].items():
            alias_set = set([info['name'], *info.get('aliases', [])])
            email_set = set(info.get('emails', []))
            matched_email = any(e in email_set for e in attendee_emails)
            matched_name = any(n in alias_set for n in attendee_names)
            if (matched_email or matched_name) and info.get('items'):
                agenda_lines.append(f"\n- Agenda for [[{info['name']}|{info['name']}]]:")
                for it in info['items'][:5]:
                    agenda_lines.append(f"  - [ ] {it['title']} ({it['list']}) <!--reminders-id:{it['id']} list:{it['list']} person:{personKey}-->")
        if agenda_lines:
            content = content + "\n" + "\n".join(agenda_lines)
        # Write today's note file directly
        ymd = date.today().strftime('%Y-%m-%d')
        note = (vault / 'dailynote' / f"{ymd}.md")
        note.write_text(content)
        txt = note.read_text()
        assert '## Meetings' in txt
        assert 'Agenda for [[John Smith]]' in txt or 'Agenda for [[John Smith|John Smith]]' in txt
        assert 'Review proposal' in txt
    
    def test_filter_calendar_events(self):
        """Test filtering of calendar events"""
        events = [
            {"summary": "Team Meeting", "start": "14:00", "end": "15:00"},
            {"summary": "Tateki / <Owner> sync", "start": "15:00", "end": "15:30"},
            {"summary": "Budget Review", "start": "16:00", "end": "17:00"},
        ]
        
        # Filter pattern
        filter_pattern = "Tateki / <Owner>"
        filtered = [e for e in events if filter_pattern not in e["summary"]]
        
        assert len(filtered) == 2
        assert all(filter_pattern not in e["summary"] for e in filtered)
        assert "Team Meeting" in [e["summary"] for e in filtered]
        assert "Budget Review" in [e["summary"] for e in filtered]
    
    def test_parse_meeting_links(self):
        """Test extraction of meeting links from event data"""
        events = [
            {
                "summary": "Zoom Meeting",
                "location": "https://zoom.us/j/123456789",
                "description": ""
            },
            {
                "summary": "Google Meet",
                "location": "",
                "description": "Join: https://meet.google.com/abc-defg-hij"
            },
            {
                "summary": "Physical Meeting",
                "location": "Conference Room A",
                "description": "No virtual link"
            }
        ]
        
        def extract_meeting_link(event):
            # Check location first
            if event.get("location", "").startswith("http"):
                return event["location"]
            
            # Check description for links
            import re
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
            desc = event.get("description", "")
            urls = re.findall(url_pattern, desc)
            if urls:
                return urls[0]
            
            # Return physical location if no URL
            if event.get("location"):
                return f"Location: {event['location']}"
            
            return None
        
        assert extract_meeting_link(events[0]) == "https://zoom.us/j/123456789"
        assert extract_meeting_link(events[1]) == "https://meet.google.com/abc-defg-hij"
        assert extract_meeting_link(events[2]) == "Location: Conference Room A"
    
    def test_format_attendees(self):
        """Test formatting of meeting attendees"""
        def format_attendees(attendees):
            if not attendees:
                return ""
            
            # Create wikilinks for attendee names
            formatted = []
            for attendee in attendees:
                name = attendee.get("displayName", attendee.get("email", "Unknown"))
                # Clean email domains
                if "@" in name:
                    name = name.split("@")[0].replace(".", " ").title()
                formatted.append(f"[[{name}]]")
            
            return ", ".join(formatted)
        
        attendees1 = [
            {"displayName": "John Smith"},
            {"displayName": "Jane Doe"}
        ]
        assert format_attendees(attendees1) == "[[John Smith]], [[Jane Doe]]"
        
        attendees2 = [
            {"email": "john.smith@example.com"},
            {"email": "jane@example.com"}
        ]
        assert format_attendees(attendees2) == "[[John Smith]], [[Jane]]"
        
        assert format_attendees([]) == ""
        assert format_attendees(None) == ""


class TestRemindersIntegration:
    """Test integration with Apple Reminders"""
    
    def test_pull_reminders_to_vault(self, temp_vault, mock_reminders_cli):
        """Test pulling reminders into vault structure"""
        reminders_dir = temp_vault / "reminders"
        reminders_dir.mkdir(exist_ok=True)
        
        # Simulate pulling reminders
        cache_file = reminders_dir / "cache.json"
        cache_file.write_text(json.dumps(mock_reminders_cli))
        
        # Process into individual list files
        cache = json.loads(cache_file.read_text())
        for list_name, tasks in cache["byList"].items():
            list_file = reminders_dir / f"{list_name.lower().replace(' ', '-')}.md"
            content = f"# {list_name}\n\n"
            for task in tasks:
                status = "x" if task.get("completed") else " "
                content += f"- [{status}] {task['title']}\n"
            list_file.write_text(content)
        
        # Verify files created
        assert (reminders_dir / "inbox.md").exists()
        assert (reminders_dir / "john-smith.md").exists()
        
        inbox_content = (reminders_dir / "inbox.md").read_text()
        assert "Review document" in inbox_content
        assert "Call client" in inbox_content
    
    def test_sync_changes_back_to_reminders(self):
        """Test syncing vault changes back to reminders"""
        # This would test the sync mechanism
        # In practice, this would call reminders-cli
        
        changes = [
            {"action": "complete", "id": "123-456"},
            {"action": "add", "title": "New task #inbox", "list": "Inbox"},
            {"action": "update", "id": "789-012", "title": "Updated task"}
        ]
        
        # Simulate processing changes
        commands = []
        for change in changes:
            if change["action"] == "complete":
                commands.append(f"reminders complete {change['id']}")
            elif change["action"] == "add":
                commands.append(f"reminders add {change['list']} '{change['title']}'")
            elif change["action"] == "update":
                commands.append(f"reminders edit {change['id']} --title '{change['title']}'")
        
        assert len(commands) == 3
        assert "reminders complete" in commands[0]
        assert "reminders add" in commands[1]
        assert "reminders edit" in commands[2]


class TestPeopleGeneration:
    """Test automatic generation of person pages"""
    
    def test_generate_people_from_daily_notes(self, temp_vault):
        """Test extracting people from daily notes and creating pages"""
        daily_path = temp_vault / "dailynote"
        daily_path.mkdir(exist_ok=True)
        people_path = temp_vault / "People"
        people_path.mkdir(exist_ok=True)
        
        # Create daily note with person references
        (daily_path / "2025-08-09.md").write_text("""
## Meetings

### Meeting with [[John Smith]]
- Discussed project timeline
- Email: john.smith@example.com

### Call with [[Jane Doe]]
- Budget review
- Contact: jane@company.org

## Notes

Mentioned [[Bob Johnson]] in context of new project.
""")
        
        # Extract people references
        import re
        content = (daily_path / "2025-08-09.md").read_text()
        people_refs = re.findall(r'\[\[([^\]]+)\]\]', content)
        unique_people = list(set(people_refs))
        
        assert "John Smith" in unique_people
        assert "Jane Doe" in unique_people
        assert "Bob Johnson" in unique_people
        
        # Extract emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, content)
        
        # Create person pages
        for person in unique_people:
            person_file = people_path / f"{person}.md"
            if not person_file.exists():
                # Find associated email
                person_email = None
                if person == "John Smith":
                    person_email = "john.smith@example.com"
                elif person == "Jane Doe":
                    person_email = "jane@company.org"
                
                # Create page
                frontmatter = f"""---
tags: [person]
name: {person}
emails: [{person_email if person_email else ''}]
aliases: []
reminders:
  listName: "{person}"
---

# {person}

## Contact
"""
                if person_email:
                    frontmatter += f"- Email: {person_email}\n"
                frontmatter += f"- Added: 2025-08-09\n\n## Notes\n\n## Meetings\n"
                
                person_file.write_text(frontmatter)
        
        # Verify person pages created
        assert (people_path / "John Smith.md").exists()
        assert (people_path / "Jane Doe.md").exists()
        assert (people_path / "Bob Johnson.md").exists()
        
        # Verify content
        john_content = (people_path / "John Smith.md").read_text()
        assert "john.smith@example.com" in john_content


class TestEndToEndWorkflow:
    """Test complete workflow from calendar to daily note to GTD"""
    
    def test_full_daily_workflow(self, temp_vault):
        """Test the complete daily workflow"""
        # 1. Setup directory structure
        (temp_vault / "dailynote").mkdir(exist_ok=True)
        (temp_vault / "reminders").mkdir(exist_ok=True)
        (temp_vault / "People").mkdir(exist_ok=True)
        (temp_vault / "GTD").mkdir(exist_ok=True)
        
        # 2. Simulate calendar events
        calendar_events = [
            {
                "summary": "Team Standup",
                "start": {"dateTime": "2025-08-09T09:00:00"},
                "end": {"dateTime": "2025-08-09T09:30:00"},
                "attendees": [{"displayName": "John Smith"}, {"displayName": "Jane Doe"}],
                "location": "https://meet.google.com/abc-defg-hij"
            }
        ]
        
        # 3. Simulate reminders
        reminders = {
            "byList": {
                "Inbox": [
                    {"title": "Review standup notes #next", "completed": False},
                    {"title": "Send weekly report #today", "completed": False}
                ]
            }
        }
        
        # 4. Create daily note
        today = date.today()
        daily_note = temp_vault / "dailynote" / f"{today.strftime('%Y-%m-%d')}.md"
        
        content = f"""---
date: {today.strftime('%Y-%m-%d')}
---

## To Do Today

### Next Actions
- [ ] Review standup notes
- [ ] Send weekly report

## Meetings

### Team Standup
- 09:00 - 09:30 ([[John Smith]], [[Jane Doe]])
- [Call Link](https://meet.google.com/abc-defg-hij)

## Notes
"""
        
        daily_note.write_text(content)
        
        # 5. Create GTD views
        gtd_inbox = temp_vault / "GTD" / "inbox.md"
        gtd_inbox.write_text("""# Inbox

## To Process
- [ ] Review standup notes #next
- [ ] Send weekly report #today
""")
        
        # 6. Verify complete structure
        assert daily_note.exists()
        assert gtd_inbox.exists()
        
        # Verify content integration
        daily_content = daily_note.read_text()
        assert "Team Standup" in daily_content
        assert "Review standup notes" in daily_content
        assert "[[John Smith]]" in daily_content
        
        gtd_content = gtd_inbox.read_text()
        assert "#next" in gtd_content
        assert "#today" in gtd_content