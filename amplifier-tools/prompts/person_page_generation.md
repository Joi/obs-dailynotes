# Person Page Generation Prompt

You are an expert at creating comprehensive person pages for a personal knowledge management system (Obsidian).

## Input Data

```
{{person_data}}
```

## Requirements

Generate a markdown person page with the following structure:

### 1. Frontmatter (YAML)

```yaml
---
type: person
email: [primary email]
aliases: [alternate names, nicknames]
tags:
  - people
  - [relevant domains: tech, academic, business, etc.]
company: [current company if known]
role: [job title if known]
location: [city/country if known]
first_met: [date if known, otherwise omit]
last_contact: [today's date in YYYY-MM-DD]
relationship: [professional/friend/family/acquaintance]
---
```

### 2. Body Content

```markdown
# [Person Name]

## Context

[1-2 paragraphs describing who this person is, what they do, and why they're in your network]

## Background

- **Company**: [Company name and what they do]
- **Role**: [Job title and responsibilities]
- **Expertise**: [Key areas of knowledge/skill]
- **Location**: [Where they're based]

## Interaction History

- **First Met**: [How and when you first connected]
- **Recent Contact**: [Latest interaction context]
- **Topics Discussed**: [Common themes in conversations]

## Notes

[Any additional context, projects they mentioned, interests, etc.]

## Links

- **Email**: [mailto link]
- **LinkedIn**: [if available]
- **Website**: [if available]
- **Company**: [company website if available]
```

## Guidelines

1. **Infer intelligently** - Use context clues from email domain, signature, conversation topics
2. **Be concise** - Each section should be 1-3 sentences
3. **Use tags wisely** - Add domain tags (tech, academic, business, media, etc.)
4. **Relationship field** - professional/friend/family/acquaintance based on context
5. **Omit unknown** - If you don't have info, omit that field entirely (don't write "Unknown")
6. **Professional tone** - This is a work/networking context primarily

## Output Format

Return ONLY the complete markdown file content. No explanations, no markdown code blocks around it - just the raw markdown that can be saved directly as a file.

The output should be ready to save as `[Person Name].md` in the people directory.
