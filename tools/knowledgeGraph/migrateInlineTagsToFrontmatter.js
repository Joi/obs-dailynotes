#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const matter = require("gray-matter");

const REPO_ROOT = "/Users/<Owner>/obs-dailynotes";
const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || "/Users/<Owner>/switchboard";
const DATA_DIR = path.join(REPO_ROOT, "data");
const REPORT_MD = path.join(DATA_DIR, "migrate_inline_tags_report.md");

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

function toArrayTags(tags) {
  if (Array.isArray(tags)) return tags.slice();
  if (typeof tags === "string") {
    // split by commas or whitespace
    return tags.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

function removeInlineTagFromLine(line, tag) {
  // remove standalone hashtag tokens e.g. " #person", "#person ", "#person\n", at boundaries
  // avoid touching code blocks handled elsewhere
  const pattern = new RegExp(`(^|\\s)#${tag}(\\b)`, "g");
  return line.replace(pattern, (m, p1, p2) => `${p1}`); // drop the hashtag token
}

function processBody(body) {
  const lines = body.split(/\n/);
  let inCode = false;
  let foundPerson = false;
  let foundIdea = false;
  let foundOrg = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const hasPerson = /(^|\s)#person(\b)/.test(line);
    const hasIdea = /(^|\s)#idea(\b)/.test(line);
    const hasOrg = /(^|\s)#organization(\b)/.test(line);
    if (hasPerson || hasIdea || hasOrg) {
      let newLine = line;
      if (hasPerson) {
        newLine = removeInlineTagFromLine(newLine, "person");
        foundPerson = true;
      }
      if (hasIdea) {
        newLine = removeInlineTagFromLine(newLine, "idea");
        foundIdea = true;
      }
      if (hasOrg) {
        newLine = removeInlineTagFromLine(newLine, "organization");
        foundOrg = true;
      }
      lines[i] = newLine;
    }
  }
  return { content: lines.join("\n"), foundPerson, foundIdea, foundOrg };
}

async function main() {
  ensureDir(DATA_DIR);
  const apply = process.argv.includes("--apply");
  const files = await listMarkdownFiles();
  const report = [];
  let changedFiles = 0;
  let addedPerson = 0;
  let addedIdea = 0;
  let addedOrg = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    let fm = {};
    let content = raw;
    let hadFrontmatter = false;
    try {
      const parsed = matter(raw);
      fm = parsed.data || {};
      content = parsed.content || "";
      hadFrontmatter = Object.keys(parsed.data || {}).length > 0 || /^(---\n[\s\S]*?\n---\n)/.test(raw);
    } catch (_) {
      // malformed FM, treat whole file as body
      fm = {};
      content = raw;
      hadFrontmatter = false;
    }

    const { content: newBody, foundPerson, foundIdea, foundOrg } = processBody(content);
    if (!foundPerson && !foundIdea && !foundOrg) continue;

    const tags = toArrayTags(fm.tags);
    let updated = false;
    if (foundPerson && !tags.includes("person")) {
      tags.push("person");
      addedPerson++;
      updated = true;
    }
    if (foundIdea && !tags.includes("idea")) {
      tags.push("idea");
      addedIdea++;
      updated = true;
    }

    if (foundOrg) {
      const tags = toArrayTags(fm.tags);
      if (!tags.includes("organization")) {
        tags.push("organization");
        fm.tags = Array.from(new Set(tags));
        addedOrg++;
        updated = true;
      }
    }

    if (!updated && newBody === content) continue;

    fm.tags = Array.from(new Set(tags));
    const out = matter.stringify(newBody, fm, { lineWidth: 0 });
    const normalized = out.endsWith("\n") ? out : out + "\n";
    report.push(`- ${file} ${foundPerson ? "[+person]" : ""}${foundIdea ? "[+idea]" : ""}`);
    if (apply) {
      fs.writeFileSync(file, normalized, "utf8");
    }
    changedFiles++;
  }

  const lines = [];
  lines.push("# Migrate Inline Tags To Frontmatter Report", "");
  lines.push(`Files ${apply ? "updated" : "to update"}: ${changedFiles}`);
  lines.push(`- Added 'person' to frontmatter: ${addedPerson}`);
  lines.push(`- Added 'idea' to frontmatter: ${addedIdea}`);
  lines.push("");
  lines.push("## Files");
  lines.push(...report);
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n", "utf8");
  console.log(`${apply ? "Applied" : "Planned"} migration. Report: ${REPORT_MD}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


