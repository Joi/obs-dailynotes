# Extract Person Email Script

## Setup Instructions

### For Templater Users:

1. Install Templater plugin from Community Plugins
2. Go to Templater Settings → Template Folder Location
3. Create a template file called `Person Template.md` with this content:

```
<%* 
// Get person name from file title
const fileName = tp.file.title;
let extractedEmail = "";

// Get current file content (the daily note you came from)
const activeFile = app.workspace.getActiveFile();
if (activeFile && activeFile.path.includes('dailynote')) {
    const content = await app.vault.read(activeFile);
    
    // Find email near person's name
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.includes(fileName) || line.includes(`[[${fileName}]]`)) {
            const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
                extractedEmail = emailMatch[1].toLowerCase();
                break;
            }
        }
    }
}
-%>
tags: person
name: <% fileName %>
emails: [<% extractedEmail %>]
aliases: []
reminders:
  listName: "<% fileName %>"
---

# <% fileName %>

## Contact
- Email: <% extractedEmail %>
- Extracted from: [[<% tp.date.now("YYYY-MM-DD") %>]]

## Notes
- 
```

### For QuickAdd Users:

1. Install QuickAdd plugin
2. Create a Macro called "Create Person from Context"
3. Add a "Template" choice that uses the person template
4. Enable "Capture" format with regex: `{{NAME}}.*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`

### Manual Quick Method (No Plugins):

When you see a person without a page in your daily note:

1. Ctrl/Cmd + Click the person's name to create the page
2. Copy this template:

```markdown
tags: person
name: Person Name
emails: []
aliases: []
reminders:
  listName: "Person Name"
---

# Person Name

## Contact
- Email: [paste email here]
- Source: [[2025-08-09]] (today's date)
```

3. Go back to daily note, copy their email
4. Paste in the emails field

## Pro Tip: Using Obsidian URI

Create a bookmarklet or Alfred/Raycast script that:
1. Takes selected text (person name + email)
2. Creates person page via Obsidian URI
3. Auto-fills the template

Example URI:
```
obsidian://new?vault=YourVault&name=John%20Doe&content=%7B%7Bperson-template%7D%7D
```