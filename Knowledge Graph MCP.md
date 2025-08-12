---
tags: [documentation]
type: note
slug: knowledge-graph-mcp
id: note:knowledge-graph-mcp
---

# Knowledge Graph MCP

## What this is

Local MCP server that exposes the personal knowledge graph (built from `~/switchboard` and `~/obs-dailynotes`) to Claude Desktop and Cursor.

## How to start

```bash
npm run mcp:kg
```

Claude/Cursor MCP config:

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["/Users/joi/obs-dailynotes/tools/mcpServers/knowledgeGraph.js"],
      "cwd": "/Users/joi/obs-dailynotes"
    }
  }
}
```

## Available tools

- `kg_list_nodes {type?: string, query?: string, limit?: number}`
- `kg_get_node {id: string}`
- `kg_search {text: string, limit?: number}`
- `kg_add_relation {src_id: string, dst_id: string, rel_type: string, note?: string}`
- `kg_resolve_wikilink {text: string}`

Returns are plain text summaries for UI safety. IDs follow `<type>:<slug>`.

## Useful prompts (copy/paste in Claude/Cursor)

- List 5 people: “Call `kg_list_nodes` with `{type:'person', limit:5}`.”
- Filter by name: “Call `kg_list_nodes` with `{type:'person', query:'adam', limit:20}`.”
- Search by text: “Call `kg_search` with `{text:'Hayashi', limit:10}`.”
- Get details: “Call `kg_get_node` with `{id:'person:a-sulzberger'}`.”
- Add relation: “Call `kg_add_relation` with `{src_id:'note:YYYY-MM-DD', dst_id:'person:a-sulzberger', rel_type:'discussed_with', note:'agenda'}`.”
- Resolve: “Call `kg_resolve_wikilink` with `{text:'Taro Chiba'}`.”

## Troubleshooting

- If Claude shows schema errors, ensure server restarted and try again.
- If “Unsupported content type”, this server returns text-only content.
- Validate tags to avoid deprecated ones:

```bash
npm run graph:tags:validate
```

## Roadmap hooks

- Harmonize frontmatter IDs/slugs:

```bash
npm run graph:fm:harmonize:plan
npm run graph:fm:harmonize:apply
```

- Reindex graph:

```bash
npm run graph:index
```


