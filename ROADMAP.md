---
tags: [documentation]
type: note
slug: knowledge-graph-roadmap
id: note:knowledge-graph-roadmap
---

# Knowledge Graph Roadmap (obs-dailynotes / switchboard)

This roadmap defines a typed personal knowledge graph over `~/switchboard` and `~/obs-dailynotes` that tools, people, and LLMs can follow and contribute to. The initial implementation uses a JSON graph store (no SQLite) and is non-destructive to Markdown files.

## Architecture (high-level)

```mermaid
flowchart TD
  subgraph Sources
    A1["Manual notes in Obsidian"]
    A2["Gmail"]
    A3["Google Calendar"]
    A4["Apple Reminders"]
    A5["Attachments / PDFs"]
  end

  subgraph Processors
    P1["Markdown Parser + Frontmatter Extractor"]
    P2["Relation Extractor<br/>(frontmatter + wikilinks)"]
    P3["Normalizer<br/>(slugs, aliases, IDs)"]
    P4["Enricher<br/>(GPT-5 + rules, #no-enrich)"]
    P5["Indexer<br/>(Graph + FTS + Embeddings)"]
  end

  subgraph Storage
    S1[("Markdown Vault<br/>~/switchboard, ~/obs-dailynotes")]
    S2[("Graph Store<br/>JSONL / JSON")]
    S3[("Search Index<br/>FTS (future)")]
    S4[("Embeddings<br/>(future)")]
    S5[("Cache<br/>people_cache / agendas")]
  end

  subgraph Access
    X1["Obsidian UI"]
    X2["CLI / Node tools"]
    X3["MCP: KnowledgeGraph"]
    X4["MCP: Gmail / Calendar"]
  end

  subgraph Users
    U1["Claude Desktop"]
    U2["Cursor / Claude Code"]
    U3["ChatGPT"]
    U4["Keyboard Maestro"]
  end

  A1-->P1
  A2-->X4
  A3-->X4
  A4-->X2
  A5-->P1

  P1-->P2-->P3-->P5
  P4-->P5

  P1-->S1
  P5-->S2
  P5-->S3
  P5-->S4
  P5-->S5

  S1<-->X1
  S1<-->X2
  S2<-->X2
  S2<-->X3
  S3<-->X2
  S4<-->X3

  X3-->U1
  X2-->U2
  X4-->U1
  X3-->U3
  X2-->U4
```

## Object model (frontmatter)

Use consistent `type`, `id`, `slug`, `aliases`, `links`, `tags`. IDs are stable and recorded in `config/slugToId.json`. Bodies stay human-friendly; relations live in frontmatter.

```yaml
type: person | organization | idea | paper | note
id: <type>:<slug>
slug: <kebab-case>
aliases: []
links: {}
topics: []
relations: {}
```

Type-specific fields:
- person: `emails[]`, `orgs[]`, `sensitivity`
- organization: `people[]`, `parents[]`, `children[]`
- idea: `related[]`, `status`
- paper: `authors[]`, `year`, `doi`, `venue`, `file`
- note: `related[]`

## JSON graph store

- Location: `data/graph.jsonl` (append-only upserts) and `data/graph_meta.json` for indexes.
- Nodes: `{ id, type, slug, title, path, aliases[], topics[], updated_at }`
- Edges: `{ src_id, dst_id, rel_type, confidence, source }`
- Indexing is derived from Markdown; no file edits in Phase 1.

## MCP endpoints (initial)

- `kg_list_nodes({type?, query?})`
- `kg_get_node({id})`
- `kg_search({text})` (simple text filter for now)
- `kg_add_relation({src_id, dst_id, rel_type, note?})` (writes to JSONL)

## Migration status

- [x] Approve plan: typed graph, JSON store, diagram with Users
- [x] Add `graph:index` script and scaffolding
- [x] Phase 1: Initial non-destructive index over `~/switchboard` and `~/obs-dailynotes`
- [x] Phase 1: Generate `data/graph.jsonl` and `data/graph_meta.json`
- [ ] Phase 2: Frontmatter harmonization (ids/slugs) – proposal draft
- [x] Phase 3: MCP server (`tools/mcpServers/knowledgeGraph.js`) – JSON-backed
- [ ] Phase 4: Obsidian Dataview dashboard templates
- [ ] Phase 5: LLM enrichment uses graph context, respects `#no-enrich`

## How to contribute (people, LLMs, tools)

Follow this contract:

1) Frontmatter contract
- Keep a `type` and `slug` in relevant files; if missing, propose values but do not edit without approval.
- Do not rewrite note bodies; add relations only in frontmatter proposals.

2) Graph contract
- Write new edges via `tools/knowledgeGraph/indexer.js --add-edge` or MCP method.
- Do not delete nodes; mark superseded via a `rel_type: supersedes` edge.

3) Formatting contract
- Preserve a single blank line between sections in Markdown.
- Respect `#no-enrich` and source-only usernames.

## Next actions

- Run: `npm run graph:index` to refresh the JSON graph.
- Start MCP server: `npm run mcp:kg` (tools available: list_nodes, get_node, search, add_relation).
- Review `data/graph_report.md` for counts and missing metadata.

*Last updated: 2025-08-12*