#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const REPO_ROOT = "/Users/joi/obs-dailynotes";
const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || "/Users/joi/switchboard";
const DATA_DIR = path.join(REPO_ROOT, "data");
const REPORT_MD = path.join(DATA_DIR, "tag_validation_report.md");

const DEPRECATED_FRONTMATTER_TAGS = new Set([
  "people",
  "person_p",
  "people_p",
  "ideas_p",
  "idea_p",
  "org_p",
]);

const DEPRECATED_INLINE = [
  /(^|\s)#people(\b)/,
  /(^|\s)#person_p(\b)/,
  /(^|\s)#people_p(\b)/,
  /(^|\s)#ideas_p(\b)/,
  /(^|\s)#org_p(\b)/,
];

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

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  return m[1];
}

function extractFrontmatterTags(fm) {
  if (!fm) return [];
  // Inline array
  const inline = fm.match(/^tags:\s*\[([^\]]*)\]/mi);
  if (inline) {
    return inline[1]
      .split(/[,\s]+/)
      .map((s) => s.replace(/^["']|["']$/g, "").trim())
      .filter(Boolean);
  }
  // Multiline block
  const blockMatch = fm.match(/^tags:\s*\n([\s\S]*?)(?=^\w+:|$)/m);
  if (blockMatch) {
    return blockMatch[1]
      .split(/\n/)
      .map((l) => (l.match(/^\s*-\s*(.+)$/) || [null, null])[1])
      .map((s) => (s ? s.replace(/^["']|["']$/g, "").trim() : ""))
      .filter(Boolean);
  }
  return [];
}

async function main() {
  ensureDir(DATA_DIR);
  const files = await listMarkdownFiles();
  const violations = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(text);
    const tags = extractFrontmatterTags(fm);
    for (const t of tags) {
      if (DEPRECATED_FRONTMATTER_TAGS.has(String(t).toLowerCase())) {
        violations.push({ file, type: "frontmatter", tag: t });
      }
    }
    const body = fm ? text.replace(/^---[\s\S]*?---\r?\n?/, "") : text;
    const lines = body.split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rx of DEPRECATED_INLINE) {
        if (rx.test(line)) {
          violations.push({ file, type: "inline", line: i + 1, snippet: line.trim() });
        }
      }
    }
  }

  const lines = [];
  lines.push("# Tag Validation Report", "");
  if (violations.length === 0) {
    lines.push("No deprecated tags found.");
  } else {
    lines.push(`Deprecated tag occurrences: ${violations.length}`, "");
    for (const v of violations.slice(0, 500)) {
      if (v.type === "frontmatter") {
        lines.push(`- ${v.file}: frontmatter tag '${v.tag}'`);
      } else {
        lines.push(`- ${v.file}:${v.line}: ${v.snippet}`);
      }
    }
    if (violations.length > 500) lines.push(`- ... and ${violations.length - 500} more`);
  }
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n", "utf8");

  if (violations.length > 0) {
    console.error(`Found ${violations.length} deprecated tag occurrences. See ${REPORT_MD}`);
    process.exit(2);
  } else {
    console.log(`OK: No deprecated tags. Report: ${REPORT_MD}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


