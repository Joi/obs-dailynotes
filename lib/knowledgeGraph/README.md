# Knowledge Graph System

A minimal file-based knowledge graph for Switchboard that transforms 880 person markdown files into a queryable network.

## Overview

The knowledge graph extracts person entities from Switchboard markdown files and builds a queryable network enabling basic relationship discovery and path finding.

**Current Phase**: Phase 1 - Foundation
- Extract 880+ person nodes from frontmatter
- Store as JSON
- Basic path finding (BFS)
- Ego network queries

## Architecture

### Minimal Approach

This implementation uses **no graph libraries** - just JavaScript arrays and objects. This keeps the code simple (~200 lines total), easy to understand, and faster to implement.

The modular design allows upgrading to graphology or NetworkX in Phase 3 if advanced graph algorithms are needed, without breaking the CLI interface.

### Data Model

**Node Structure**:
```javascript
{
  id: "adam-back",           // From frontmatter.slug
  type: "person",             // Fixed for Phase 1
  name: "Adam Back",          // From filename
  emails: ["adam@..."],       // From frontmatter.emails
  aliases: ["aback"]          // From frontmatter.aliases
}
```

**Graph Storage** (`~/switchboard/.data/knowledge_graph.json`):
```javascript
{
  nodes: [
    { id, type, name, emails, aliases },
    ...
  ],
  edges: [],  // Phase 1: empty, populated in Phase 2
  metadata: {
    version: "1.0",
    created: "2025-11-13T...",
    nodeCount: 880,
    edgeCount: 0
  }
}
```

## Modules

### `extractors.js`
Parses person markdown files to extract node data:

```javascript
extractPersonNode(filePath)
  → { id, type, name, emails, aliases }

extractAllPersons(peopleDir)
  → [{ node }, { node }, ...]
```

### `graphBuilder.js`
Builds graph from person files:

```javascript
buildGraph(peopleDir)
  → { nodes, edges, metadata }

saveGraph(graph, outputPath)
  → writes JSON to disk
```

### `queries.js`
Query interface using BFS and filtering:

```javascript
findPath(graph, startId, endId)
  → ["person-a", "person-b", "person-c"] or null

egoNetwork(graph, personId, depth)
  → { nodes: [...], edges: [...] }
```

**Note**: Phase 1 returns empty paths (no edges yet). Phase 2 adds relationship extraction.

### `models.js`
Data structures and schemas:

```javascript
// Node/edge type definitions
// Validation functions
// Helper utilities
```

### `index.js`
Public API and CLI integration:

```javascript
export { buildGraph, saveGraph } from './graphBuilder.js';
export { findPath, egoNetwork } from './queries.js';
```

## Commands

```bash
# Build graph from person files
npm run kg:build

# Query: find path between two people
npm run kg:query -- find-path "Joi Ito" "Adam Back"

# Query: get ego network (people within N connections)
npm run kg:query -- ego-network "Joi Ito" --depth 1
```

### CLI Implementation

The CLI is implemented in `bin/kg.js` using commander:

```javascript
program
  .command('build')
  .description('Build graph from person files')
  .action(async () => {
    const graph = await buildGraph(process.env.HOME + '/switchboard/Private/People');
    saveGraph(graph, process.env.HOME + '/switchboard/.data/knowledge_graph.json');
    console.log(`✓ Built graph: ${graph.metadata.nodeCount} nodes`);
  });
```

## File Structure

```
obs-dailynotes/
├── lib/knowledgeGraph/
│   ├── README.md           # This file
│   ├── index.js            # Public API
│   ├── extractors.js       # Parse frontmatter → nodes
│   ├── graphBuilder.js     # Build graph from files
│   ├── queries.js          # BFS path finding, ego networks
│   ├── models.js           # Data structures
│   └── __tests__/
│       ├── extractors.test.js
│       ├── graphBuilder.test.js
│       └── queries.test.js
├── bin/
│   └── kg.js               # CLI entry point
└── package.json            # kg:* scripts

switchboard/
├── .data/
│   └── knowledge_graph.json    # Generated graph
└── Private/People/*.md         # 880 person source files
```

## Integration Points

### Person Files (Source Data)

Location: `~/switchboard/Private/People/`

**Frontmatter Structure**:
```yaml
---
type: person
slug: adam-back
id: person:adam-back
emails:
  - adam@blockstream.com
aliases:
  - aback
  - Adam
---
```

The extractor reads this frontmatter and creates node objects.

### Daily Notes (Future)

Phase 5 design includes daily notes integration:
- Stale connection reminders
- Introduction suggestions
- Meeting context

