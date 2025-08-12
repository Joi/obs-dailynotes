#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const matter = require("gray-matter");

const SWITCHBOARD_PATH = "/Users/<Owner>/switchboard";
const REPORT = path.join("/Users/<Owner>/obs-dailynotes", "data", "docs_tagging_report.md");

const EXCLUDE_DIR_PATTERNS = [
  "/Private/People/",
  "/Organizations/", // organizations should use type: organization, but may still be docs sometimes
  "/Meetings/",
  "/dailynote/",
  "/GTD/",
  "/reminders/",
];

const NAME_HINTS = /(README|ROADMAP|ARCH(ITECTURE)?|DESIGN|TEST(ING)?|GUIDE|HOWTO|MCP|Knowledge|Integration|System|Decision|Spec|Specification|Index|Overview)/i;
const CONTENT_HINTS = /(architecture|roadmap|testing|specification|design|knowledge graph|mcp|how to|guide|overview)/i;

function ensureDir(dirPath) { if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true }); }

async function listMarkdownFiles() {
  const patterns = [path.join(SWITCHBOARD_PATH, "**/*.md")];
  const ignore = ["**/node_modules/**", "**/.git/**"];
  return fg(patterns, { ignore, dot: false, onlyFiles: true, unique: true });
}

function looksLikeDoc(filePath, content, fm) {
  // Exclusions
  for (const pat of EXCLUDE_DIR_PATTERNS) if (filePath.includes(pat)) return false;
  // If already tagged documentation
  const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : typeof fm.tags === "string" ? fm.tags.split(/[\s,]+/) : [];
  if (tags.includes("documentation")) return true;
  const name = path.basename(filePath);
  if (NAME_HINTS.test(name)) return true;
  // Check content heuristics
  const headCount = (content.match(/^#{1,3}\s/mg) || []).length;
  if (headCount >= 5 && CONTENT_HINTS.test(content)) return true;
  return false;
}

function toArrayTags(tags) {
  if (Array.isArray(tags)) return tags.slice();
  if (typeof tags === "string") return tags.split(/[\s,]+/).filter(Boolean);
  return [];
}

function kebabify(text) {
  return String(text || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function upsertDocFrontmatter(filePath, parsed) {
  const fm = parsed.data || {};
  const body = parsed.content || "";
  const tags = new Set(toArrayTags(fm.tags));
  tags.add("documentation");
  const title = path.basename(filePath, ".md");
  const slug = fm.slug || kebabify(title);
  const type = fm.type || "note";
  const id = fm.id && /^\w+:/.test(fm.id) ? fm.id : `${type}:${slug}`;
  const newFm = { ...fm, tags: Array.from(tags), slug, type, id };
  return matter.stringify(body, newFm, { lineWidth: 0 });
}

async function main() {
  ensureDir(path.dirname(REPORT));
  const files = await listMarkdownFiles();
  const changes = [];
  for (const file of files) {
    let raw;
    try { raw = fs.readFileSync(file, "utf8"); } catch { continue; }
    let parsed;
    try { parsed = matter(raw); } catch { continue; }
    const fm = parsed.data || {};
    const content = parsed.content || "";
    // Skip if explicitly typed as person/organization/idea/paper
    if (["person", "organization", "idea", "paper"].includes(String(fm.type || "").toLowerCase())) continue;
    if (!looksLikeDoc(file, content, fm)) continue;
    const out = upsertDocFrontmatter(file, parsed);
    if (out && out !== raw) {
      fs.writeFileSync(file, out.endsWith("\n") ? out : out + "\n", "utf8");
      changes.push(file);
    }
  }
  const lines = ["# Documentation Tagging Report", "", `Tagged files: ${changes.length}`, "", ...changes.map((f) => `- ${f}`)];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf8");
  console.log(`Tagged ${changes.length} documentation pages. Report: ${REPORT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


