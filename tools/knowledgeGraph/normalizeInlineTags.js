#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const REPO_ROOT = "/Users/joi/obs-dailynotes";
const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || "/Users/joi/switchboard";
const DATA_DIR = path.join(REPO_ROOT, "data");
const REPORT_MD = path.join(DATA_DIR, "inline_tag_normalization_report.md");

const REPLACEMENTS = [
  { from: /(^|\s)#person_p(\b)/g, to: "$1#person$2" },
  { from: /(^|\s)#people_p(\b)/g, to: "$1#person$2" },
  { from: /(^|\s)#people(\b)/g, to: "$1#person$2" },
  { from: /(^|\s)#ideas_p(\b)/g, to: "$1#idea$2" },
  { from: /(^|\s)#org_p(\b)/g, to: "$1#organization$2" },
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

function processFile(content) {
  const lines = content.split(/\n/);
  let inCodeBlock = false;
  let inFrontmatter = false;
  let changed = false;
  let counts = { person_p: 0, people_p: 0, people: 0, ideas_p: 0, org_p: 0 };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // toggle frontmatter fence only at top section
    if (i === 0 && line.trim() === "---") {
      inFrontmatter = true;
      continue;
    } else if (inFrontmatter && line.trim() === "---") {
      inFrontmatter = false;
      continue;
    }
    // code blocks
    if (!inFrontmatter && /^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || inFrontmatter) continue;

    let newLine = line;
    for (const rep of REPLACEMENTS) {
      if (rep.from.test(newLine)) {
        const before = newLine;
        newLine = newLine.replace(rep.from, rep.to);
        if (before !== newLine) {
          changed = true;
          if (String(rep.to).includes("#person")) counts.person_p += 1;
          if (String(rep.to).includes("#person")) counts.people += 1;
          if (String(rep.to).includes("#idea")) counts.ideas_p += 1;
          if (String(rep.to).includes("#organization")) counts.org_p += 1;
        }
      }
    }
    lines[i] = newLine;
  }
  return { changed, content: lines.join("\n"), counts };
}

async function main() {
  ensureDir(DATA_DIR);
  const apply = process.argv.includes("--apply");
  const files = await listMarkdownFiles();
  const report = [];
  let filesChanged = 0;
  let totalCounts = { person_p: 0, people_p: 0, ideas_p: 0 };
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const { changed, content, counts } = processFile(raw);
    if (changed) {
      filesChanged += 1;
      totalCounts.person_p += counts.person_p;
      totalCounts.people_p += counts.people_p;
      totalCounts.ideas_p += counts.ideas_p;
      report.push(`- ${file} (person_p→person: ${counts.person_p}, ideas_p→idea: ${counts.ideas_p})`);
      if (apply) fs.writeFileSync(file, content, "utf8");
    }
  }

  const lines = [];
  lines.push("# Inline Tag Normalization Report", "");
  lines.push(`Files changed${apply ? " (applied)" : " (planned)"}: ${filesChanged}`);
  lines.push(`- person_p → person: ${totalCounts.person_p}`);
  lines.push(`- ideas_p → idea: ${totalCounts.ideas_p}`);
  lines.push("");
  lines.push("## Files");
  lines.push(...report);
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n", "utf8");
  console.log(`${apply ? "Applied" : "Planned"} inline tag normalization. Report: ${REPORT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


