# Amplifier Tools for Obs-Dailynotes

**AI-powered development tools** that accelerate productivity workflows.

## What Are Amplifier Tools?

Amplifier tools follow a simple pattern:
- **Code** handles structure (file I/O, iteration, validation)
- **AI (Claude)** handles intelligence (understanding, generation, enrichment)

This gives us the best of both worlds: reliability + intelligence.

---

## Available Tools

### 1. Person Page Generator 🆕

Generate enriched person pages from email addresses using AI.

**Usage:**
```bash
make generate-person EMAIL=someone@example.com
```

**With additional context:**
```bash
make generate-person EMAIL=joi@ito.com NAME="Joichi Ito" COMPANY="Digital Garage"
```

**What it does:**
1. Takes email address (+ optional name, company, context)
2. Uses Claude to intelligently generate comprehensive person page
3. Creates proper YAML frontmatter:
   - `type: person`
   - `email`, `aliases`, `tags`
   - `company`, `role`, `location`
   - `relationship` (professional/friend/family/acquaintance)
   - `last_contact` (today's date)
4. Generates structured markdown content:
   - Context (who they are, why they're in your network)
   - Background (company, role, expertise, location)
   - Interaction History (first met, recent contact, topics)
   - Notes and Links
5. Saves to `people/[Name].md` with proper filename sanitization
6. Ready to link from daily notes and meeting notes!

**Example output:**
```markdown
---
type: person
email: joi@ito.com
aliases:
  - Joi
  - JI
tags:
  - people
  - tech
  - media
company: Digital Garage
role: CEO
location: Tokyo, Japan
relationship: professional
last_contact: 2025-10-24
---

# Joichi Ito

## Context

Joichi Ito (Joi) is a prominent entrepreneur, venture capitalist, and advocate
for open-source technology and digital rights. Known for his work at MIT Media
Lab and various tech ventures.

## Background

- **Company**: Digital Garage - Japanese technology incubator and venture capital firm
- **Role**: CEO and Board Member
- **Expertise**: Technology investment, digital rights, open source, creative commons
- **Location**: Tokyo, Japan

## Interaction History

- **Recent Contact**: [Context from your interaction]
- **Topics Discussed**: Technology trends, digital governance, innovation

## Notes

[AI-generated or your custom notes]

## Links

- **Email**: [joi@ito.com](mailto:joi@ito.com)
```

**Benefits:**
- **Saves time** - No manual page creation
- **Consistent format** - All person pages follow same structure
- **Intelligent** - Claude infers company, role, expertise from context
- **Proper metadata** - Tags and frontmatter for Obsidian queries
- **GTD-ready** - Links to reminders, calendar events, daily notes

---

### 2. GTD Tag Processor (Coming Soon)

Intelligently process and normalize GTD tags from reminders.

**Planned usage:**
```bash
make process-gtd-tags INPUT=reminder.txt
```

**Will do:**
- Extract project, area, context tags
- Normalize spelling and format
- Suggest new tags based on content
- Validate against your tag taxonomy

### 3. Link Validator (Coming Soon)

Find and fix broken wikilinks in your vault.

**Planned usage:**
```bash
make validate-links
make fix-links AUTO=true
```

**Will do:**
- Scan all markdown files for [[wikilinks]]
- Identify broken links (missing targets)
- Suggest fixes (fuzzy matching)
- Auto-repair if enabled

---

## Setup

### One-Time Installation

```bash
cd ~/obs-dailynotes

# Install amplifier tools
make amplifier-setup

# Add your Claude API key to .env
echo "ANTHROPIC_API_KEY=your_api_key_here" >> .env
```

Get your API key from: https://console.anthropic.com/

### Verify Installation

```bash
# Check Python environment
source .venv-amplifier/bin/activate
python --version  # Should be Python 3.x
pip list          # Should show anthropic, python-dotenv
deactivate

# Try the help
make help
```

---

## How It Works

### The Amplifier Pattern

```
┌─────────────────────────────────────────┐
│            Make Command                 │
│  make generate-person EMAIL=...        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Python Script                   │
│  amplifier-tools/generate_person_page.py│
│  1. Read input                          │
│  2. Load prompt template                │
│  3. Call Claude                         │
│  4. Write output                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Claude API                      │
│  - Analyzes email/context               │
│  - Generates person page                │
│  - Returns structured markdown          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Output File                     │
│  people/[Person-Name].md                │
│  Ready to use in Obsidian!              │
└─────────────────────────────────────────┘
```

---

## Integration with Existing Workflow

### Existing Tools (tools/)

Your current `tools/` directory has 97+ scripts for:
- Daily note generation (`index.js`)
- GTD sync (`tools/syncReminders*.js`)
- People management (`tools/buildPeopleIndex.js`, `tools/enrichPersonPage.js`)
- Gmail integration (`tools/gmail*/`)
- Knowledge graph (`tools/knowledgeGraph/`)

**Keep using these!** They work great for automation.

### Amplifier Tools (amplifier-tools/)

New `amplifier-tools/` directory for:
- Person enrichment (AI understands context)
- Content generation (summaries, descriptions)
- Intelligent processing (tag normalization, categorization)
- Pattern recognition (link validation, cleanup)

### When to Use Which?

**Use existing tools/ for:**
- ✅ API calls (Calendar, Gmail, Reminders)
- ✅ File operations (sync, move, rename)
- ✅ Batch processing (index generation)
- ✅ Scheduled automation (daily notes, GTD sync)

**Use amplifier-tools/ for:**
- ✅ Understanding context (person background)
- ✅ Generating content (summaries, descriptions)
- ✅ Intelligent decisions (categorization, tagging)
- ✅ Pattern recognition (validation, cleanup)

---

## Examples

### Example 1: Generate Person Page from Meeting

After a meeting, quickly create a person page:

```bash
# From calendar event, you got their email
make generate-person EMAIL=newcontact@company.com

# Claude will:
# - Infer company from email domain
# - Generate appropriate tags
# - Create professional context
# - Save to people/Newcontact.md
```

Then link from your daily note:
```markdown
## 2pm - Meeting with [[Newcontact]]
- Discussed project collaboration
- Follow up on proposal
```

### Example 2: Enrich Existing Person

If you have a basic person page and want to enrich it:

```bash
# Generate fresh page with all details
make generate-person EMAIL=colleague@tech.com NAME="Jane Smith" COMPANY="TechCorp"

# Review the generated page
# Merge with your existing notes
```

### Example 3: Bulk Person Creation

For multiple people from a meeting:

```bash
make generate-person EMAIL=person1@company.com
make generate-person EMAIL=person2@startup.io
make generate-person EMAIL=person3@university.edu
```

Each gets intelligently generated context based on their domain.

---

## Customizing

### Adjust the Prompt Template

Edit `amplifier-tools/prompts/person_page_generation.md` to customize:
- Frontmatter fields
- Content structure
- Tone and style
- Additional sections

Changes apply to all future generations.

### Extend the Tool

The person generator is in `amplifier-tools/generate_person_page.py`:
- Add Gmail context fetching
- Add LinkedIn lookup
- Add calendar event parsing
- Integrate with existing `tools/enrichFromLLM.js`

---

## Building More Tools

Follow the proven pattern:

### 1. Create Python Script

```python
#!/usr/bin/env python3
"""Tool description"""

from amplifier_tools.utils.claude_helpers import ask_claude

def main():
    # Read input
    # Process with Claude
    # Write output
```

### 2. Create Prompt Template

```markdown
# amplifier-tools/prompts/my_tool.md

You are an expert at [task].

Input: {{input_data}}

Generate: [what you want]
```

### 3. Add Makefile Command

```makefile
my-tool: ## Description
	@. .venv-amplifier/bin/activate && python3 amplifier-tools/my_tool.py
```

### 4. Document It

Update this file and `amplifier-tools/README.md`.

---

## Troubleshooting

### "ANTHROPIC_API_KEY not found"

Add to `.env` file:
```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### "Command not found: make"

Install Xcode Command Line Tools:
```bash
xcode-select --install
```

### ".venv-amplifier not found"

Run setup again:
```bash
make amplifier-setup
```

### "Module not found: anthropic"

Reinstall dependencies:
```bash
source .venv-amplifier/bin/activate
pip install -r amplifier-tools/requirements.txt
```

---

## Philosophy

### Amplifier Complements, Doesn't Replace

Obs-dailynotes already has excellent automation in `tools/`. Amplifier tools **add AI intelligence** where it provides value:

**Before (manual person page):**
```
1. Create person.md file
2. Add frontmatter by hand
3. Fill in background from memory
4. Hope you got the company name right
5. Update people.json manually
```

**After (amplifier):**
```
1. make generate-person EMAIL=...
2. Done! Page created with intelligent context
```

**Time saved:** 10-15 minutes per person
**Quality:** Consistent format, proper tags, comprehensive context

---

## Future Amplifier Tools

Based on your workflow, great candidates:

1. **Meeting Summary Generator**
   - Input: Daily note with meeting
   - Output: Structured summary with action items

2. **GTD Tag Normalizer**
   - Input: Reminder text
   - Output: Normalized tags + project extraction

3. **Email Context Enricher**
   - Input: Email thread
   - Output: Summary + person links + action items

4. **Knowledge Graph Validator**
   - Input: Graph JSON
   - Output: Validation report + auto-fixes

5. **Daily Note Enhancer**
   - Input: Basic daily note
   - Output: Enhanced with context, summaries, links

---

## See Also

- `amplifier-tools/README.md` - Tool directory documentation
- `tools/` - Existing automation scripts (Node.js/Python)
- `docs/USAGE.md` - Command matrix for all workflows
- `docs/ARCHITECTURE.md` - System design

---

**Happy amplifying!** 🚀
