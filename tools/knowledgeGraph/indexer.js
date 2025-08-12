#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const matter = require("gray-matter");

// Config
const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || "/Users/<Owner>/switchboard";
const DAILYNOTES_PATH = process.env.DAILYNOTES_PATH || "/Users/<Owner>/switchboard/dailynote";
const REPO_ROOT = "/Users/<Owner>/obs-dailynotes";
const DATA_DIR = path.join(REPO_ROOT, "data");
const GRAPH_JSONL = path.join(DATA_DIR, "graph.jsonl");
const GRAPH_META = path.join(DATA_DIR, "graph_meta.json");
const REPORT_MD = path.join(DATA_DIR, "graph_report.md");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (_) {
    return null;
  }
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function appendJsonl(filePath, obj) {
  fs.appendFileSync(filePath, JSON.stringify(obj) + "\n", "utf8");
}

function kebabify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveTypeFromPath(absPath) {
  if (absPath.includes("/Private/People/")) return "person";
  if (absPath.includes("/Organizations/")) return "organization";
  if (absPath.includes("/Meetings/")) return "note";
  if (absPath.includes("/Literature/") || absPath.includes("/zotero-annotations/")) return "paper";
  if (absPath.includes("/litnotes/")) return "idea";
  return "note";
}

function toNode({ absPath, front, content }) {
  const relPath = absPath.startsWith(SWITCHBOARD_PATH)
    ? path.relative(SWITCHBOARD_PATH, absPath)
    : path.relative(REPO_ROOT, absPath);
  const title = path.basename(absPath, path.extname(absPath));
  const fm = front || {};
  const type = fm.type || deriveTypeFromPath(absPath);
  const slug = fm.slug || kebabify(title);
  const id = fm.id || `${type}:${slug}`;
  const aliases = Array.isArray(fm.aliases) ? fm.aliases : [];
  const topics = Array.isArray(fm.topics) ? fm.topics : [];
  const tags = Array.isArray(fm.tags)
    ? fm.tags
    : typeof fm.tags === "string"
      ? fm.tags.split(/[\s,]+/).filter(Boolean)
      : [];
  const updatedAt = new Date().toISOString();
  const node = {
    id,
    type,
    slug,
    title,
    path: absPath,
    rel_path: relPath,
    aliases,
    topics,
    tags,
    updated_at: updatedAt,
  };
  return node;
}

function extractRelations({ id, absPath, fm, content }) {
  const edges = [];
  const front = fm || {};
  // Frontmatter relations
  if (front.relations && typeof front.relations === "object") {
    for (const [relType, values] of Object.entries(front.relations)) {
      const list = Array.isArray(values) ? values : [values];
      for (const dst of list) {
        if (typeof dst === "string" && dst.includes(":")) {
          edges.push({
            src_id: id,
            dst_id: dst,
            rel_type: relType,
            confidence: 1.0,
            source: "frontmatter",
          });
        }
      }
    }
  }
  // Wikilinks [[...]] (resolve to slug-only IDs of unknown type for now)
  const wikilinkRegex = /\[\[([^\]|#]+)(?:#[^\]]+)?\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(content))) {
    const targetTitle = match[1].trim();
    const slug = kebabify(targetTitle);
    const dstId = `note:${slug}`; // conservative default
    edges.push({
      src_id: id,
      dst_id: dstId,
      rel_type: "mentions",
      confidence: 0.4,
      source: "wikilink",
    });
  }
  return edges;
}

async function scanVaults() {
  const patterns = [
    path.join(SWITCHBOARD_PATH, "**/*.md"),
    path.join(REPO_ROOT, "**/*.md"),
  ];
  const ignore = ["**/node_modules/**", "**/.git/**", "**/data/**", "**/logs/**"];
  const files = await fg(patterns, { ignore, dot: false, onlyFiles: true, unique: true });
  return files;
}

function loadGraph() {
  const nodes = new Map();
  const edges = [];
  if (!fs.existsSync(GRAPH_JSONL)) return { nodes, edges };
  const lines = fs.readFileSync(GRAPH_JSONL, "utf8").split(/\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj && obj.kind === "node") {
        nodes.set(obj.data.id, obj.data);
      } else if (obj && obj.kind === "edge") {
        edges.push(obj.data);
      }
    } catch (_) {
      // skip bad lines
    }
  }
  return { nodes, edges };
}

