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
if (!fs.existsSync(peopleIndexPath)) {
  console.error("People index not found. Run `npm run people:index` first.");
  process.exit(1);
}

const peopleIndex = JSON.parse(fs.readFileSync(peopleIndexPath, "utf8"));

function normalizeTagValue(tag) {
  return String(tag).trim().replace(/^['"]|['"]$/g, "");
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

function removeExactListTag(content) {
  let nextContent = content.replace(/  - list\n/g, "");
  nextContent = nextContent.replace(/^tags:\s*\[.*\]\s*$/m, (line) =>
    removeInlineTag(line, "list"),
  );
  return nextContent;
}

let cleaned = 0;
let kept = 0;

for (const [name, info] of Object.entries(peopleIndex)) {
  if (!info.reminders) continue;

  const personPath = path.join(vaultRoot, info.pagePath);
  if (!fs.existsSync(personPath)) continue;

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

    let content = fs.readFileSync(personPath, "utf8");

    // Remove reminders section from frontmatter
    content = content.replace(/\nreminders:\n(?:  [^\n]+\n)+/g, "\n");

    // Remove list tag
    content = removeExactListTag(content);

    // Remove empty agenda sections
    content = content.replace(
      /\n<!-- BEGIN REMINDERS AGENDA -->[\s\S]*?<!-- END REMINDERS AGENDA -->\n/g,
      "",
    );

    fs.writeFileSync(personPath, content);
    cleaned++;
  } else {
    kept++;
  }
}

console.log(`\nCleaned ${cleaned} pages without actual lists`);
console.log(`Kept ${kept} pages with actual lists`);

// Rebuild people index after mutating person pages
console.log("\nRebuilding people index...");
try {
  execFileSync("npm", ["run", "people:index"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
} catch (e) {
  console.log("Failed to rebuild index");
}

console.log("\nDone!");
