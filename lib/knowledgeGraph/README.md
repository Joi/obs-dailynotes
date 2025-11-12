# Knowledge Graph System

A graph-based knowledge management system for Switchboard that connects people, organizations, ideas, literature, and meetings into a queryable network.

## Overview

This system transforms Switchboard from a collection of markdown files into an active knowledge network where entities are nodes and relationships are edges. It enables powerful queries like "Who do I know working on AI safety?" or "Who should I introduce to whom?"

## Architecture

### Data Model

**Node Types**:
- `Person`: People in your network (880+ from Private/People/)
- `Organization`: Companies, institutions, groups
- `Paper`: Academic papers and literature
- `Idea`: Concepts, topics, areas of interest
- `Meeting`: Meeting notes with attendees and topics
- `Project`: Active projects being tracked

**Edge Types**:
- `knows`, `worked-with`, `introduced-by`, `discussed-with` (Person ↔ Person)
- `works-at`, `founded`, `advises` (Person ↔ Organization)
- `authored`, `cited`, `discussed` (Person/Paper ↔ Paper)
- `interested-in`, `working-on`, `expert-in` (Person ↔ Idea)
- `attended`, `discussed` (Meeting ↔ Person/Idea)

### Storage

The graph is stored in JSON format at `~/switchboard/.data/knowledge_graph.json` using a NetworkX-compatible schema:

```json
{
  "directed": true,
  "multigraph": true,
  "graph": {},
  "nodes": [
    {
      "id": "person:joi-ito",
      "type": "person",
      "name": "Joi Ito",
      "slug": "joi-ito",
      "emails": ["joi@example.com"],
      "filePath": "Private/People/Joi Ito.md"
    }
  ],
  "links": [
    {
      "source": "person:joi-ito",
      "target": "person:neha-narula",
      "type": "knows",
      "strength": 0.9,
      "firstContact": "2015-03-15",
      "lastContact": "2025-11-10",
      "context": ["meeting:2025-11-10-lab-sync"]
    }
  ]
}
```

## Modules

### `graphBuilder.js`
Builds the knowledge graph from Switchboard markdown files:
- Extracts entities from frontmatter (people, papers, projects)
- Parses relationship sections in person notes
- Extracts meeting attendees and topics
- Infers relationships from co-occurrence

### `extractors.js`
Entity-specific extractors:
- `extractPerson(filePath)`: Parse person frontmatter and sections
- `extractOrganization(filePath)`: Extract org metadata
- `extractPaper(filePath)`: Parse literature note frontmatter
- `extractMeeting(filePath)`: Get attendees and topics from meetings
- `extractRelationships(content)`: Parse prose for relationship data

### `graphQuery.js`
Query interface for the graph:
- `findPath(personA, personB)`: Shortest path between people
- `findExperts(topic, minStrength)`: People with high topic strength
- `findIntroductions(personId)`: Suggest valuable introductions
- `getTimeline(personA, personB)`: Relationship history
- `detectCommunities(minSize)`: Find clusters in network
- `getEgoNetwork(personId, depth)`: Get N-hop neighborhood

### `models.js`
Data structures and validation:
- Node schemas for each entity type
- Edge schemas for relationship types
- Validation functions
- Type conversions

### `index.js`
Main API and CLI entry point:
- `buildGraph()`: Build graph from scratch
- `updateGraph(filePath)`: Incremental update on file change
- `query(queryType, params)`: Execute queries
- CLI command handlers

## Commands

```bash
# Build the graph from scratch
npm run kg:build

# Query the graph
npm run kg:query -- find-path "Joi Ito" "Vitalik Buterin"
npm run kg:query -- experts --topic "probabilistic-programming"
npm run kg:query -- introductions "Joi Ito"
npm run kg:query -- timeline "Joi Ito" "Adam Back"
npm run kg:query -- communities --min-size 10

# Update graph on file changes (watch mode)
npm run kg:watch

# Export for Dataview
npm run kg:export --format dataview
```

## Integration Points

### Daily Notes Generator
```javascript
// In lib/generateDailyNote.js
const kgInsights = await getKGInsights(today);

// Add to daily note template:
// - Follow-up suggestions (stale connections)
// - Introduction opportunities
// - Upcoming meetings with relationship context
```

### Email Processor
```javascript
// In lib/emailProcessor.js
// After extracting email relationships, update graph:
await updateGraph({
  person1: personId,
  person2: contactId,
  type: "discussed-with",
  context: [`email:${threadId}`],
  lastContact: email.date
});
```

### Weekly Review
```javascript
// In lib/weeklyReview.js
const staleConnections = await findStaleConnections(90); // 90 days
const newConnections = await findNewConnections('last-week');
const introductions = await findIntroductionOpportunities();

// Add to weekly review template
```

### File Watcher
```javascript
// Watch for markdown file changes
const watcher = chokidar.watch('~/switchboard/**/*.md', {
  ignored: /^\./,
  persistent: true
});

watcher.on('change', async (path) => {
  await updateGraph(path);
  console.log(`Updated graph from ${path}`);
});
```

