---
tags: [documentation]
type: note
slug: integration-architecture
id: note:integration-architecture
---

# Integration Architecture: Reminders, People, and Daily Notes

## Overview

This document explains how the obs-dailynotes system integrates Apple Reminders with Obsidian daily notes through a people-centric architecture. The system uses email addresses and full names as primary identifiers to link reminders, person pages, and calendar events.

## Core Concepts

### 1. Person Pages

Person pages are Markdown files in the Obsidian vault root that represent individuals. Each person page contains frontmatter metadata that defines how to identify and link that person across different systems.

**Key Fields:**

- `name`: The person's full display name (e.g., "Taro Chiba")
- `emails`: List of email addresses associated with this person (can be single string or array)
- `aliases`: Alternative names/nicknames used in calendar invites
- `reminders.listName`: The Apple Reminders list name for this person's agenda items
- `tags`: Include "people" to explicitly mark as a person page

### 2. Linking Mechanisms

#### Email-Based Linking

- **Google Calendar → Person Page**: When calendar events include attendees with email addresses, the system matches these emails against the `emails` field in person pages
- **Person Page → Reminders List**: Each person page specifies a `reminders.listName` that corresponds to an Apple Reminders list

#### Name-Based Linking

- **Calendar Attendee Names → Person Page**: If an attendee's display name matches a person's `name` or `aliases`, they are linked
- **Reminders List Name → Person Page**: The `reminders.listName` creates a direct mapping to Apple Reminders

## Data Flow

### Daily Note Generation Flow

1. **Google Calendar API** → Fetch today's events with attendee details
2. **Attendee Matching** → For each attendee email/name:
   - Search `people.index.json` for matching email in `emails` array
   - Fallback to name matching against `name` and `aliases`
3. **Reminder Injection** → For matched attendees:
   - Look up their `reminders.listName`
   - Pull uncompleted tasks from that Apple Reminders list
   - Inject as agenda items under the meeting in the daily note

### Two-Way Sync Flow

1. **Reminders → Obsidian**:
   - `reminders-cli` exports all lists as JSON
   - Tasks are written to `reminders/reminders.md` with embedded IDs
   - Per-person agendas written to `reminders/agendas/<name>.md`
   - Today's priorities filtered to `reminders/todo-today.md`

2. **Obsidian → Reminders**:
   - Checked tasks in Obsidian include `<!--reminders-id:UUID-->`
   - Sync script finds checked items by ID
   - Marks corresponding items complete in Apple Reminders via CLI

## File Structure and Formats

### people.index.json

Generated from person page frontmatter. Uses the person's name as the key:

```json
{
  "Taro Chiba": {
    "name": "Taro Chiba",
    "pagePath": "Taro Chiba.md",
    "aliases": ["Taro", "T. Chiba"],
    "emails": ["taro@example.com", "taro@cit.ac.jp"],
    "reminders": {
      "listName": "Taro Chiba"
    }
  }
}
```

Note: The index key is the person's `name`, not an ID. The `emails` field is always an array, even if defined as a single string in the frontmatter.

### Person Page (Taro Chiba.md)

```markdown
---
tags: [person]
name: Taro Chiba
emails: [taro@example.com, taro@cit.ac.jp]
aliases: [Taro, T. Chiba]
reminders:
  listName: "Taro Chiba"
---
```

### Daily Note Meeting Section

```markdown
### Strategy Meeting

- 14:00 - 15:00 ([[Taro Chiba]], [[<Owner Name>]])
- Agenda for [[Taro Chiba]]:
  - [ ] Review Q4 strategy <!--reminders-id:UUID1-->
  - [ ] Discuss partnership proposal <!--reminders-id:UUID2-->
```

Note: Meeting detection no longer uses an inline `#mtg` tag. Headings are treated as meetings only within the Meetings section (between `<!-- BEGIN MEETINGS -->` and `<!-- END MEETINGS -->` or under `## Meetings`).