### Weekly Review (Future)

Phase 5 design includes weekly review integration:
- New connections this week
- Follow-up suggestions
- Network statistics

## Implementation Details

### Why Minimal Approach?

**Phase 1 scope** only needs:
- Node extraction from frontmatter
- Basic graph traversal (BFS)
- JSON storage

This can be implemented in ~200 lines without a graph library. Benefits:

1. **Fast implementation**: 1 week vs 2-3 weeks with library
2. **Easy to understand**: Plain JavaScript, no library API
3. **No dependencies**: Beyond gray-matter (already installed)
4. **Modular design**: Can upgrade to library in Phase 3 without breaking contract

### The Contract (Public Interface)

The CLI commands are the stable contract:

```bash
npm run kg:build
npm run kg:query -- find-path A B
npm run kg:query -- ego-network X
```

**Internal implementation can change** (e.g., swap to graphology later) without breaking this contract.

### BFS Implementation

Phase 1 implements breadth-first search for path finding:

```javascript
function findPath(graph, startId, endId) {
  const queue = [[startId]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === endId) return path;

    const neighbors = getNeighbors(graph, node);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;  // No path found
}
```

**Note**: Phase 1 returns null (no edges). Phase 2 populates edges.

## Dependencies

**Current (Phase 1)**:
- `gray-matter` (v4.0.3) - Already installed, for frontmatter parsing
- `commander` (v14.0.2) - Already installed, for CLI
- No additional dependencies needed

**Future Phases (Optional)**:
- Phase 3 might add graphology for advanced algorithms
- Phase 4 might add vis-network for visualization
- Phase 5 might add chokidar for file watching

## Testing Strategy

**Unit Tests** (60%):
- `extractors.test.js` - Node extraction logic
- `graphBuilder.test.js` - Graph construction
- `queries.test.js` - BFS, ego network

**Integration Tests** (30%):
- Build → Save → Load → Query workflow
- Real data validation (sample files)
- Error handling

**End-to-End Tests** (10%):
- Full 880 person dataset
- CLI commands work
- Performance benchmarks

## Performance Targets

- **Build time**: <10 seconds for 880 files
- **Query time**: <100ms per query
- **File size**: <1MB for graph JSON
- **Memory**: <100MB during build

## Technical Decisions

### Why JavaScript?
- Existing obs-dailynotes codebase is JavaScript
- Easy integration with existing tools
- No cross-language complexity

### Why JSON Storage?
- Human-readable
- Version control friendly
- No database setup
- Easy backup

### Why Phase 1 Minimal?
- Proves concept with least code
- Fast implementation (2 weeks)
- Can expand if valuable
- Modular design enables evolution

### Why Not Graph Library?
- Phase 1 doesn't need it (just BFS)
- Can implement in ~30 lines
- Adds dependency overhead
- Can upgrade later if needed

## Success Criteria (Phase 1)

- [ ] 880+ nodes extracted from person files
- [ ] Graph stored at `~/switchboard/.data/knowledge_graph.json`
- [ ] CLI command `kg:build` works (<10s)
- [ ] CLI command `kg:query -- find-path A B` works
- [ ] CLI command `kg:query -- ego-network X` works
- [ ] Test coverage >80%
- [ ] Code ~200 lines total

## Future Phases

### Phase 2: Enrichment
- Extract relationships from "Connected People" sections
- Infer organizations from email domains
- Calculate relationship strength
- Populate edges in graph

### Phase 3: Querying
- Expert finder (requires topic data)
- Introduction suggestions (requires inference)
- Community detection (might add graphology)
- Timeline view

### Phase 4: Visualization
- HTML graph viewer
- Interactive exploration
- Temporal evolution view

### Phase 5: Continuous Sync
- File watcher (auto-update on changes)
- Daily notes integration
- Weekly review integration

**Why deferred?**
Phase 1 proves the concept. If it succeeds, we expand. If it fails, we learned cheaply.

## Related Documentation

- [Knowledge Graph Design](~/switchboard/amplifier/Knowledge-Graph-Design.md) - Full architecture
- [Knowledge Graph Project](~/switchboard/amplifier/Knowledge-Graph.md) - User-facing docs
- [Implementation Plan](~/amplifier/ai_working/ddd/plan.md) - Detailed phase plan
- [People System](~/switchboard/Docs/Systems/People-System.md) - Person entity architecture

---

**Status**: Phase 1 - Foundation
**Timeline**: 2 weeks
**Repository**: [obs-dailynotes](https://github.com/Joi/obs-dailynotes)
**Storage**: `~/switchboard/.data/knowledge_graph.json` (gitignored)