## Implementation Phases

### Phase 1: Foundation (Current)
- [x] Project structure created
- [ ] Basic data models defined
- [ ] Person extractor implemented
- [ ] Graph builder (initial build)
- [ ] CLI commands: `kg:build`, `kg:query`

### Phase 2: Enrichment
- [ ] Meeting extractor (attendees → co-attendance edges)
- [ ] Organization inference (from email domains)
- [ ] Relationship strength calculation
- [ ] LLM-powered relationship parsing

### Phase 3: Querying
- [ ] Path finding (shortest path between people)
- [ ] Expert finder (topic-based search)
- [ ] Introduction suggestions
- [ ] Timeline view
- [ ] Community detection

### Phase 4: Visualization
- [ ] HTML graph viewer (using vis.js or D3)
- [ ] Ego network visualization
- [ ] Temporal evolution view
- [ ] Dataview export

### Phase 5: Continuous Sync
- [ ] File watcher for auto-updates
- [ ] Incremental graph updates
- [ ] Daily notes integration
- [ ] Weekly review integration

## Example Queries

### Find Connection Path
```javascript
const path = await findPath("person:joi-ito", "person:vitalik-buterin");
// → ["person:joi-ito", "person:neha-narula", "person:vitalik-buterin"]
//    (via MIT connection)
```

### Find Experts
```javascript
const experts = await findExperts("probabilistic-programming", 0.7);
// → [
//   {name: "Vikash Mansinghka", strength: 0.95, ...},
//   {name: "Josh Tenenbaum", strength: 0.88, ...}
// ]
```

### Suggest Introductions
```javascript
const intros = await findIntroductions("person:joi-ito");
// → [
//   {
//     person1: "Alice Chen",
//     person2: "Bob Martinez",
//     sharedInterests: ["AI safety", "effective altruism"],
//     context: "You both work on AI alignment"
//   }
// ]
```

### Relationship Timeline
```javascript
const timeline = await getTimeline("person:joi-ito", "person:adam-back");
// → [
//   {date: "2020-04-06", event: "First contact", context: "email:..."},
//   {date: "2021-11-24", event: "Last contact", context: "email:..."},
//   {topics: ["Bitcoin", "Liquid", "Taproot"]}
// ]
```

## File Structure

```
obs-dailynotes/
├── lib/
│   └── knowledgeGraph/
│       ├── README.md              # This file
│       ├── index.js               # Main API and CLI
│       ├── graphBuilder.js        # Build graph from markdown
│       ├── graphQuery.js          # Query interface
│       ├── extractors.js          # Entity extractors
│       └── models.js              # Data structures
├── bin/
│   └── kg.js                      # CLI entry point
└── package.json                   # Add kg:* scripts
```

Switchboard data:
```
switchboard/
├── .data/
│   ├── knowledge_graph.json       # Main graph storage
│   ├── entity_cache.json          # Fast lookup cache
│   └── kg_dataview.json          # Dataview export
└── Private/People/*.md            # 880 person nodes
```

## Technical Decisions

### Why JavaScript/Node?
- Existing obs-dailynotes is JavaScript
- Rich ecosystem (chokidar, commander, vis.js)
- Can use graphology (NetworkX-like for JS)
- Easy integration with existing code

### Why JSON Storage?
- Human-readable and debuggable
- Version control friendly
- No database setup required
- Easy backup (just .data/ directory)
- Can migrate to graph DB later if needed

### Why Multi-Directional Graph?
- Multiple relationship types between same nodes
- Directional (paper cites paper)
- Parallel edges (knows via work AND personal)

## Data Privacy

The graph stays local by default:
- Stored in `~/switchboard/.data/` (gitignored)
- No cloud sync unless explicitly configured
- Respects privacy frontmatter in person notes
- Audit trail for all queries

## Dependencies

```json
{
  "graphology": "^0.25.0",          // Graph data structure
  "graphology-operators": "^1.6.0", // Graph operations
  "graphology-layout": "^0.6.0",    // Layout algorithms
  "vis-network": "^9.1.0",          // Visualization
  "commander": "^11.0.0",           // CLI framework
  "chokidar": "^3.5.0",             // File watching
  "gray-matter": "^4.0.0",          // Frontmatter parsing
  "date-fns": "^2.30.0"             // Date utilities
}
```

## Related Documentation

- [Knowledge Graph Design](~/switchboard/amplifier/Knowledge-Graph-Design.md) - Full design document
- [People System](~/switchboard/Docs/Systems/People-System.md) - Person entity architecture
- [Repository Sync](~/switchboard/Docs/Workflows/Repository-Sync.md) - Similar workflow pattern

---

**Status**: Phase 1 - Foundation in progress
**Repository**: [obs-dailynotes](https://github.com/Joi/obs-dailynotes)
**Documentation**: [Switchboard Amplifier Projects](~/switchboard/amplifier/)