function report({ nodes, edges }) {
  const countsByType = {};
  for (const node of nodes.values()) {
    countsByType[node.type] = (countsByType[node.type] || 0) + 1;
  }
  const lines = [
    "# Graph Report",
    "",
    `Nodes: ${nodes.size}`,
    `Edges: ${edges.length}`,
    "",
    "## Nodes by Type",
  ];
  for (const [t, c] of Object.entries(countsByType).sort()) {
    lines.push(`- ${t}: ${c}`);
  }
  lines.push("", "## Notes", "- IDs are derived if missing; will be harmonized in Phase 2.");
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n", "utf8");
}

function buildResolvers(nodesMap) {
  const slugToId = new Map();
  const aliasToId = new Map();
  for (const n of nodesMap.values()) {
    if (n.slug) slugToId.set(n.slug, n.id);
    if (Array.isArray(n.aliases)) {
      for (const a of n.aliases) {
        const s = kebabify(a);
        if (s) aliasToId.set(s, n.id);
      }
    }
    // Also map title kebab as fallback
    if (n.title) {
      const s = kebabify(n.title);
      if (s && !slugToId.has(s)) slugToId.set(s, n.id);
    }
  }
  function resolve(targetTitle) {
    const s = kebabify(targetTitle);
    if (slugToId.has(s)) return { id: slugToId.get(s), confidence: 1.0 };
    if (aliasToId.has(s)) return { id: aliasToId.get(s), confidence: 0.8 };
    return { id: `note:${s}`, confidence: 0.4 };
  }
  return { resolve };
}

async function main() {
  ensureDir(DATA_DIR);
  const mode = process.argv.includes("--report") ? "report" : "index";
  const { nodes: existingNodes, edges: existingEdges } = loadGraph();

  if (mode === "report") {
    report({ nodes: existingNodes, edges: existingEdges });
    console.log(`Report written: ${REPORT_MD}`);
    return;
  }

  const files = await scanVaults();
  // First pass: parse all files → candidate nodes
  const parsedFiles = [];
  for (const absPath of files) {
    const raw = safeRead(absPath);
    if (!raw) continue;
    let fm = {};
    let content = raw;
    try {
      const parsed = matter(raw);
      fm = parsed.data || {};
      content = parsed.content || raw;
    } catch (_) {
      fm = {};
      content = raw;
    }
    const node = toNode({ absPath, front: fm, content });
    parsedFiles.push({ absPath, fm, content, node });
  }

  // Build resolver map from candidate nodes and existingNodes
  const combinedNodes = new Map(existingNodes);
  for (const p of parsedFiles) combinedNodes.set(p.node.id, p.node);
  const { resolve } = buildResolvers(combinedNodes);

  let newNodes = 0;
  let newEdges = 0;
  for (const { absPath, fm, content, node } of parsedFiles) {
    // Upsert node
    const existing = existingNodes.get(node.id);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(node)) {
      appendJsonl(GRAPH_JSONL, { kind: "node", data: node });
      existingNodes.set(node.id, node);
      newNodes += 1;
    }

    // Extract edges using resolver
    const edges = [];
    const wikilinkRegex = /\[\[([^\]|#]+)(?:#[^\]]+)?\]\]/g;
    let match;
    while ((match = wikilinkRegex.exec(content))) {
      const targetTitle = match[1].trim();
      const resolved = resolve(targetTitle);
      edges.push({
        src_id: node.id,
        dst_id: resolved.id,
        rel_type: "mentions",
        confidence: resolved.confidence,
        source: "wikilink",
      });
    }

    // Append edges (dedupe naive by hash of fields)
    const edgeSet = new Set(existingEdges.map(e => `${e.src_id}|${e.dst_id}|${e.rel_type}|${e.source}`));
    for (const e of edges) {
      const key = `${e.src_id}|${e.dst_id}|${e.rel_type}|${e.source}`;
      if (!edgeSet.has(key)) {
        appendJsonl(GRAPH_JSONL, { kind: "edge", data: e });
        existingEdges.push(e);
        newEdges += 1;
        edgeSet.add(key);
      }
    }
  }

  // Meta
  const meta = {
    updated_at: new Date().toISOString(),
    counts: { nodes: existingNodes.size, edges: existingEdges.length, newNodes, newEdges },
    vaults: { switchboard: SWITCHBOARD_PATH, dailynotes: DAILYNOTES_PATH },
  };
  writeJson(GRAPH_META, meta);
  report({ nodes: existingNodes, edges: existingEdges });
  console.log(`Indexed ${files.length} files. New nodes: ${newNodes}, new edges: ${newEdges}`);
  console.log(`Graph: ${GRAPH_JSONL}`);
  console.log(`Meta:  ${GRAPH_META}`);
  console.log(`Report:${REPORT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


