# Obsidian Hotkey Setup for Person Pages

## Essential Hotkeys for Person Page Workflow

### Core Obsidian Hotkeys

1. **Create New Note from Link**
   - Search for: "Open link under cursor in new pane"
   - Suggested: `Cmd + Shift + Click` (default)
   - This creates the person page when you click a red/unlinked name

2. **Insert Template** (requires Templater or Templates plugin)
   - Search for: "Templater: Insert template" or "Templates: Insert template"
   - Suggested: `Cmd + Shift + T`
   - Use: After creating person page, instantly apply template

3. **Quick Switcher**
   - Search for: "Quick switcher: Open quick switcher"
   - Default: `Cmd + O`
   - Use: Quickly jump between daily note and new person page

### Setting Up a Hotkey

1. In Settings → Hotkeys
2. Search for the command name
3. Click the `+` button next to the command
4. Press your desired key combination
5. If there's a conflict, Obsidian will warn you

### Recommended Workflow Hotkeys

| Action | Command | Suggested Hotkey | Purpose |
|--------|---------|-----------------|----------|
| Create person page | Open link under cursor | `Cmd + Click` | Creates new note from [[Name]] |
| Apply template | Templater: Insert template | `Cmd + Shift + T` | Adds person template |
| Jump back | Navigate back | `Cmd + [` | Return to daily note |
| Navigate forward | Navigate forward | `Cmd + ]` | Go forward again |
| Search in file | Search current file | `Cmd + F` | Find email addresses |
| Copy line | Copy paragraph | `Cmd + L` | Copy context with email |

### Templater-Specific Setup

If using Templater plugin:

1. **Install Templater**
   - Settings → Community plugins → Browse → Search "Templater"
   - Install and enable

2. **Configure Templater**
   - Settings → Templater Settings
   - Template folder location: `/templates` or `/switchboard/templates`
   - Enable "Trigger Templater on new file creation"

3. **Set Folder Templates** (Automatic!)
   - In Templater settings → Folder Templates
   - Add new:
     - Folder: `/` (root)
     - Template: `person-quick.md`
   - This auto-applies template to new person pages!

### QuickAdd Alternative Setup

If preferring QuickAdd plugin:

1. **Install QuickAdd**
   - Settings → Community plugins → Browse → "QuickAdd"

2. **Create Macro**
   - Settings → QuickAdd Settings
   - Click "Manage Macros" → "Add Macro"
   - Name: "Create Person Page"

3. **Configure Macro Steps**
   ```
   1. Capture to: "{{VALUE}}.md"
   2. Template: person-quick.md
   3. Create file if doesn't exist: ✓
   4. Open file after creation: ✓
   ```

4. **Assign Hotkey**
   - Settings → Hotkeys
   - Search: "QuickAdd: Create Person Page"
   - Assign: `Cmd + Shift + P`

### Power User: Combo Hotkey

Create a sequence with Keyboard Maestro or BetterTouchTool:

```
Cmd + Shift + P triggers:
1. Copy current line (for context)
2. Create new note from link
3. Apply person template
4. Paste context into notes section
5. Jump back to daily note
```

## Quick Test

1. In your daily note, type: `Met with [[Jane Smith]] (jane@example.com)`
2. `Cmd + Click` on Jane Smith → creates page
3. `Cmd + Shift + T` → select person template
4. Copy email from daily note
5. `Cmd + V` into emails field
6. `Cmd + [` to jump back to daily note

## My Recommended Setup

For your workflow, I suggest:

1. **Use Templater with Folder Templates**
   - Auto-applies person template to new pages in root
   - No hotkey needed after setup!

2. **Single-click workflow:**
   - `Cmd + Click` on [[Person Name]] in daily note
   - Template auto-applies
   - Just copy/paste the email

3. **Advanced: Custom URI Handler**
   - Create Alfred/Raycast workflow
   - Select "Jane Smith jane@example.com" 
   - Hotkey creates person page with email pre-filled

## Troubleshooting

**Hotkey not working?**
- Check for conflicts in Settings → Hotkeys (conflicts show in red)
- Make sure plugin is enabled
- Restart Obsidian after setting hotkeys

**Template not applying?**
- Verify template folder path in plugin settings
- Check file exists: `/switchboard/templates/person-quick.md`
- Ensure Templater/Templates plugin is enabled

**Can't find the command?**
- Use search box in Hotkeys settings
- Make sure relevant plugin is installed and enabled
- Some commands only appear after plugin configuration