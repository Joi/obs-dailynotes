const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  parseZoom,
  parseTeams,
  parseWebex,
  parseOtherMeetingType,
} = require("../../lib/parsers");
const {
  parseReminderListOutput,
  resolveDailyDir,
  resolveVaultRoot,
} = require("../../lib/services/gtdService");

function makeEvent({
  summary = "Test",
  start = "2025-08-13T10:00:00Z",
  end = "2025-08-13T10:30:00Z",
  location = "",
  description = "",
}) {
  return {
    summary,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: [
      { email: "alice@example.com", displayName: "Alice" },
      { email: "bob@example.com", displayName: "Bob" },
    ],
    location,
    description,
  };
}

describe("Parsers: meeting URL detection", () => {
  test("detects Zoom link from location", () => {
    const ev = makeEvent({ location: "https://us06web.zoom.us/j/123456789" });
    const out = parseZoom(ev);
    expect(out).toBeTruthy();
    expect(out.url).toContain("zoom.us");
  });

  test("detects Teams link from description", () => {
    const ev = makeEvent({
      description: "Join here: https://teams.microsoft.com/l/meetup-join/abc",
    });
    const out = parseTeams(ev);
    expect(out).toBeTruthy();
    expect(out.url).toContain("teams.microsoft.com");
  });

  test("detects Webex link from summary", () => {
    const ev = makeEvent({
      summary: "Standup https://company.webex.com/meet/room",
    });
    const out = parseWebex(ev);
    expect(out).toBeTruthy();
    expect(out.url).toContain("webex.com");
  });

  test("falls back to in-person when only location text", () => {
    const ev = makeEvent({ location: "Conference Room A" });
    const out = parseOtherMeetingType(ev);
    expect(out).toBeTruthy();
    expect(out.url).toBe("");
    expect(out.location).toBe("Conference Room A");
  });
});

