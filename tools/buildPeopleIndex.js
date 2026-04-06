#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const dotenv = require("dotenv");
const {
  resolveDailyDir,
  resolveVaultRoot,
} = require("../lib/services/gtdService");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

if (!process.env.DAILY_NOTE_PATH) {
  console.error("DAILY_NOTE_PATH not set");
  process.exit(1);
}

const dailyDir = resolveDailyDir();
const vaultRoot = resolveVaultRoot(dailyDir);
const peopleDir = vaultRoot; // scan root-level for person pages
const indexPath = path.join(vaultRoot, "people.index.json");

function parseFrontmatter(content, fileName) {
  try {
    const { data } = matter(content);
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    console.warn(
      `Warning: failed to parse frontmatter in ${fileName}: ${error.message}`,
    );
    return {};
  }
}

const index = {};
if (fs.existsSync(peopleDir)) {
  const dailyDirName = path.basename(dailyDir);
  const files = fs
    .readdirSync(peopleDir)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => f !== `${new Date().toISOString().slice(0, 10)}.md`)
    .filter((f) => f !== "reminders.md" && f !== "people.index.json")
    .filter((f) => f !== dailyDirName && f !== path.basename(indexPath))
    // Ignore obvious non-person files by prefix patterns
    .filter((f) => !/^\d{4}[-_]/.test(f))
    .filter((f) => !/^\d/.test(f));
  for (const f of files) {
    const filePath = path.join(peopleDir, f);
    const content = fs.readFileSync(filePath, "utf8");
    const fm = parseFrontmatter(content, f);
    const name =
      fm.name && String(fm.name).trim().length
        ? fm.name
        : path.basename(f, ".md");
    const tags = Array.isArray(fm.tags)
      ? fm.tags
      : typeof fm.tags === "string" && fm.tags.length > 0
        ? [fm.tags]
        : [];
    const normalizedTags = new Set(
      tags.map((tag) => String(tag).trim().toLowerCase()),
    );
    const hasPeopleTag =
      normalizedTags.has("person") || normalizedTags.has("people");
    const hasRemindersList =
      fm.reminders &&
      ((typeof fm.reminders === "object" &&
        (fm.reminders.listName || fm.reminders.sharedListName)) ||
        (typeof fm.reminders === "string" && fm.reminders.length > 0));
    // Ensure emails is always an array
    let emails = [];
    if (Array.isArray(fm.emails)) {
      emails = fm.emails.map((email) => String(email).trim()).filter(Boolean);
    } else if (typeof fm.emails === "string" && fm.emails.length > 0) {
      emails = [fm.emails.trim()];
    }
    const hasEmails = emails.length > 0;

    // Include if explicitly tagged person OR has strong signal (emails or reminders list)
    if (!hasPeopleTag && !hasEmails && !hasRemindersList) continue;

    const aliases = Array.isArray(fm.aliases)
      ? fm.aliases
      : typeof fm.aliases === "string" && fm.aliases.length > 0
        ? [fm.aliases]
        : [];
    const pagePath = `${path.basename(f)}`;

    // Support disambiguated names by including qualifiers in aliases:
    // If page name is like "Name (Qualifier)" or "Name - Qualifier", then record both
    const nameAliases = [];
    const m1 = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const m2 = name.match(/^(.+?)\s*-\s*(.+)$/);
    if (m1) {
      nameAliases.push(m1[1].trim());
      nameAliases.push(`${m1[1].trim()} - ${m1[2].trim()}`);
    } else if (m2) {
      nameAliases.push(m2[1].trim());
      nameAliases.push(`${m2[1].trim()} (${m2[2].trim()})`);
    }

    // Use name as the key in the index (not personId)
    index[name] = {
      name,
      pagePath,
      aliases: Array.from(new Set([...(aliases || []), ...nameAliases])),
      emails,
    };

    // Only add reminders if explicitly configured
    if (fm.reminders && typeof fm.reminders === "object") {
      index[name].reminders = fm.reminders;
    } else if (typeof fm.reminders === "string" && fm.reminders.length > 0) {
      index[name].reminders = {
        listName: fm.reminders,
      };
    }
  }
}

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`Wrote ${indexPath}`);
