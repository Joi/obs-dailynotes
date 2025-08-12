#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const matter = require("gray-matter");

const REPO_ROOT = "/Users/<Owner>/obs-dailynotes";
const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || "/Users/<Owner>/switchboard";
const DATA_DIR = path.join(REPO_ROOT, "data");
const REPORT_MD = path.join(DATA_DIR, "frontmatter_harmonization_report.md");

function ensureDir(dirPath) { if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true }); }

async function listMarkdownFiles() {
  const patterns = [
    path.join(SWITCHBOARD_PATH, "**/*.md"),
    path.join(REPO_ROOT, "**/*.md"),
  ];
  const ignore = ["**/node_modules/**", "**/.git/**", "**/data/**", "**/logs/**"];
  return fg(patterns, { ignore, dot: false, onlyFiles: true, unique: true });
}

function kebabify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferTypeFromPath(absPath) {
  if (absPath.includes("/Organizations/")) return "organization";
  if (absPath.includes("/litnotes/")) return "idea";
  if (absPath.includes("/Literature/") || absPath.includes("/zotero-annotations/")) return "paper";
  if (absPath.includes("/Private/People/")) return "person";
  // Unknown: leave undefined so we don't misclassify root files
  return null;
}

function detectTypeFromFrontmatter(fm, absPath) {
  if (typeof fm.type === "string" && fm.type.trim()) return fm.type.trim();
  const tags = Array.isArray(fm.tags)
    ? fm.tags.map((t) => String(t).toLowerCase())
    : typeof fm.tags === "string"
      ? fm.tags.split(/[\s,]+/).map((t) => t.toLowerCase())
      : [];
  const hasEmails = Array.isArray(fm.emails) ? fm.emails.length > 0 : typeof fm.emails === "string" && fm.emails.length > 0;
  const hasReminders = fm.reminders && (typeof fm.reminders === "object" ? Boolean(fm.reminders.listName) : typeof fm.reminders === "string");
  if (tags.includes("person") || hasEmails || hasReminders) return "person";
  return inferTypeFromPath(absPath);
}

function harmonize(fm, absPath) {
  const title = path.basename(absPath, ".md");
  const result = { changes: {}, fm: { ...fm } };
  // Type
  const currentType = typeof fm.type === "string" ? fm.type : null;
  const inferredType = currentType || detectTypeFromFrontmatter(fm, absPath);
  if (inferredType && (!currentType || currentType !== inferredType)) {
    result.fm.type = inferredType;
    result.changes.type = { from: currentType || null, to: inferredType };
  }
  // Slug
  const currentSlug = typeof fm.slug === "string" ? fm.slug : null;
  const proposedSlug = currentSlug || kebabify(title);
  if (!currentSlug || currentSlug !== proposedSlug) {
    result.fm.slug = proposedSlug;
    result.changes.slug = { from: currentSlug || null, to: proposedSlug };
  }
  // ID
  const currentId = typeof fm.id === "string" ? fm.id : null;
  const proposedId = result.fm.type ? `${result.fm.type}:${result.fm.slug}` : null;
  const invalidId = !currentId || /^undefined:/.test(currentId) || !/^[a-z]+:[a-z0-9-]+$/.test(currentId || "");
  if (proposedId && (invalidId || currentId !== proposedId)) {
    result.fm.id = proposedId;
    result.changes.id = { from: currentId || null, to: proposedId };
  }
  return result;
}

async function main() {
  ensureDir(DATA_DIR);
  const apply = process.argv.includes("--apply");
  const files = await listMarkdownFiles();
  const summary = { filesScanned: 0, filesChanged: 0, samples: [], byChange: { type: 0, slug: 0, id: 0 } };
  for (const file of files) {
    let raw;
    try { raw = fs.readFileSync(file, "utf8"); } catch { continue; }
    let parsed;
    try { parsed = matter(raw); } catch { 
      // Malformed YAML - skip rather than risking corruption
      continue; 
    }
    const fm = parsed.data || {};
    const { changes, fm: newFm } = harmonize(fm, file);
    const mutated = Object.keys(changes).length > 0;
    summary.filesScanned++;
    if (mutated) {
      summary.filesChanged++;
      if (changes.type) summary.byChange.type++;
      if (changes.slug) summary.byChange.slug++;
      if (changes.id) summary.byChange.id++;
      if (summary.samples.length < 50) {
        summary.samples.push({ file, changes });
      }
      if (apply) {
        const out = matter.stringify(parsed.content || "", newFm, { lineWidth: 0 });
        fs.writeFileSync(file, out.endsWith("\n") ? out : out + "\n", "utf8");
      }
    }
  }

  const lines = [];
  lines.push("# Frontmatter Harmonization Report", "");
  lines.push(`Files scanned: ${summary.filesScanned}`);
  lines.push(`Files with ${apply ? "changes applied" : "proposed changes"}: ${summary.filesChanged}`);
  lines.push(`- type updates: ${summary.byChange.type}`);
  lines.push(`- slug updates: ${summary.byChange.slug}`);
  lines.push(`- id updates: ${summary.byChange.id}`);
  lines.push("", "## Samples");
  for (const s of summary.samples) {
    const parts = Object.entries(s.changes).map(([k, v]) => `${k}: ${v.from || '∅'} → ${v.to}`).join(", ");
    lines.push(`- ${s.file}\n  - ${parts}`);
  }
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n", "utf8");
  console.log(`${apply ? "Applied" : "Planned"} harmonization. Report: ${REPORT_MD}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