describe("gtdService path helpers", () => {
  const projectRoot = path.resolve(__dirname, "../..");
  const originalDailyNotePath = process.env.DAILY_NOTE_PATH;
  const originalHome = process.env.HOME;

  function restoreEnv(name, value) {
    if (value === undefined) {
      delete process.env[name];
      return;
    }
    process.env[name] = value;
  }

  afterEach(() => {
    restoreEnv("DAILY_NOTE_PATH", originalDailyNotePath);
    restoreEnv("HOME", originalHome);
  });

  test("resolveDailyDir expands a leading tilde from DAILY_NOTE_PATH", () => {
    process.env.HOME = "/tmp/test-home";
    process.env.DAILY_NOTE_PATH = "~/switchboard/dailynote";

    expect(resolveDailyDir()).toBe("/tmp/test-home/switchboard/dailynote");
  });

  test("resolveVaultRoot derives the vault root from the resolved daily dir", () => {
    process.env.HOME = "/tmp/test-home";
    process.env.DAILY_NOTE_PATH = "~/switchboard/dailynote";

    expect(resolveVaultRoot(resolveDailyDir())).toBe(
      "/tmp/test-home/switchboard",
    );
  });

  test("resolveVaultRoot falls back to the default vault root when DAILY_NOTE_PATH is unset", () => {
    delete process.env.DAILY_NOTE_PATH;

    expect(resolveVaultRoot()).toBe("/Users/<Owner>/switchboard");
  });

  test("parseReminderListOutput trims whitespace and drops blank lines", () => {
    expect(parseReminderListOutput("\n  Inbox \n\n Shared List  \r\n")).toEqual(
      ["Inbox", "Shared List"],
    );
  });

  test("parseReminderListOutput returns an empty list for nullish input", () => {
    expect(parseReminderListOutput(undefined)).toEqual([]);
    expect(parseReminderListOutput(null)).toEqual([]);
  });

  test("buildPeopleIndex skips malformed frontmatter and still indexes shared reminder-only pages", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "people-index-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");

    fs.mkdirSync(dailyDir, { recursive: true });

    fs.writeFileSync(
      path.join(vaultRoot, "Shared Person.md"),
      `---
name: Shared Person
reminders:
  sharedListName: "<Owner>/Shared To Do"
---

# Shared Person
`,
    );

    fs.writeFileSync(
      path.join(vaultRoot, "Broken Person.md"),
      `---
name: Broken Person
tags: [people
---

# Broken Person
`,
    );

    try {
      expect(() =>
        execFileSync("node", ["tools/buildPeopleIndex.js"], {
          cwd: projectRoot,
          env: {
            ...process.env,
            DAILY_NOTE_PATH: dailyDir,
          },
          encoding: "utf8",
        }),
      ).not.toThrow();

      const index = JSON.parse(
        fs.readFileSync(path.join(vaultRoot, "people.index.json"), "utf8"),
      );

      expect(index["Shared Person"]).toMatchObject({
        name: "Shared Person",
        pagePath: "Shared Person.md",
        reminders: {
          sharedListName: "<Owner>/Shared To Do",
        },
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("tagPeopleWithLists adds the list tag when tags are the last frontmatter block", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tag-people-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const binDir = path.join(tempRoot, "bin");
    const personPath = path.join(vaultRoot, "Jane Doe.md");
    const remindersPath = path.join(binDir, "reminders");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags:
  - people
---

# Jane Doe
`,
    );
    fs.writeFileSync(
      path.join(vaultRoot, "people.index.json"),
      JSON.stringify(
        {
          "Jane Doe": {
            name: "Jane Doe",
            pagePath: "Jane Doe.md",
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      remindersPath,
      '#!/bin/sh\nif [ "$1" = "show-lists" ]; then\n  printf "Jane Doe\\n"\nelse\n  exit 1\nfi\n',
    );
    fs.chmodSync(remindersPath, 0o755);

    try {
      execFileSync("node", ["tools/tagPeopleWithLists.js"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          DAILY_NOTE_PATH: dailyDir,
          PATH: `${binDir}:${process.env.PATH}`,
        },
        encoding: "utf8",
      });

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).toContain("  - list");
      expect(updated).toContain('listName: "Jane Doe"');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("tagPeopleWithLists keeps tags valid when reminders already follow the tags block", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tag-people-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const binDir = path.join(tempRoot, "bin");
    const personPath = path.join(vaultRoot, "Jane Doe.md");
    const remindersPath = path.join(binDir, "reminders");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags:
  - people
reminders:
  listName: "Jane Doe"
---

# Jane Doe
`,
    );
    fs.writeFileSync(
      path.join(vaultRoot, "people.index.json"),
      JSON.stringify(
        {
          "Jane Doe": {
            name: "Jane Doe",
            pagePath: "Jane Doe.md",
            reminders: {
              listName: "Jane Doe",
            },
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      remindersPath,
      '#!/bin/sh\nif [ "$1" = "show-lists" ]; then\n  printf "Jane Doe\\n"\nelse\n  exit 1\nfi\n',
    );
    fs.chmodSync(remindersPath, 0o755);

    try {
      execFileSync("node", ["tools/tagPeopleWithLists.js"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          DAILY_NOTE_PATH: dailyDir,
          PATH: `${binDir}:${process.env.PATH}`,
        },
        encoding: "utf8",
      });

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).toContain("tags:\n  - people\n  - list\nreminders:");
      expect(updated).not.toContain("  - people  - list");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("tagPeopleWithLists does not confuse substring matches for the list tag in inline tags", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tag-people-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const binDir = path.join(tempRoot, "bin");
    const personPath = path.join(vaultRoot, "Jane Doe.md");
    const remindersPath = path.join(binDir, "reminders");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags: [people, playlist]
---

# Jane Doe
`,
    );
    fs.writeFileSync(
      path.join(vaultRoot, "people.index.json"),
      JSON.stringify(
        {
          "Jane Doe": {
            name: "Jane Doe",
            pagePath: "Jane Doe.md",
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      remindersPath,
      '#!/bin/sh\nif [ "$1" = "show-lists" ]; then\n  printf "Jane Doe\\n"\nelse\n  exit 1\nfi\n',
    );
    fs.chmodSync(remindersPath, 0o755);

    try {
      execFileSync("node", ["tools/tagPeopleWithLists.js"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          DAILY_NOTE_PATH: dailyDir,
          PATH: `${binDir}:${process.env.PATH}`,
        },
        encoding: "utf8",
      });

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).toContain("tags: [people, playlist, list]");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("tagPeopleWithLists does not confuse substring matches for the list tag in block tags", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tag-people-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const binDir = path.join(tempRoot, "bin");
    const personPath = path.join(vaultRoot, "Jane Doe.md");
    const remindersPath = path.join(binDir, "reminders");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags:
  - people
  - playlist
---

# Jane Doe
`,
    );
    fs.writeFileSync(
      path.join(vaultRoot, "people.index.json"),
      JSON.stringify(
        {
          "Jane Doe": {
            name: "Jane Doe",
            pagePath: "Jane Doe.md",
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      remindersPath,
      '#!/bin/sh\nif [ "$1" = "show-lists" ]; then\n  printf "Jane Doe\\n"\nelse\n  exit 1\nfi\n',
    );
    fs.chmodSync(remindersPath, 0o755);

    try {
      execFileSync("node", ["tools/tagPeopleWithLists.js"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          DAILY_NOTE_PATH: dailyDir,
          PATH: `${binDir}:${process.env.PATH}`,
        },
        encoding: "utf8",
      });

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).toContain("tags:\n  - people\n  - playlist\n  - list\n");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("tagPeopleWithLists enriches an existing reminders block when a shared list exists", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tag-people-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const binDir = path.join(tempRoot, "bin");
    const personPath = path.join(vaultRoot, "Jane Doe.md");
    const remindersPath = path.join(binDir, "reminders");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags:
  - people
reminders:
  listName: "Jane Doe"
---

# Jane Doe
`,
    );
    fs.writeFileSync(
      path.join(vaultRoot, "people.index.json"),
      JSON.stringify(
        {
          "Jane Doe": {
            name: "Jane Doe",
            pagePath: "Jane Doe.md",
            reminders: {
              listName: "Jane Doe",
            },
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      remindersPath,
      '#!/bin/sh\nif [ "$1" = "show-lists" ]; then\n  printf "<Owner>/Jane To Do\\n"\nelse\n  exit 1\nfi\n',
    );
    fs.chmodSync(remindersPath, 0o755);

    try {
      execFileSync("node", ["tools/tagPeopleWithLists.js"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          DAILY_NOTE_PATH: dailyDir,
          PATH: `${binDir}:${process.env.PATH}`,
        },
        encoding: "utf8",
      });

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).toContain('listName: "Jane Doe"');
      expect(updated).toContain('sharedListName: "<Owner>/Jane To Do"');
      expect(updated).toContain("isShared: true");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("enrichPersonPage preserves existing nested reminders config", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-person-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const personPath = path.join(vaultRoot, "Jane Doe.md");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags:
  - people
aliases:
  - Jane
reminders:
  listName: "Jane Doe"
  sharedListName: "<Owner>/Jane To Do"
  isShared: true
---

# Jane Doe

## Notes
`,
    );

    try {
      execFileSync(
        "node",
        ["tools/enrichPersonPage.js", "Jane Doe.md", "--no-list"],
        {
          cwd: projectRoot,
          env: {
            ...process.env,
            DAILY_NOTE_PATH: dailyDir,
          },
          encoding: "utf8",
        },
      );

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).toContain('listName: "Jane Doe"');
      expect(updated).toContain('sharedListName: "<Owner>/Jane To Do"');
      expect(updated).toContain("isShared: true");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("enrichPersonPage does not duplicate an existing reminders agenda block", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-person-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const personPath = path.join(vaultRoot, "Jane Doe.md");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags:
  - people
reminders:
  listName: "Jane Doe"
---

<!-- BEGIN REMINDERS AGENDA -->
## Agenda (from Apple Reminders)

<!-- END REMINDERS AGENDA -->

# Jane Doe

## Notes
`,
    );

    try {
      execFileSync(
        "node",
        ["tools/enrichPersonPage.js", "Jane Doe.md", "--no-list"],
        {
          cwd: projectRoot,
          env: {
            ...process.env,
            DAILY_NOTE_PATH: dailyDir,
          },
          encoding: "utf8",
        },
      );

      const updated = fs.readFileSync(personPath, "utf8");
      expect(
        updated.match(/<!-- BEGIN REMINDERS AGENDA -->/g) || [],
      ).toHaveLength(1);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("enrichPersonPage ignores substring matches when detecting body list tags", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "enrich-person-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const binDir = path.join(tempRoot, "bin");
    const personPath = path.join(vaultRoot, "Jane Doe.md");
    const npmPath = path.join(binDir, "npm");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags:
  - people
---

# Jane Doe

## Notes

We were #listening closely during the meeting.
`,
    );
    fs.writeFileSync(npmPath, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(npmPath, 0o755);

    try {
      execFileSync("node", ["tools/enrichPersonPage.js", "Jane Doe.md"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          DAILY_NOTE_PATH: dailyDir,
          PATH: `${binDir}:${process.env.PATH}`,
        },
        encoding: "utf8",
      });

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).not.toContain("  - list");
      expect(updated).not.toContain("reminders:");
      expect(updated).toContain("#listening closely");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("cleanupRemindersConfig removes only the exact list tag from inline tags", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanup-reminders-"));
    const vaultRoot = path.join(tempRoot, "vault");
    const dailyDir = path.join(vaultRoot, "dailynote");
    const binDir = path.join(tempRoot, "bin");
    const personPath = path.join(vaultRoot, "Jane Doe.md");
    const remindersPath = path.join(binDir, "reminders");
    const npmPath = path.join(binDir, "npm");

    fs.mkdirSync(dailyDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      personPath,
      `---
name: Jane Doe
tags: [list, playlist, people]
reminders:
  listName: "Jane Doe"
---

<!-- BEGIN REMINDERS AGENDA -->
## Agenda (from Apple Reminders)

<!-- END REMINDERS AGENDA -->

# Jane Doe
`,
    );
    fs.writeFileSync(
      path.join(vaultRoot, "people.index.json"),
      JSON.stringify(
        {
          "Jane Doe": {
            name: "Jane Doe",
            pagePath: "Jane Doe.md",
            reminders: {
              listName: "Jane Doe",
            },
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      remindersPath,
      '#!/bin/sh\nif [ "$1" = "show-lists" ]; then\n  exit 0\nelse\n  exit 1\nfi\n',
    );
    fs.writeFileSync(npmPath, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(remindersPath, 0o755);
    fs.chmodSync(npmPath, 0o755);

    try {
      execFileSync("node", ["tools/cleanupRemindersConfig.js"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          DAILY_NOTE_PATH: dailyDir,
          PATH: `${binDir}:${process.env.PATH}`,
        },
        encoding: "utf8",
      });

      const updated = fs.readFileSync(personPath, "utf8");
      expect(updated).not.toContain("reminders:");
      expect(updated).not.toContain("<!-- BEGIN REMINDERS AGENDA -->");
      expect(updated).toContain("playlist");
      expect(updated).not.toMatch(/\blist\b/);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
