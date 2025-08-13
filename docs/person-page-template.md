## Canonical Person Page Template

Use this template for person pages in `~/switchboard`. A copy also lives in `~/switchboard/templates/person.md`.

```markdown
---
name: Person Name
tags: [person]
aliases: []             # optional list of alternate names
emails: []              # list or block form (see below)
mail_depth: 1           # 0=no mail, 1=Gmail only, 2=MailStore+Gmail
gmail_deep: false       # body previews when depth >= 1
links:                  # optional: canonical place for public links
  website: ""
  twitter: ""
  github: ""
  linkedin: ""
documentation: false    # first-class tag for docs tracking
---

# Person Name

```

### Frontmatter Parameters

- **name**: Required display name. Used for headings.
- **tags**: Must include `person`.
- **aliases**: Optional additional names to help matching and indexing.
- **emails**: List of email addresses for Gmail/MailStore lookups.
  - Inline list:

    ```yaml
    emails: [name@example.com, other@example.org]
    ```

  - Block list:

    ```yaml
    emails:
      - name@example.com
      - other@example.org
    ```
- **mail_depth**: Controls how much email to fetch during enrichment:
  - 0: No mail scan (skip Gmail and MailStore)
  - 1: Gmail only (summary by default)
  - 2: MailStore archive scan + Gmail newest
- **gmail_deep**: When `true` and `mail_depth >= 1`, use Gmail readonly scope and fetch message previews.
- **links**: Optional block of public links used in enrichment. Supported keys include `website`, `twitter`, `github`, `linkedin`.
- **documentation**: Optional boolean to mark docs pages [[memory:5946409]].

### Behavior Summary

- Gmail deep mode can be toggled either with frontmatter `gmail_deep: true` or env `GMAIL_DEEP=1`.
- If `mail_depth` is not set, existing defaults apply (`SKIP_GMAIL`/`SKIP_MAILSTORE`).
- When `mail_depth: 0`, all email fetching is skipped regardless of env.

### Related commands

```bash
# Refresh Gmail cache for a person (respects gmail_deep and mail_depth)
PERSON_KEY="Person Name" PERSON_EMAIL="email@example.com" \
  node tools/mcpClient.js

# Full enrich (respects mail_depth)
PERSON_FILE="/Users/joi/switchboard/Person Name.md" \
  node tools/enrichFromLLM.js
```


