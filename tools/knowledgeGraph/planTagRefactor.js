#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const REPO_ROOT = "/Users/joi/obs-dailynotes";
const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || "/Users/joi/switchboard";
const DATA_DIR = path.join(REPO_ROOT, "data");
const REPORT_MD = path.join(DATA_DIR, "tag_refactor_plan.md");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function listTextFiles() {
  const patterns = [
    path.join(REPO_ROOT, "**/*.{js,ts,py,md,mdx,sh}"),
    path.join(SWITCHBOARD_PATH, "**/*.md"),
  ];
  const ignore = ["**/node_modules/**", "**/.git/**", "**/data/**", "**/logs/**"];
  return fg(patterns, { ignore, dot: false, onlyFiles: true, unique: true });
}

function scanFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (_) {
    return null;
  }
  const findings = [];
  const add = (type, lineNo, line) => findings.push({ type, lineNo, line: line.trim() });

  const lines = text.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Frontmatter tag cases
    if (/^tags:\s*\[?[^\]]*\bpeople\b[^\]]*\]?/i.test(line)) {
      add("frontmatter:people-tag", i + 1, line);
    }
    if (/^tags:\s*\[?[^\]]*\borg_p\b[^\]]*\]?/i.test(line)) {
      add("frontmatter:org_p-tag", i + 1, line);
    }
    if (/^tags:\s*people\b/i.test(line)) {
      add("frontmatter:people-inline", i + 1, line);
    }
    if (/^tags:\s*\[?[^\]]*\bpeople_p\b[^\]]*\]?/i.test(line)) {
      add("frontmatter:people_p-tag", i + 1, line);
    }

    // Inline hashtags
    if (/(^|\s)#people(\b|$)/.test(line)) {
      add("inline:#people", i + 1, line);
    }
    if (/(^|\s)#person_p(\b|$)/.test(line)) {
      add("inline:#person_p", i + 1, line);
    }
    if (/(^|\s)#people_p(\b|$)/.test(line)) {
      add("inline:#people_p", i + 1, line);
    }
    if (/(^|\s)#ideas_p(\b|$)/.test(line)) {
      add("inline:#ideas_p", i + 1, line);
    }
    if (/(^|\s)#org_p(\b|$)/.test(line)) {
      add("inline:#org_p", i + 1, line);
    }
    if (/^tags:\s*\[?[^\]]*\bideas_p\b[^\]]*\]?/i.test(line)) {
      add("frontmatter:ideas_p-tag", i + 1, line);
    }

    // Code patterns referencing people tag
    if (/\bpeople\b.*tags|tags.*\bpeople\b/i.test(line)) {
      add("code:people-in-tags-logic", i + 1, line);
    }
    if (/\b"people"\b|\b'people'\b/.test(line) && /tags|frontmatter|yaml|regex|findPeople/i.test(text)) {
      add("code:literal-'people'", i + 1, line);
    }
    if (/\bpeople\b/.test(line) && /findPeople|normalizePerson|buildPeopleIndex/i.test(text)) {
      add("code:symbol-people", i + 1, line);
    }
  }
  return findings.length ? findings : null;
}

async function main() {
  ensureDir(DATA_DIR);
  const files = await listTextFiles();
  const results = [];
  let total = 0;
  for (const f of files) {
    const findings = scanFile(f);
    if (findings) {
      results.push({ file: f, findings });
      total += findings.length;
    }
  }

  const lines = [];
  lines.push("# Tag Refactor Plan (people → person, person_p → person)", "");
  lines.push(`Files with references: ${results.length}`);
  lines.push(`Total findings: ${total}`);
  lines.push("", "## Guidance", "- Replace frontmatter tags to 'tags: [person]'", "- Replace inline '#people' and '#person_p' with '#person' (confirm)", "- Update code/tests to look for 'person' not 'people'", "");

  for (const r of results) {
    lines.push(`### ${r.file}`, "");
    for (const fnd of r.findings.slice(0, 20)) {
      lines.push(`- ${fnd.type} @${fnd.lineNo}: ${fnd.line}`);
    }
    if (r.findings.length > 20) {
      lines.push(`- ... ${r.findings.length - 20} more`);
    }
    lines.push("");
  }

  fs.writeFileSync(REPORT_MD, lines.join("\n"), "utf8");
  console.log(`Refactor plan written: ${REPORT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


