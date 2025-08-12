#!/usr/bin/env node
"use strict";

// Minimal MCP server exposing the local JSON knowledge graph over JSON-RPC 2.0 (stdio)
// Tools:
//  - knowledge_graph.list_nodes { type?: string, query?: string, limit?: number }
//  - knowledge_graph.get_node { id: string }
//  - knowledge_graph.search { text: string, limit?: number }
//  - knowledge_graph.add_relation { src_id: string, dst_id: string, rel_type: string, note?: string }

const fs = require("fs");
const path = require("path");

const REPO_ROOT = "/Users/joi/obs-dailynotes";
const DATA_DIR = path.join(REPO_ROOT, "data");
const GRAPH_JSONL = path.join(DATA_DIR, "graph.jsonl");

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
    } catch (_) { /* ignore */ }
  }
  return { nodes, edges };
}

let { nodes, edges } = loadGraph();

function reloadIfChanged() {
  // Light reloader: re-read fully when file mtime changes
  try {
    const stat = fs.statSync(GRAPH_JSONL);
    if (!reloadIfChanged._mtime || stat.mtimeMs !== reloadIfChanged._mtime) {
      reloadIfChanged._mtime = stat.mtimeMs;
      const g = loadGraph();
      nodes = g.nodes;
      edges = g.edges;
    }
  } catch (_) { /* ignore */ }
}

function nodeMatchesQuery(node, query) {
  if (!query) return true;
  const hay = [node.title, node.slug, node.type, node.path, ...(node.aliases || []), ...(node.topics || [])]
    .join("\n").toLowerCase();
  return hay.includes(String(query).toLowerCase());
}

function listNodes({ type, query, limit = 50 }) {
  reloadIfChanged();
  const out = [];
  for (const n of nodes.values()) {
    if (type && n.type !== type) continue;
    if (!nodeMatchesQuery(n, query)) continue;
    out.push(n);
    if (out.length >= limit) break;
  }
  return out;
}

function getNode({ id }) {
  reloadIfChanged();
  return nodes.get(id) || null;
}

function search({ text, limit = 50 }) {
  return listNodes({ query: text, limit });
}

function addRelation({ src_id, dst_id, rel_type, note }) {
  if (!src_id || !dst_id || !rel_type) throw new Error("Missing required fields");
  const edge = { src_id, dst_id, rel_type, confidence: 0.9, source: note ? `manual:${note}` : "manual" };
  fs.appendFileSync(GRAPH_JSONL, JSON.stringify({ kind: "edge", data: edge }) + "\n", "utf8");
  edges.push(edge);
  return { ok: true };
}

// JSON-RPC plumbing
function send(result, id) { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n"); }
function sendJsonRpcError(message, id) { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message } }) + "\n"); }
function asText(payload) {
  try {
    if (Array.isArray(payload)) {
      return payload
        .slice(0, 20)
        .map((n) => {
          if (n && typeof n === "object") {
            const title = n.title || n.slug || n.id || "(untitled)";
            const type = n.type ? ` [${n.type}]` : "";
            const id = n.id ? ` <${n.id}>` : "";
            return `- ${title}${type}${id}`;
          }
          return `- ${String(n)}`;
        })
        .join("\n");
    }
    if (payload && typeof payload === "object") {
      const n = payload;
      const lines = [];
      if (n.title) lines.push(`title: ${n.title}`);
      if (n.id) lines.push(`id: ${n.id}`);
      if (n.type) lines.push(`type: ${n.type}`);
      if (n.slug) lines.push(`slug: ${n.slug}`);
      if (n.path) lines.push(`path: ${n.path}`);
      return lines.join("\n");
    }
    return String(payload);
  } catch {
    return "";
  }
}

function sendToolSuccess(payload, id) {
  // Some clients do not accept a 'json' content type; return plain text summary only
  return send({ content: [{ type: "text", text: asText(payload) }] }, id);
}
function sendToolError(message, id) {
  return send({ isError: true, content: [{ type: "text", text: String(message || "Tool error") }] }, id);
}

const tools = [
  { name: "kg_list_nodes", description: "List nodes filtered by type/query", inputSchema: { type: "object", properties: { type: { type: "string" }, query: { type: "string" }, limit: { type: "number" } } } },
  { name: "kg_get_node", description: "Get a node by ID", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "kg_search", description: "Search nodes by free text", inputSchema: { type: "object", properties: { text: { type: "string" }, limit: { type: "number" } }, required: ["text"] } },
  { name: "kg_add_relation", description: "Add an edge between nodes", inputSchema: { type: "object", properties: { src_id: { type: "string" }, dst_id: { type: "string" }, rel_type: { type: "string" }, note: { type: "string" } }, required: ["src_id", "dst_id", "rel_type"] } },
];

async function handleCall(name, params, id) {
  try {
    if (name === "kg_list_nodes") return sendToolSuccess(listNodes(params || {}), id);
    if (name === "kg_get_node") return sendToolSuccess(getNode(params || {}), id);
    if (name === "kg_search") return sendToolSuccess(search(params || {}), id);
    if (name === "kg_add_relation") return sendToolSuccess(addRelation(params || {}), id);
    return sendToolError("Unknown tool", id);
  } catch (e) { return sendToolError(e.message || "Tool error", id); }
}

function main() {
  let buffer = "";
  process.stdin.on("data", async (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;
      let msg; try { msg = JSON.parse(line); } catch { continue; }
      const { id, method, params } = msg;
      // Notifications have no id – never respond
      const isNotification = typeof id === "undefined" || id === null;
      if (method === "initialize") {
        return send({
          serverInfo: { name: "knowledge-graph-mcp", version: "0.1.0" },
          protocolVersion: params?.protocolVersion || "2025-06-18",
          capabilities: {}
        }, id);
      }
      if (method === "notifications/initialized") {
        if (isNotification) continue; // don't respond
        return send({}, id);
      }
      if (method === "tools/list") return send({ tools }, id);
      if (method === "resources/list") return send({ resources: [] }, id);
      if (method === "prompts/list") return send({ prompts: [] }, id);
      if (method === "tools/call") return handleCall(params?.name, params?.arguments, id);
      if (!isNotification) return sendJsonRpcError("Unknown method", id);
    }
  });
}

main();


