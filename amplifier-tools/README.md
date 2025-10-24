# Obs-Dailynotes Amplifier Tools

AI-powered development tools for the obs-dailynotes project, following the amplifier pattern.

## Philosophy

**Amplifier pattern:** Code for structure and iteration, AI (Claude) for intelligence and generation.

This gives us:
- **Code**: Reliable file handling, iteration, state management
- **AI**: Understanding context, generating content, making intelligent decisions

## Available Tools

### 1. Person Page Generator

Generate enriched person pages from email addresses or calendar events:

```bash
make generate-person EMAIL=someone@example.com
```

**What it does:**
- Extracts person information from email/calendar
- Uses Claude to generate comprehensive person page
- Creates proper frontmatter (tags, aliases, context)
- Saves to correct directory structure
- Updates people.json index

### 2. GTD Tag Processor (Coming Soon)

Intelligently process and normalize GTD tags:

```bash
make process-gtd-tags INPUT=reminders.txt
```

### 3. Link Validator (Coming Soon)

Find and fix broken wikilinks:

```bash
make validate-links
```

## Setup

### One-Time Installation

```bash
# Install Python dependencies
make amplifier-setup

# Set API key in .env
echo "ANTHROPIC_API_KEY=your_key" >> .env
```

### Usage

```bash
# Generate a person page
make generate-person EMAIL=joi@ito.com

# See all available commands
make help
```

## Creating New Tools

Follow the amplifier pattern:

1. **Create Python script** in `amplifier-tools/`
2. **Add prompt template** in `amplifier-tools/prompts/`
3. **Use shared utilities** from `amplifier-tools/utils/`
4. **Add Makefile command** for easy access
5. **Document in this README**

### Example Tool Structure

```python
#!/usr/bin/env python3
"""Tool description"""

from amplifier_tools.utils.claude_helpers import ask_claude, read_file

def main():
    # 1. Read input (code handles file I/O)
    input_data = read_file(input_file)

    # 2. Process with Claude (AI handles intelligence)
    result = ask_claude(
        prompt_template="prompts/my_template.md",
        context={"data": input_data}
    )

    # 3. Write output (code handles file I/O)
    write_output(result)
```

## Integration with Existing Tools

Amplifier tools **complement** your existing `tools/` scripts:

- **tools/** - Existing Node.js/Python automation (keep using!)
- **amplifier-tools/** - NEW AI-powered tools (use when AI adds value)

Use amplifier tools when:
- Task requires understanding context (person enrichment)
- Pattern recognition needed (GTD tag normalization)
- Content generation (summaries, descriptions)
- Intelligent decision making (link validation)

Use existing tools when:
- Simple file operations
- API calls without AI
- Batch processing
- Pure automation

## Philosophy

This follows the obs-dailynotes principle of **ruthless simplicity**:
- Don't rebuild what works
- Add AI where it multiplies value
- Keep tools focused on one job
- Make them composable
