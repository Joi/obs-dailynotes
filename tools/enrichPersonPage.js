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

function orderFrontmatterFields(frontmatter) {
  const ordered = {};
  const priorityKeys = ["tags", "name", "emails", "aliases", "reminders"];
  const otherKeys = Object.keys(frontmatter).filter(
    (key) => !priorityKeys.includes(key),
  );

  for (const key of [...priorityKeys, ...otherKeys]) {
    if (frontmatter[key] !== undefined) {
      ordered[key] = frontmatter[key];
    }
  }

  return ordered;
}

function hasRemindersAgendaBlock(text) {
  return /<!-- BEGIN REMINDERS AGENDA -->[\s\S]*?<!-- END REMINDERS AGENDA -->/.test(
    text,
  );
}

function serializeRemindersConfig(reminders) {
  if (!reminders || typeof reminders !== "object") return null;

  const lines = ["reminders:"];
  for (const [key, value] of Object.entries(reminders)) {
    if (value === undefined) continue;

    if (typeof value === "string") {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`  ${key}: ${String(value)}`);
    }
  }

  return lines.join("\n");
}

function restoreQuotedRemindersConfig(text, reminders) {
  const serializedReminders = serializeRemindersConfig(reminders);
  if (!serializedReminders) return text;

  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return text;

  const frontmatter = frontmatterMatch[1];
  const body = text.slice(frontmatterMatch[0].length);
  const nextFrontmatter = frontmatter.includes("reminders:")
    ? frontmatter.replace(
        /^reminders:\n(?:  .*(?:\n|$))*/m,
        serializedReminders,
      )
    : `${frontmatter}\n${serializedReminders}`;

  return `---\n${nextFrontmatter}\n---${body}`;
}

// Build the new body content, then serialize frontmatter with gray-matter so
// values that require quoting stay valid YAML.
let bodyContent = "";

// Add reminders agenda section if person has a list and one is not already present
if (fm.reminders && fm.reminders.listName && !hasRemindersAgendaBlock(body)) {
  bodyContent += "<!-- BEGIN REMINDERS AGENDA -->\n";
  bodyContent += "## Agenda (from Apple Reminders)\n\n";
  bodyContent += "<!-- END REMINDERS AGENDA -->\n\n";
}

// Add basic structure if body is empty or minimal
if (body.trim() === "" || body.trim() === `# ${personName}`) {
  bodyContent += `# ${personName}\n\n`;
  bodyContent += "## Overview\n\n";
  bodyContent += "## Background\n\n";
  if (fm.emails && fm.emails.length > 0) {
    bodyContent += "## Contact\n";
    fm.emails.forEach((email) => {
      bodyContent += `- Email: ${email}\n`;
    });
    bodyContent += "\n";
  }
  bodyContent += "## Notes\n\n";
} else {
  // Preserve existing body content
  if (!body.includes(`# ${personName}`)) {
    bodyContent += `# ${personName}\n\n`;
  }
  bodyContent += body;
}

const newContent = restoreQuotedRemindersConfig(
  matter.stringify(bodyContent, orderFrontmatterFields(fm), {
    lineWidth: 0,
  }),
  fm.reminders,
);

// Write the updated content
function normalizeSpacing(text) {
  let t = String(text).replace(/\r\n/g, "\n");
  t = t.replace(/[ \t]+$/gm, "");
  t = t.replace(/^(---[\s\S]*?---)\n+/m, "$1\n\n");
  t = t.replace(/\n[ \t]*(?:\n[ \t]*){1,}/g, "\n\n");
  t = t.replace(/\s+$/m, "").trimEnd() + "\n";
  return t;
}
const normalizedNewContent = normalizeSpacing(newContent);
const pageChanged = normalizedNewContent !== content;

if (pageChanged) {
  fs.writeFileSync(fullPath, normalizedNewContent);
  console.log(`✓ Updated ${personName}'s page`);
} else {
  console.log(`✓ ${personName}'s page already up to date`);
}

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
if (pageChanged) {
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
} else {
  console.log("People index already up to date.");
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