### Reminders File Structure

- `reminders_cache.json` - Raw JSON from reminders-cli
- `reminders.md` - All uncompleted tasks with embedded IDs
- `todo-today.md` - Filtered urgent/due today items
- `agendas/<name>.md` - Per-person agenda files

#### reminders_cache.json schema (used by agenda injection)

```json
{
  "timestamp": "ISO-STRING",
  "lists": ["Inbox", "John Smith", "<Owner>/Daum To Do"],
  "byList": {
    "John Smith": [
      {
        "id": "UUID",
        "title": "Discuss project",
        "list": "John Smith",
        "notes": "",
        "due": null,
        "completed": false
      }
    ]
  },
  "byPerson": {
    "John Smith": {
      "name": "John Smith",
      "pagePath": "John Smith.md",
      "aliases": ["John", "J. Smith"],
      "emails": ["john@example.com"],
      "items": [
        { "id": "UUID", "title": "Discuss project", "list": "John Smith" }
      ],
      "personalList": [
        /* same item shape */
      ],
      "sharedList": [
        /* same item shape, list can contain slashes */
      ]
    }
  }
}
```

`index.js` uses `byPerson` to match meeting attendees by email or alias and inject "Agenda for [[Name]]" blocks under the meeting.

## Special Use Cases

### Email Reminders System

To create a specialized email reminders system:

1. **Create Email Lists in Apple Reminders**:
   - "Email - Reply Required"
   - "Email - Follow Up"
   - "Email - Waiting For Response"

2. **Create Special Person Pages**:

```markdown
---
tags: [person, system]
name: Email Tasks
emails: [email-tasks@system.local]
reminders:
  listName: "Email - Reply Required"
---
```

1. **Tag Integration**:
   - Tasks in these lists can include tags like `#email-urgent`
   - The sync system preserves these tags in Obsidian
   - Can create filtered views using Obsidian's search/query features

### Shared Lists

People can have both personal and shared Apple Reminder lists for collaboration:

```markdown
---
tags: [person, list]
name: Daum Kim
emails: [daum@example.com]
aliases: [Daum]
reminders:
  listName: "Daum Kim" # Personal list
  sharedListName: "<Owner>/Daum To Do" # Shared collaborative list
  isShared: true # Marks this person has shared lists
---
```

Shared lists allow multiple people to collaborate on tasks. The sync system handles both personal and shared lists, maintaining proper list attribution for two-way sync.

## Key Algorithms

### Attendee Matching Algorithm

```text
1. For each calendar attendee:
   a. Extract email address
   b. Search all person pages for email in `emails` array
   c. If no email match, try name match against `name` and `aliases`
   d. Return matched person's reminders.listName
```

### Task Sync Algorithm

```text
1. Parse all Obsidian files for tasks with <!--reminders-id:-->
2. Build map of ID → completion status
3. For each completed task:
   a. Find task in Apple Reminders by ID
   b. Mark as complete via reminders-cli
4. Regenerate reminder files to reflect new state
```

## Obsidian Integration

### Quick Person Page Creation from Daily Notes

The system integrates with Obsidian's Templater plugin to enable instant person page creation with automatic email extraction from daily note context.

**Workflow**:

1. User writes in daily note: `Met with [[John Doe]] (john@example.com)`
2. User Cmd+Clicks on the red/unlinked `[[John Doe]]`
3. Templater automatically:
   - Creates `John Doe.md`
   - Searches the originating daily note for emails near "John Doe"
   - Extracts `john@example.com`
   - Populates the person page with proper frontmatter

**Template Logic** (`person-smart.md`):

```javascript
// Search algorithm:
1. Get the file name (person's name)
2. Read the last opened file (daily note)
3. Find lines mentioning the person
4. Search for email patterns within 2 lines
5. Extract and normalize email
6. Populate frontmatter with emails: [extracted@email.com]
```

