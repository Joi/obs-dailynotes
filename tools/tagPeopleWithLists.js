#!/usr/bin/env node
/**
 * Find all people who have Apple Reminder lists and add #list tag to their pages
 * This enables faster sync by only checking people with lists
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

console.log("Finding people with Apple Reminder lists...\n");

// Get all reminder lists
let allLists;
try {
  const listsOutput = execFileSync("reminders", ["show-lists"], {
    encoding: "utf8",
  });
  allLists = parseReminderListOutput(listsOutput);
  console.log(`Found ${allLists.length} Apple Reminder lists\n`);
} catch (e) {
  console.error("Failed to get reminder lists:", e.message);
  process.exit(1);
}

const listsSet = new Set(allLists);

// Load people index
const peopleIndexPath = path.join(vaultRoot, "people.index.json");
if (!fs.existsSync(peopleIndexPath)) {
  console.error("People index not found. Run `npm run people:index` first.");
  process.exit(1);
}
const peopleIndex = JSON.parse(fs.readFileSync(peopleIndexPath, "utf8"));

// Track updates
const updates = {
  tagged: [],
  alreadyTagged: [],
  notFound: [],
  sharedLists: [],
};

function normalizeTagValue(tag) {
  return String(tag).trim().replace(/^['"]|['"]$/g, "");
}

function parseInlineTagsLine(line) {
  const match = line.match(/^tags:\s*\[(.*)\]\s*$/);
  if (!match) return null;

  return match[1]
    .split(",")
    .map((tag) => normalizeTagValue(tag))
    .filter(Boolean);
}

function hasExactListTag(line) {
  if (!line.startsWith("  - ")) return false;
  return normalizeTagValue(line.replace(/^\s*-\s*/, "")) === "list";
}

function appendListTagToInlineTags(line) {
  const match = line.match(/^(tags:\s*\[)(.*)(\]\s*)$/);
  if (!match) return line;

  const [, prefix, rawTags, suffix] = match;
  const trimmedTags = rawTags.trim();
  const nextTags = trimmedTags ? `${trimmedTags}, list` : "list";
  return `${prefix}${nextTags}${suffix}`;
}

