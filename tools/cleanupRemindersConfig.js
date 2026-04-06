#!/usr/bin/env node
/**
 * Remove reminders configuration from people who don't actually have Apple Reminder lists
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { execFileSync } = require("child_process");
const {
  parseReminderListOutput,
  resolveVaultRoot,
} = require("../lib/services/gtdService");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const vaultRoot = resolveVaultRoot();

console.log("Cleaning up reminders configuration...\n");

// Get all actual reminder lists
let allLists;
try {
  const listsOutput = execFileSync("reminders", ["show-lists"], {
    encoding: "utf8",
  });
  allLists = parseReminderListOutput(listsOutput);
  console.log(`Found ${allLists.length} actual Apple Reminder lists\n`);
} catch (e) {
  console.error("Failed to get reminder lists:", e.message);
  process.exit(1);
}

// Convert to Set for faster lookup
const listsSet = new Set(allLists);

// Load people index
const peopleIndexPath = path.join(vaultRoot, "people.index.json");
let peopleIndex;
try {
  peopleIndex = JSON.parse(fs.readFileSync(peopleIndexPath, "utf8"));
} catch (error) {
  if (error && error.code === "ENOENT") {
    console.error("People index not found. Run `npm run people:index` first.");
    process.exit(1);
  }
  throw error;
}

function normalizeTagValue(tag) {
  return String(tag)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function removeInlineTag(line, targetTag) {
  const match = line.match(/^(tags:\s*\[)(.*)(\]\s*)$/);
  if (!match) return line;

  const [, prefix, rawTags, suffix] = match;
  const remainingTags = rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => normalizeTagValue(tag) !== targetTag);

  return `${prefix}${remainingTags.join(", ")}${suffix}`;
}

function parseInlineTagsLine(line) {
  const match = line.match(/^tags:\s*\[(.*)\]\s*$/);
  if (!match) return null;

  return match[1]
    .split(",")
    .map((tag) => normalizeTagValue(tag))
    .filter(Boolean);
}

function splitFrontmatterDocument(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
  if (!match) return null;

  return {
    frontmatter: match[1],
    body: match[2],
  };
}

function removeExactListTag(frontmatter) {
  const lines = frontmatter.split(/\n/);
  const nextLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.startsWith("tags:")) {
      nextLines.push(line);
      continue;
    }

    const inlineTags = parseInlineTagsLine(line);
    if (inlineTags) {
      const nextLine = removeInlineTag(line, "list");
      if ((parseInlineTagsLine(nextLine) || []).length > 0) {
        nextLines.push(nextLine);
      }
      continue;
    }

    const tagLines = [];
    let removedListTag = false;
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith("  ")) {
      const tagLine = lines[j];
      if (
        tagLine.startsWith("  - ") &&
        normalizeTagValue(tagLine.replace(/^\s*-\s*/, "")) === "list"
      ) {
        removedListTag = true;
      } else {
        tagLines.push(tagLine);
      }
      j += 1;
    }

    if (tagLines.length > 0 || !removedListTag) {
      nextLines.push(line);
      nextLines.push(...tagLines);
    }

    i = j - 1;
  }

  return nextLines.join("\n");
}

let cleaned = 0;
let kept = 0;

for (const [name, info] of Object.entries(peopleIndex)) {
  if (!info.reminders) continue;

  const personPath = path.join(vaultRoot, info.pagePath);

  // Check if this person actually has a list
  let hasActualList = false;

  // Check personal list
  if (listsSet.has(name)) {
    hasActualList = true;
  }

  // Check configured lists
  if (info.reminders.listName && listsSet.has(info.reminders.listName)) {
    hasActualList = true;
  }

  if (
    info.reminders.sharedListName &&
    listsSet.has(info.reminders.sharedListName)
  ) {
    hasActualList = true;
  }

  // Check common shared list patterns
  const firstName = name.split(" ")[0];
  if (listsSet.has(`<Owner>/${firstName} To Do`)) {
    hasActualList = true;
  }

  if (!hasActualList) {
    // Remove reminders config and list tag
    console.log(`Cleaning ${name} (no actual list)`);

    let content;
    try {
      content = fs.readFileSync(personPath, "utf8");
    } catch (error) {
      if (error && error.code === "ENOENT") continue;
      throw error;
    }

    const parsed = splitFrontmatterDocument(content);
    if (parsed) {
      let frontmatter = parsed.frontmatter.replace(
        /(^|\n)reminders:\n(?:  [^\n]+(?:\n|$))+/g,
        "$1",
      );
      frontmatter = removeExactListTag(frontmatter)
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\n+$/, "");

      const body = parsed.body.replace(
        /\n<!-- BEGIN REMINDERS AGENDA -->[\s\S]*?<!-- END REMINDERS AGENDA -->\n/g,
        "",
      );

      content = `---\n${frontmatter}\n---${body}`;
    } else {
      content = content.replace(
        /\n<!-- BEGIN REMINDERS AGENDA -->[\s\S]*?<!-- END REMINDERS AGENDA -->\n/g,
        "",
      );
    }

    fs.writeFileSync(personPath, content);
    cleaned++;
  } else {
    kept++;
  }
}

console.log(`\nCleaned ${cleaned} pages without actual lists`);
console.log(`Kept ${kept} pages with actual lists`);

// Rebuild people index after mutating person pages
if (cleaned > 0) {
  console.log("\nRebuilding people index...");
  try {
    execFileSync("npm", ["run", "people:index"], {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
  } catch (e) {
    console.log("Failed to rebuild index");
  }
} else {
  console.log("\nPeople index already up to date.");
}

console.log("\nDone!");