**Templater Configuration**:

- Template folder: `templates/`
- Folder Templates: Root → `person-smart.md`
- Trigger on file creation: Enabled
- Timeout: 10000ms (for file reading)

This creates a seamless workflow where person pages are created on-the-fly during meeting notes, with contact information automatically captured.

## Bulk Import and Management Tools

### Person Page Enrichment

The `enrichPersonPage.js` tool transforms basic person pages into properly structured documents:

```bash
npm run people:enrich "Person Name.md" [--create-list] [--shared]
```

**Features**:

- Extracts emails from content and moves to frontmatter
- Adds proper structure (Overview, Background, Contact, Notes)
- Auto-creates Apple Reminder lists if `#list` tag is present
- Supports both personal and shared list creation
- Updates people index automatically

### List Tag Management

The `tagPeopleWithLists.js` tool finds all people with Apple Reminder lists and tags them:

```bash
npm run people:tag-lists
```

This enables the fast sync mode by marking only people who actually have lists with the `#list` tag.

### CSV Contact Import

The system includes a tool for bulk importing contacts from CSV exports (e.g., from Outlook, Google Contacts):

```bash
node tools/importContactsFromCSV.js /path/to/contacts.csv
```

**Features**:

- Parses CSV with headers: First Name, Last Name, Email Addresses, Primary Email
- Creates person pages using `Firstname Lastname.md` format
- Updates existing pages by merging email addresses
- Handles multiple emails per contact (semicolon-separated)
- Sanitizes filenames for filesystem compatibility
- Preserves existing page content while updating frontmatter

**Import Process**:

1. Read CSV and identify name/email columns
2. For each row with valid name and email:
   - Check if person page exists
   - Create or update frontmatter with emails list
   - Maintain standard person page structure
3. Rebuild people index after import

## Extension Points

### Custom Tags and Filters

- **Due Date Parsing**: Tasks with `@today`, `@tomorrow` patterns
- **Priority Markers**: `!!` for high priority, `!` for medium
- **GTD Tags**: `#email`, `#phone`, `#waiting`
- **Project Links**: `[[Project Name]]` for cross-referencing

### Automation Triggers

- **Morning Routine**: Generate todo-today.md with urgent items
- **Meeting Prep**: Pull agendas 15 minutes before meetings
- **End of Day**: Sync completed items back to Reminders
- **Weekly Review**: Archive completed tasks, generate reports

## Implementation Notes

### Performance Considerations

- People index is cached and only rebuilt when person pages change
- Reminders cache has 10-minute TTL to avoid API rate limits
- Batch operations for marking multiple tasks complete
- **Fast Sync Mode**: Uses `#list` tag to only check people with Apple Reminder lists (19 people vs 800+)
- **Optimized Index**: Only includes reminders config for people who actually have lists

### Error Handling

- Missing person pages don't break the system (graceful fallback)
- Invalid email formats are skipped silently
- Reminders without IDs can't be synced back (one-way only)

### Security

- No credentials stored in person pages
- Email addresses only used for matching, not for sending
- Reminder IDs are UUIDs, no sensitive data exposed

## Example Workflow for Email Reminders

1. **Setup Phase**:
   - Create Apple Reminders list: "Email - Action Required"
   - Create person page: `System - Email.md` with `reminders.listName: "Email - Action Required"`
   - Add emails to track as tasks in Apple Reminders

2. **Daily Process**:
   - Morning: Run `npm run reminders:pull` to fetch email tasks
   - Throughout day: Check off completed email tasks in Obsidian
   - Evening: Run `npm run reminders:sync` to update Apple Reminders

3. **Integration with Calendar**:
   - Before meetings, relevant email action items appear as agenda
   - Can create "Email Review" calendar blocks that pull all email tasks

This architecture enables flexible, extensible integration between Apple Reminders and Obsidian while maintaining clean separation of concerns and data sovereignty.
