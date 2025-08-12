#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const matter = require("gray-matter");

const REPO_ROOT = "/Users/<Owner>/obs-dailynotes";
const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || "/Users/<Owner>/switchboard";
const DATA_DIR = path.join(REPO_ROOT, "data");
const REPORT_MD = path.join(DATA_DIR, "tag_normalization_report.md");

const TYPE_MAP = new Map([
  ["person", "person"],
  ["people", "person"],
  ["contact", "person"],
  ["individual", "person"],

  ["organization", "organization"],
  ["organisation", "organization"],
  ["org", "organization"],
  ["company", "organization"],
  ["team", "organization"],
  ["foundation", "organization"],
  ["lab", "organization"],

  ["idea", "idea"],
  ["concept", "idea"],
  ["thought", "idea"],

  ["paper", "paper"],
  ["publication", "paper"],
  ["article", "paper"],
  ["literature", "paper"],

  ["note", "note"],
  ["meeting", "note"],
  ["minutes", "note"],
  ["memo", "note"],

  ["project", "project"],
  ["projects", "project"],
]);

const TAG_MAP = new Map([
  ["people_p", "person"],
  ["person_p", "person"],
  ["people", "person"],
  ["person", "person"],

  ["org_p", "organization"],
  ["org", "organization"],
  ["organisation", "organization"],
  ["organizations", "organization"],
  ["organization", "organization"],
  ["company", "organization"],

  ["litnotes", "idea"],
  ["idea_p", "idea"],
  ["ideas_p", "idea"],
  ["literature", "paper"],
  ["papers", "paper"],
  ["paper", "paper"],
  ["concept", "idea"],
  ["ideas", "idea"],

  ["meeting", "note"],
  ["meetings", "note"],
  ["note", "note"],
]);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function listMarkdownFiles() {
  const patterns = [
    path.join(SWITCHBOARD_PATH, "**/*.md"),
    path.join(REPO_ROOT, "**/*.md"),
  ];
  const ignore = ["**/node_modules/**", "**/.git/**", "**/data/**", "**/logs/**"];
  return fg(patterns, { ignore, dot: false, onlyFiles: true, unique: true });
}

function parseFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = matter(raw);
    return { raw, data: parsed.data || {}, content: parsed.content || "", ok: true };
  } catch (e) {
    return { raw: null, data: {}, content: "", ok: false, error: e };
  }
}

function normalizeTypeValue(typeValue) {
  if (!typeValue || typeof typeValue !== "string") return null;
  const canonical = TYPE_MAP.get(typeValue.toLowerCase());
  return canonical || null;
}

function normalizeTagsArray(tagsValue) {
  const changed = [];
  const current = Array.isArray(tagsValue)
    ? tagsValue
    : typeof tagsValue === "string"
      ? tagsValue.split(/[,\s]+/).filter(Boolean)
      : [];
  const out = [];
  const seen = new Set();
  for (const t of current) {
    const key = String(t).trim();
    if (!key) continue;
    const lower = key.toLowerCase();
    if (TAG_MAP.has(lower)) {
      const canonical = TAG_MAP.get(lower);
      if (!seen.has(canonical)) {
        out.push(canonical);
        seen.add(canonical);
      }
      if (canonical !== key) changed.push({ from: key, to: canonical });
    } else {
      if (!seen.has(key)) {
        out.push(key);
        seen.add(key);
      }
    }
  }
  return { tags: out, changed };
}

async function main() {
  ensureDir(DATA_DIR);
  const apply = process.argv.includes("--apply");
  const files = await listMarkdownFiles();

  const summary = {
    filesScanned: 0,
    filesWithChanges: 0,
    typeChanges: {},
    tagChanges: {},
    errors: 0,
    samples: [],
  };

  for (const file of files) {
    const parsed = parseFile(file);
    if (!parsed.ok) {
      summary.errors += 1;
      continue;
    }
    summary.filesScanned += 1;
    const data = { ...parsed.data };
    const beforeType = data.type;
    const beforeTags = Array.isArray(data.tags) || typeof data.tags === "string" ? data.tags : [];

    // Normalize type if present
    let typeChange = null;
    if (beforeType) {
      const canonical = normalizeTypeValue(beforeType);
      if (canonical && canonical !== beforeType) {
        typeChange = { from: beforeType, to: canonical };
        data.type = canonical;
        summary.typeChanges[`${beforeType}→${canonical}`] = (summary.typeChanges[`${beforeType}→${canonical}`] || 0) + 1;
      }
    }

    // Normalize tags
    const { tags: newTags, changed: tagChangedList } = normalizeTagsArray(beforeTags);
    let tagChange = null;
    if (tagChangedList.length > 0) {
      tagChange = tagChangedList;
      data.tags = newTags;
      for (const c of tagChangedList) {
        const k = `${c.from}→${c.to}`;
        summary.tagChanges[k] = (summary.tagChanges[k] || 0) + 1;
      }
    }

    const fileHasChanges = Boolean(typeChange || tagChange);
    if (fileHasChanges) {
      summary.filesWithChanges += 1;
      if (summary.samples.length < 50) {
        summary.samples.push({ file, typeChange, tagChange, beforeTags, afterTags: data.tags || beforeTags });
      }
      if (apply) {
        const out = matter.stringify(parsed.content, data, { lineWidth: 0 });
        // Ensure trailing newline
        const normalized = out.endsWith("\n") ? out : out + "\n";
        fs.writeFileSync(file, normalized, "utf8");
      }
    }
  }

  // Build report
  const lines = [];
  lines.push("# Tag Normalization Report", "");
  lines.push(`Files scanned: ${summary.filesScanned}`);
  lines.push(`Files with proposed changes: ${summary.filesWithChanges}`);
  lines.push(`Files with YAML errors skipped: ${summary.errors}`);
  lines.push("");
  lines.push("## Type changes (proposed)");
  if (Object.keys(summary.typeChanges).length === 0) {
    lines.push("- None");
  } else {
    for (const [k, c] of Object.entries(summary.typeChanges).sort()) {
      lines.push(`- ${k}: ${c}`);
    }
  }
  lines.push("", "## Tag changes (proposed)");
  if (Object.keys(summary.tagChanges).length === 0) {
    lines.push("- None");
  } else {
    for (const [k, c] of Object.entries(summary.tagChanges).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${k}: ${c}`);
    }
  }
  lines.push("", "## Samples");
  for (const s of summary.samples) {
    lines.push(`- ${s.file}`);
    if (s.typeChange) lines.push(`  - type: ${s.typeChange.from} → ${s.typeChange.to}`);
    if (s.tagChange) {
      const parts = s.tagChange.map(c => `${c.from}→${c.to}`).join(", ");
      lines.push(`  - tags: ${parts}`);
    }
  }
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n", "utf8");

  console.log(`${apply ? "Applied" : "Planned"} tag normalization. Report: ${REPORT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


