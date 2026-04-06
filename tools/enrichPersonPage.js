#!/usr/bin/env node
/**
 * Enrich a basic person page with proper structure and optionally create Apple Reminders list
 * Usage: node enrichPersonPage.js <person-file> [--create-list]
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const dotenv = require("dotenv");
const { execFileSync } = require("child_process");
const {
  extractTags,
  parseReminderListOutput,
  resolveVaultRoot,
} = require("../lib/services/gtdService");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node enrichPersonPage.js <person-file> [options]");
  console.log("Options:");
  console.log("  --create-list    Force create an Apple Reminders list");
  console.log(
    "  --shared         Create as a shared list (<Owner>/<Name> To Do)",
  );
  console.log(
    "  --no-list        Skip list creation even if #list tag is present",
  );
  console.log(
    "\nNote: Lists are automatically created if #list tag is found in the page",
  );
  process.exit(1);
}

const filePath = args[0];
const forceCreateList = args.includes("--create-list");
const createShared = args.includes("--shared");
const skipList = args.includes("--no-list");

// Resolve the file path
const vaultRoot = resolveVaultRoot();
const fullPath = path.isAbsolute(filePath)
  ? filePath
  : path.join(vaultRoot, filePath);

// Read the file
let content;
try {
  content = fs.readFileSync(fullPath, "utf8");
} catch (error) {
  if (error && error.code === "ENOENT") {
    console.error(`File not found: ${fullPath}`);
  } else {
    console.error(`Failed to read file: ${fullPath}`);
  }
  process.exit(1);
}
const personName = path.basename(fullPath, ".md");

// Check if exact #list/#agenda tags exist anywhere in the content
const contentTags = new Set(extractTags(content));
const hasListTag = contentTags.has("list") || contentTags.has("agenda");

// Extract any existing email from the content
const emailMatch = content.match(/^email:\s*(.+)$/m);
const email = emailMatch ? emailMatch[1].trim() : null;

// Function to extract existing frontmatter
function extractFrontmatter(fileContent, fileName) {
  try {
    const parsed = matter(fileContent);
    return {
      fm: parsed.data && typeof parsed.data === "object" ? parsed.data : {},
      body: parsed.content,
    };
  } catch (error) {
    console.error(
      `Failed to parse frontmatter in ${fileName}: ${error.message}`,
    );
    process.exit(1);
  }
}

// Parse existing content
let { fm, body } = extractFrontmatter(content, fullPath);

// Remove email line from body if it exists
body = body.replace(/^email:\s*.+$/m, "").trim();

// Initialize or update frontmatter fields
if (!fm.tags) fm.tags = [];
if (!Array.isArray(fm.tags)) fm.tags = [fm.tags];
if (!fm.tags.includes("people")) fm.tags.push("people");

// Determine if we should create a list
const shouldCreateList =
  !skipList &&
  (forceCreateList ||
    hasListTag ||
    fm.tags.includes("list") ||
    fm.tags.includes("agenda"));

// Add list tag if we're going to create a list
if (shouldCreateList && !fm.tags.includes("list")) {
  fm.tags.push("list");
}

// Set name
if (!fm.name) fm.name = personName;

// Handle emails
if (!fm.emails) fm.emails = [];
if (!Array.isArray(fm.emails)) fm.emails = [fm.emails];
if (email && !fm.emails.includes(email)) {
  fm.emails.push(email);
}

// Set aliases
if (!fm.aliases) fm.aliases = [personName];
if (!Array.isArray(fm.aliases)) fm.aliases = [fm.aliases];

// Handle reminders configuration
if (shouldCreateList) {
  if (!fm.reminders) fm.reminders = {};

  if (createShared) {
    fm.reminders.listName = personName;
    fm.reminders.sharedListName = `<Owner>/${personName.split(" ")[0]} To Do`;
    fm.reminders.isShared = true;
  } else {
    fm.reminders.listName = personName;
  }
}

// Build new frontmatter YAML
function buildYaml(obj) {
  let yaml = "---\n";

  // Order matters for readability
  const order = ["tags", "name", "emails", "aliases", "reminders"];
  const otherKeys = Object.keys(obj).filter((k) => !order.includes(k));
  const allKeys = [...order.filter((k) => obj[k] !== undefined), ...otherKeys];

  for (const key of allKeys) {
    const value = obj[key];

    if (Array.isArray(value)) {
      if (value.length === 0) {
        yaml += `${key}: []\n`;
      } else if (value.length === 1 && key !== "tags") {
        yaml += `${key}:\n  - ${value[0]}\n`;
      } else {
        yaml += `${key}:\n`;
        value.forEach((item) => {
          yaml += `  - ${item}\n`;
        });
      }
    } else if (typeof value === "object" && value !== null) {
      yaml += `${key}:\n`;
      Object.entries(value).forEach(([k, v]) => {
        yaml += `  ${k}: ${typeof v === "string" ? `"${v}"` : v}\n`;
      });
    } else if (typeof value === "boolean") {
      yaml += `${key}: ${value}\n`;
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }

  yaml += "---\n";
  return yaml;
}

function hasRemindersAgendaBlock(text) {
  return /<!-- BEGIN REMINDERS AGENDA -->[\s\S]*?<!-- END REMINDERS AGENDA -->/.test(
    text,
  );
}

// Build the new content
let newContent = buildYaml(fm);

// Add reminders agenda section if person has a list and one is not already present
if (fm.reminders && fm.reminders.listName && !hasRemindersAgendaBlock(body)) {
  newContent += "\n<!-- BEGIN REMINDERS AGENDA -->\n";
  newContent += "## Agenda (from Apple Reminders)\n\n";
  newContent += "<!-- END REMINDERS AGENDA -->\n\n";
}

// Add basic structure if body is empty or minimal
if (body.trim() === "" || body.trim() === `# ${personName}`) {
  newContent += `# ${personName}\n\n`;
  newContent += "## Overview\n\n";
  newContent += "## Background\n\n";
  if (fm.emails && fm.emails.length > 0) {
    newContent += "## Contact\n";
    fm.emails.forEach((email) => {
      newContent += `- Email: ${email}\n`;
    });
    newContent += "\n";
  }
  newContent += "## Notes\n\n";
} else {
  // Preserve existing body content
  if (!body.includes(`# ${personName}`)) {
    newContent += `# ${personName}\n\n`;
  }
  newContent += body;
}

// Write the updated content
function normalizeSpacing(text) {
  let t = String(text).replace(/\r\n/g, "\n");
  t = t.replace(/[ \t]+$/gm, "");
  t = t.replace(/^(---[\s\S]*?---)\n+/m, "$1\n\n");
  t = t.replace(/\n[ \t]*(?:\n[ \t]*){1,}/g, "\n\n");
  t = t.replace(/\s+$/m, "").trimEnd() + "\n";
  return t;
}
fs.writeFileSync(fullPath, normalizeSpacing(newContent));
console.log(`✓ Updated ${personName}'s page`);

// Create Apple Reminders list if needed
if (shouldCreateList) {
  const listName = createShared
    ? `<Owner>/${personName.split(" ")[0]} To Do`
    : personName;

  try {
    // Check if list already exists
    const existingLists = new Set(
      parseReminderListOutput(
        execFileSync("reminders", ["show-lists"], { encoding: "utf8" }),
      ),
    );
    if (existingLists.has(listName)) {
      console.log(`✓ List "${listName}" already exists`);
    } else {
      // Create the list
      execFileSync("reminders", ["new-list", listName]);
      console.log(`✓ Created Apple Reminders list: "${listName}"`);

      // Add a welcome task
      const welcomeTask = createShared
        ? `Shared tasks with ${personName.split(" ")[0]}`
        : `Tasks for ${personName}`;
      try {
        execFileSync("reminders", ["add", listName, welcomeTask]);
        execFileSync("reminders", ["complete", listName, "1"]);
        console.log(`✓ Added welcome task to list`);
      } catch (e) {
        // Ignore if adding welcome task fails
      }
    }
  } catch (e) {
    console.error(`Failed to create list: ${e.message}`);
  }
}

// Update people index after mutating the page
console.log("Updating people index...");
try {
  execFileSync("npm", ["run", "people:index"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
} catch (e) {
  console.log(
    "Note: Failed to update people index. Run manually: npm run people:index",
  );
}

console.log("\nDone! Next steps:");
console.log("1. Run: npm run reminders:pull");
console.log("2. Edit the person page to add more details");
if (shouldCreateList && createShared) {
  const listName = `<Owner>/${personName.split(" ")[0]} To Do`;
  console.log(
    `3. Share the "${listName}" list with ${personName.split(" ")[0]} in Apple Reminders`,
  );
}