// Check each person in the index
for (const [name, info] of Object.entries(peopleIndex)) {
  const personPath = path.join(vaultRoot, info.pagePath);

  // Check if this person has a list
  let hasPersonalList = listsSet.has(name);
  let hasSharedList = false;
  let sharedListName = null;

  // Check for shared lists (e.g., "<Owner>/FirstName To Do")
  const firstName = name.split(" ")[0];
  const possibleSharedLists = [
    `<Owner>/${firstName} To Do`,
    `<Owner>/${name} To Do`,
  ];

  for (const listName of possibleSharedLists) {
    if (listsSet.has(listName)) {
      hasSharedList = true;
      sharedListName = listName;
      break;
    }
  }

  if (hasPersonalList || hasSharedList) {
    // Read the person's page
    if (!fs.existsSync(personPath)) {
      updates.notFound.push(name);
      continue;
    }

    let content = fs.readFileSync(personPath, "utf8");

    // Parse frontmatter
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
      console.log(`Warning: ${name} has no frontmatter, skipping`);
      continue;
    }

    const frontmatterRaw = fmMatch[1];
    const body = content.substring(fmMatch[0].length);

    // Parse tags from frontmatter
    let needsUpdate = false;
    let newFrontmatter = "";
    let hasListTag = false;
    let hasRemindersBlock = false;
    let hasConfiguredListName = false;
    let hasConfiguredSharedListName = false;
    let hasConfiguredIsShared = false;

    const lines = frontmatterRaw.split(/\r?\n/);
    let inTags = false;
    let inReminders = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle tags section
      if (line.startsWith("tags:")) {
        inTags = true;
        newFrontmatter += line + "\n";

        // Check if it's inline array
        const inlineTags = parseInlineTagsLine(line);
        if (inlineTags) {
          hasListTag = inlineTags.includes("list");
          if (!hasListTag) {
            // Add list tag to inline array
            newFrontmatter = newFrontmatter.replace(
              line,
              appendListTagToInlineTags(line),
            );
            needsUpdate = true;
            hasListTag = true;
          }
          inTags = false;
        }
      } else if (inTags && line.startsWith("  - ")) {
        if (hasExactListTag(line)) {
          hasListTag = true;
        }
        newFrontmatter += line + "\n";
      } else if (inTags && !line.startsWith("  ")) {
        // End of tags section
        if (!hasListTag) {
          // Add list tag
          newFrontmatter += "  - list\n" + line + "\n";
          needsUpdate = true;
          hasListTag = true;
        } else {
          newFrontmatter += line + "\n";
        }
        inTags = false;

        // Check if this line starts reminders section
        if (line.startsWith("reminders:")) {
          inReminders = true;
          hasRemindersBlock = true;
        }
      } else if (line.startsWith("reminders:")) {
        inReminders = true;
        hasRemindersBlock = true;
        newFrontmatter += line + "\n";
      } else if (inReminders && line.startsWith("  ")) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("listName:")) {
          hasConfiguredListName = true;
        } else if (trimmedLine.startsWith("sharedListName:")) {
          hasConfiguredSharedListName = true;
        } else if (trimmedLine.startsWith("isShared:")) {
          hasConfiguredIsShared = true;
        }
        newFrontmatter += line + "\n";
      } else if (inReminders) {
        inReminders = false;
        newFrontmatter += line + "\n";
      } else {
        newFrontmatter += line + "\n";
      }
    }

    if (inTags && !hasListTag) {
      newFrontmatter += "  - list\n";
      needsUpdate = true;
      hasListTag = true;
    }

    // If no tags section exists, add it
    if (!frontmatterRaw.includes("tags:")) {
      newFrontmatter = `tags:\n  - people\n  - list\n${newFrontmatter}`;
      needsUpdate = true;
    }

    // Update reminders configuration if needed
    if (!frontmatterRaw.includes("reminders:")) {
      // Add reminders configuration
      const remindersConfig = ["reminders:"];
      if (hasPersonalList) {
        remindersConfig.push(`  listName: "${name}"`);
      }
      if (hasSharedList) {
        if (!hasPersonalList) {
          remindersConfig.push(`  listName: "${name}"`);
        }
        remindersConfig.push(`  sharedListName: "${sharedListName}"`);
        remindersConfig.push(`  isShared: true`);
      }
      newFrontmatter += remindersConfig.join("\n") + "\n";
      needsUpdate = true;
    } else {
      const missingReminderLines = [];
      if ((hasPersonalList || hasSharedList) && !hasConfiguredListName) {
        missingReminderLines.push(`  listName: "${name}"`);
      }
      if (hasSharedList && !hasConfiguredSharedListName) {
        missingReminderLines.push(`  sharedListName: "${sharedListName}"`);
      }
      if (hasSharedList && !hasConfiguredIsShared) {
        missingReminderLines.push("  isShared: true");
      }

      if (hasRemindersBlock && missingReminderLines.length > 0) {
        newFrontmatter = newFrontmatter.replace(
          /(reminders:\n(?:  .*\n)*)/,
          `$1${missingReminderLines.join("\n")}\n`,
        );
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      // Write updated content
      const newContent = `---\n${newFrontmatter}---${body}`;
      fs.writeFileSync(personPath, newContent);

      if (hasSharedList) {
        updates.sharedLists.push(`${name} (${sharedListName})`);
      } else {
        updates.tagged.push(name);
      }

      console.log(`✓ Updated ${name}${hasSharedList ? " (shared list)" : ""}`);
    } else {
      updates.alreadyTagged.push(name);
    }
  }
}

// Report results
console.log("\n=== Summary ===\n");

if (updates.tagged.length > 0) {
  console.log(`Tagged ${updates.tagged.length} people with #list:`);
  updates.tagged.forEach((name) => console.log(`  - ${name}`));
  console.log();
}

if (updates.sharedLists.length > 0) {
  console.log(`Tagged ${updates.sharedLists.length} people with shared lists:`);
  updates.sharedLists.forEach((name) => console.log(`  - ${name}`));
  console.log();
}

if (updates.alreadyTagged.length > 0) {
  console.log(`Already tagged: ${updates.alreadyTagged.length} people`);
}

if (updates.notFound.length > 0) {
  console.log(`\nWarning: Person pages not found for:`);
  updates.notFound.forEach((name) => console.log(`  - ${name}`));
}

// Update people index after mutating person pages
console.log("\nUpdating people index...");
try {
  execFileSync("npm", ["run", "people:index"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
} catch (e) {
  console.log("Failed to rebuild index");
}

console.log("\nDone!");
