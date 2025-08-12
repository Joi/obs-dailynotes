# Tag Refactor Plan (people → person, person_p → person)

Files with references: 904
Total findings: 1933

## Guidance
- Replace frontmatter tags to 'tags: [person]'
- Replace inline '#people' and '#person_p' with '#person' (confirm)
- Update code/tests to look for 'person' not 'people'

### /Users/joi/obs-dailynotes/INTEGRATION_ARCHITECTURE.md

- code:people-in-tags-logic @19: - `tags`: Include "people" to explicitly mark as a person page
- frontmatter:people-tag @85: tags: [people]
- code:people-in-tags-logic @85: tags: [people]
- frontmatter:people-tag @167: tags: [people, system]
- code:people-in-tags-logic @167: tags: [people, system]
- frontmatter:people-tag @186: tags: [people, list]
- code:people-in-tags-logic @186: tags: [people, list]
- code:people-in-tags-logic @279: The `tagPeopleWithLists.js` tool finds all people with Apple Reminder lists and tags them:

### /Users/joi/obs-dailynotes/README.md

- code:symbol-people @157: - **Collaborative editing** - Multiple people can add/complete tasks in real-time
- code:symbol-people @444: - `npm run people:index` - Build person index
- code:symbol-people @445: - `npm run people:import-csv [file]` - Import contacts
- code:symbol-people @446: - `npm run people:generate` - Extract from daily notes
- code:symbol-people @560: - Run `npm run people:index` to rebuild index
- frontmatter:people-tag @571: tags: [people]
- code:people-in-tags-logic @571: tags: [people]
- code:symbol-people @571: tags: [people]

### /Users/joi/obs-dailynotes/run_tests.py

- code:people-in-tags-logic @246: - Standardize tags from `tags: people` to `tags: [people]`
- frontmatter:people-tag @264: tags: [people]
- code:people-in-tags-logic @264: tags: [people]

### /Users/joi/obs-dailynotes/obsidian-scripts/create-person-from-context.js

- frontmatter:people-tag @83: tags: people
- frontmatter:people-inline @83: tags: people
- code:people-in-tags-logic @83: tags: people

### /Users/joi/obs-dailynotes/obsidian-scripts/extract-person-email.md

- frontmatter:people-tag @36: tags: people
- frontmatter:people-inline @36: tags: people
- code:people-in-tags-logic @36: tags: people
- frontmatter:people-tag @70: tags: people
- frontmatter:people-inline @70: tags: people
- code:people-in-tags-logic @70: tags: people

### /Users/joi/obs-dailynotes/tests/conftest.py

- frontmatter:people-tag @40: tags: [people]
- code:people-in-tags-logic @40: tags: [people]

### /Users/joi/obs-dailynotes/tools/batchEnrichPeople.js

- code:symbol-people @3: * Batch enrichment runner for a small list of people

### /Users/joi/obs-dailynotes/tools/buildPeopleIndex.js

- code:people-in-tags-logic @116: const hasPeopleTag = tags.includes('people');

### /Users/joi/obs-dailynotes/tools/enrichFromLLM.js

- code:people-in-tags-logic @898: fs.writeFileSync(fullPath, `---\nname: ${personKey}\ntags: [people]\n---\n\n# ${personKey}\n`);

### /Users/joi/obs-dailynotes/tools/enrichPersonPage.js

- code:people-in-tags-logic @110: if (!fm.tags.includes('people')) fm.tags.push('people');

### /Users/joi/obs-dailynotes/tools/findPeoplePages.js

- code:people-in-tags-logic @40: // Inline: tags: [people, ...] OR tags: people
- code:people-in-tags-logic @42: if (/^tags:\s*people\s*$/mi.test(fm)) return true;

### /Users/joi/obs-dailynotes/tools/fixBrokenFrontmatter.js

- code:people-in-tags-logic @4: *   tags: [people]
- code:people-in-tags-logic @7: * and fix them to a single inline array: tags: [people, something]

### /Users/joi/obs-dailynotes/tools/fixPersonIdToEmails.js

- code:people-in-tags-logic @114: if (/^emails:\s*\[\s*\]/m.test(content) && /^tags:.*people/m.test(content)) {

### /Users/joi/obs-dailynotes/tools/importContactsFromCSV.js

- code:people-in-tags-logic @153: tags: 'people',
- code:people-in-tags-logic @177: if (!frontmatter.tags) frontmatter.tags = 'people';

### /Users/joi/obs-dailynotes/tools/normalizePersonPage.js

- code:people-in-tags-logic @78: // Ensure tags includes 'people'
- code:symbol-people @78: // Ensure tags includes 'people'
- code:people-in-tags-logic @84: lines[i] = 'tags: [people]';
- code:symbol-people @84: lines[i] = 'tags: [people]';
- code:symbol-people @93: const hasPeople = items.some(s => /^['"]?people['"]?$/.test(s));
- code:symbol-people @95: items.push('people');
- code:people-in-tags-logic @103: lines.push('tags: [people]');
- code:symbol-people @103: lines.push('tags: [people]');

### /Users/joi/obs-dailynotes/tools/organize_switchboard.py

- code:people-in-tags-logic @24: # Replace tags: people with tags: [people]
- code:people-in-tags-logic @25: content = re.sub(r'^tags: people$', 'tags: [people]', content, flags=re.MULTILINE)
- code:people-in-tags-logic @222: if 'tags:' in content and 'people' in content:

### /Users/joi/obs-dailynotes/tools/runAllPeople.js

- code:symbol-people @3: * Process all people-tagged pages safely.
- code:symbol-people @54: console.log(`Processing ${names.length} people…`);

### /Users/joi/obs-dailynotes/tools/tagPeopleWithLists.js

- code:people-in-tags-logic @154: newFrontmatter = `tags:\n  - people\n  - list\n${newFrontmatter}`;

### /Users/joi/obs-dailynotes/tests/integration/test_daily_notes_generation.py

- frontmatter:people-tag @312: tags: [people]
- code:people-in-tags-logic @312: tags: [people]

### /Users/joi/obs-dailynotes/tests/unit/test_person_pages.py

- frontmatter:people-tag @22: tags: [people]
- code:people-in-tags-logic @22: tags: [people]
- code:people-in-tags-logic @43: assert fm['tags'] == ['people']
- frontmatter:people-tag @52: tags: people
- frontmatter:people-inline @52: tags: people
- code:people-in-tags-logic @52: tags: people
- code:people-in-tags-logic @58: r'^tags: people$',
- code:people-in-tags-logic @59: 'tags: [people]',
- code:people-in-tags-logic @64: assert 'tags: [people]' in standardized
- code:people-in-tags-logic @65: assert 'tags: people' not in standardized
- frontmatter:people-tag @70: tags: [people]
- code:people-in-tags-logic @70: tags: [people]
- frontmatter:people-tag @90: tags: [people]
- code:people-in-tags-logic @90: tags: [people]
- frontmatter:people-tag @175: tags: [people]
- code:people-in-tags-logic @175: tags: [people]
- frontmatter:people-tag @246: tags: [people]
- code:people-in-tags-logic @246: tags: [people]
- frontmatter:people-tag @253: tags: [people]
- code:people-in-tags-logic @253: tags: [people]
- ... 6 more

### /Users/joi/obs-dailynotes/tools/knowledgeGraph/planTagRefactor.js

- code:symbol-people @42: add("frontmatter:people-tag", i + 1, line);
- code:people-in-tags-logic @44: if (/^tags:\s*people\b/i.test(line)) {
- code:symbol-people @44: if (/^tags:\s*people\b/i.test(line)) {
- code:symbol-people @45: add("frontmatter:people-inline", i + 1, line);
- code:symbol-people @52: if (/(^|\s)#people(\b|$)/.test(line)) {
- code:symbol-people @53: add("inline:#people", i + 1, line);
- code:symbol-people @68: // Code patterns referencing people tag
- code:people-in-tags-logic @70: add("code:people-in-tags-logic", i + 1, line);
- code:symbol-people @70: add("code:people-in-tags-logic", i + 1, line);
- code:people-in-tags-logic @72: if (/\b"people"\b|\b'people'\b/.test(line) && /tags|frontmatter|yaml|regex|findPeople/i.test(text)) {
- code:symbol-people @72: if (/\b"people"\b|\b'people'\b/.test(line) && /tags|frontmatter|yaml|regex|findPeople/i.test(text)) {
- code:symbol-people @73: add("code:literal-'people'", i + 1, line);
- code:symbol-people @76: add("code:symbol-people", i + 1, line);
- code:symbol-people @96: lines.push("# Tag Refactor Plan (people → person, person_p → person)", "");
- code:people-in-tags-logic @99: lines.push("", "## Guidance", "- Replace frontmatter tags to 'tags: [person]'", "- Replace inline '#people' and '#person_p' with '#person' (confirm)", "- Update code/tests to look for 'person' not 'people'", "");
- code:symbol-people @99: lines.push("", "## Guidance", "- Replace frontmatter tags to 'tags: [person]'", "- Replace inline '#people' and '#person_p' with '#person' (confirm)", "- Update code/tests to look for 'person' not 'people'", "");

### /Users/joi/switchboard/2023-04-21-1100.md

- frontmatter:people-tag @3: tags: [people]
- code:people-in-tags-logic @3: tags: [people]

### /Users/joi/switchboard/2025-05-21.md

- frontmatter:people-tag @3: tags: [people]
- code:people-in-tags-logic @3: tags: [people]

### /Users/joi/switchboard/2025-08-02.md

- frontmatter:people-tag @3: tags: [people]
- code:people-in-tags-logic @3: tags: [people]

### /Users/joi/switchboard/2025-08-03.md

- frontmatter:people-tag @3: tags: [people]
- code:people-in-tags-logic @3: tags: [people]

### /Users/joi/switchboard/A K M Adam.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/A Sulzberger.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/AJ Phillips.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Adam Back.md

- frontmatter:people-tag @7: tags: [people]
- code:people-in-tags-logic @7: tags: [people]

### /Users/joi/switchboard/Adam Lindemann.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Adela Avila.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Adrianna Ma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Agata Jałosińska.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ahtisaari Marko.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/AiLun Ku.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Aimi Sekiguchi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Aki Oba.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Akihisa Shiozaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Akiko Murakami.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Akiko Yata.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Akira Saka.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Akiyoshi Inasaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Alaa Murabit.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Albert Wenger.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Albert-Laszlo Barabasi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Alberto Ibarguen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Alek Tarkowski.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Alexander Karsner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Alexander Lourie.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Alexander Macgillivray.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Alexandra Mendelson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Alison Sander.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Allen Guan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Allison Tauziet.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Amanda Nguyen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Amy Brand.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ana Sofia Correia.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andre Uhl.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andrea Lauer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andrea Lee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andrew Cohen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andrew Lee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andrew Mangino.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andrew McLaughlin.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Andrew Prague.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Andrew Rabie.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Anisia Gifford.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ann Neuberger.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Anne Burgoyne.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Anne Marie Burgoyne.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Anne Neuberger.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Anne-Marie Slaughter.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Anthony Palombit.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Antonio Gargiulo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Antonio Rodriguez.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Anvita Pandit.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Applied Behavior Analysis.md

- inline:#ideas_p @5: # Applied Behavior Analysis #ideas_p

### /Users/joi/switchboard/Ariel Ekblaw.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ariel Ganz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ariel Garten.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Arisa Toyosaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Arthur Sulzberger.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Arun Kapur.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ashton Kutcher.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Atsuko Doi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Atsushi Hayashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Atul Gawande.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Autism.md

- inline:#ideas_p @1: # Autism #ideas_p

### /Users/joi/switchboard/Avraham Berkowitz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Aya Miyaguchi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Aya Ninomiya.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Aya Ninomiya #person_p #vendor

### /Users/joi/switchboard/Aya Porte.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ayako Nagaya.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ayako Nishida.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ayana Kizaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Aza Raskin.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/BBB さん.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Badr Jafar.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Banjo Yamauchi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bateson Institute.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Battushig Myanganbayar.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bayesian Statistics.md

- inline:#ideas_p @5: # Bayesian Statistics #ideas_p

### /Users/joi/switchboard/Bec Weeks.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bennett Miller.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Beth Grossman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Beth Noveck.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bettina Neuefeind.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bijan Sabet.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Bill Byrn.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bill Hoogterp.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bill Hunt.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bob Horvitz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Boris Anthony.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#ideas_p @10: ## [[Personal Knowledge Management]] #ideas_p

### /Users/joi/switchboard/Brad Burnham.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Brad Keywell.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Brad Powell.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bradley Horowitz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Brady Forrest.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Brian Chu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Brian Lam.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bridgit M.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bruce Schneier.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Bunnie Huang.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/CLEANUP-SUMMARY.md

- code:people-in-tags-logic @7: - **716 person pages** updated from `tags: people` to `tags: [people]`

### /Users/joi/switchboard/Cameron Freer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Carina Wong.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Carl Malamud.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Catharina Maracke.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Causal Inference.md

- inline:#ideas_p @5: # Causal Inference #ideas_p

### /Users/joi/switchboard/Chelsea Barabas.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Cherie Nursalim.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Chiaki Hayashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Chizuko Akazawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Chris Dai.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Chris Inglis.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Christine Kim.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Christine McGivney.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Christoph Geiseler.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Christopher Adams.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Christopher Bevans.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Christopher Filardi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Claire Chino.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Claude Steele.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Claudia Schwarz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Colette Ryan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Colin Raney.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Connor Spelliscy.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Cory Doctorow.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Cristina Alonso.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Cynthia Greenleaf.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daisuke Asano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daisuke Ikeda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daisuke Iwase.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dan Gillmor.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dan Underwood.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dani Murray.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daniel Cortez.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daniel Goodwin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daniel Hillis.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daniel Huttenlocher.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Daniel Ibeling.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Danielle Citron.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dara Khosrowshahi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Darius Jahandarie.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Darius Shahida.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Darren Walker.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dava Newman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dave Morin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/David Alan Smith.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/David Charboneau.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/David Eaves.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/David Farber.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/David Fialkow.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/David Kenny.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/David Luan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/David Lucchino.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/David Moinina Sengeh.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/David Rowan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/David Simon - Black Magic Coffee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dean Ornish.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Debbie Altomonte.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Deborah Stokes.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dee Poon.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Deepak Bhatt.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dennis Scholl.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dhaval Adjodah.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Diane Peters.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Diego Piacentini.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Don Miller.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Doug Becker.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Douglas Rushkoff.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dulce Murphy.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dwight Poler.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Dylan Westover.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eddie Guenzel.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eduardo Castello.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eiko Ikegami.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Elizabeth Kinder.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ellen Winner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ellen Zucker.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Elliott Hedman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ema Sato-Warga.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Emi Kusano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Emi Omura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Emily Kasriel.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Emily Parker.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Emily Yang.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eric Elenko.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eric Ng.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eric Schmidt.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eric Steuer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Esra'a Shafei.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Esther Bryan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Esther Dyson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Esther Wojcicki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/EunJin Raney.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eva Zasloff.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Evan Auyang.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Evan Cheng.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eve Blossom.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Eve Suter.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Fahim Farzadfard.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Farai Chideya.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Federated Learning of Cohorts.md

- inline:#ideas_p @5: # Federated Learning of Cohorts #ideas_p

### /Users/joi/switchboard/Felix Moesner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Fiorenzo Omenetto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Fiza Razik.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Floortime.md

- inline:#ideas_p @1: # Floortime #ideas_p #kio #medical

### /Users/joi/switchboard/Frank Boosman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Fred Wilson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Front Matter.md

- inline:#ideas_p @5: # Front Matter #ideas_p

### /Users/joi/switchboard/Fumi Yamazaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Fumiaki Kobayashi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @16: # Fumiaki Kobayashi #person_p

### /Users/joi/switchboard/Fumio Kishida.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @11: # Fumio Kishida #person_p

### /Users/joi/switchboard/Fumio Nanjo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Future of Accounting.md

- inline:#ideas_p @5: # Future of Accounting #ideas_p

### /Users/joi/switchboard/GTD Review.md

- inline:#ideas_p @5: # GTD Review #ideas_p

### /Users/joi/switchboard/GTD-SYSTEM-BRIEF-FOR-GPT.md

- frontmatter:people-tag @2: tags: people
- frontmatter:people-inline @2: tags: people
- code:people-in-tags-logic @2: tags: people
- frontmatter:people-tag @7: tags: [people]
- code:people-in-tags-logic @7: tags: [people]

### /Users/joi/switchboard/Gal Raz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gen Kanai.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gen Miyazawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gen Woods.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gensuke Tokoro.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/George Church.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gerald Chan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gerald Holton.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gerard Lynch.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gershon Dublon.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Getting Things Done.md

- inline:#ideas_p @5: # Getting Things Done #ideas_p

### /Users/joi/switchboard/Gillian Caldwell.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Giorgia Lupi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Glen Weyl.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Gloria Rudisch Minsky.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Gregory D. Abowd.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Gustavo Sapoznik.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/HB Lim.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/HH Chung Rinpoche.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/HR Best Practices.md

- inline:#ideas_p @5: # HR Best Practices	#ideas_p

### /Users/joi/switchboard/Habib Haddad.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hajime Nakamura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hal Abelson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hal Seki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hans Brondmo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Harper Reed.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Haruki Yoshida.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Harumi Kachi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Haruna Kuno.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Heather Bursch.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hideki Sunahara.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Hideto Kawasakl.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Himeno Tsutomu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hinako Irei.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroaki Kitano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroaki Miyata.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroaki Nagasawa.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Hiroaki Sano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroki Kodama.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroki Matsuo.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Hiroki Mitsuhashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroki Odo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroko Takeshita.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiromi Kubota.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiromi Ozaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @15: # Hiromi Ozaki #person_p

### /Users/joi/switchboard/Hiromi Tanizaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hironobu Azuma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hironori Kamezawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroo Mori.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @10: # Hiroo Mori #person_p

### /Users/joi/switchboard/Hiroshi Esaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroshi Mikitani.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroshi Shino.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hirotaka Takeuchi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hiroto Izumi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Hiroto Izumi #person_p

### /Users/joi/switchboard/Hiroyuki Tanaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Hitomi Donovan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ho-Jun Suk.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Homer Sun.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Howard Gardner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Howard Rheingold.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ichiro Fujisaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ifeoma Fafunwa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ikuko Tsuji.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Insufferable Omniac.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Intended Consequences.md

- inline:#ideas_p @5: # Intended Consequences #ideas_p

### /Users/joi/switchboard/Isha Datar.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/J Johnson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jack Minty.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jack Sakazaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jae Chung.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jake Sullivan.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/James Brinck.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Citrin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Higa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Ho.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Ira Winder.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Joaquin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Manyika.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Pallotta.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/James Weis.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jamie Lee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jamila Raqib.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jamira Burley.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jane Knowles.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jane Metcalfe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Janella Watson.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Janet Green.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jay Yoon.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jean Case.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jed Emerson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeff Bezos.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Jeff Jonas.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeff Pazen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeff Sturges.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeff Weiner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeff Wentworth.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeffrey Guenzel.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeffrey Walker.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jen Easterly.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Jennie O'Grady.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jennifer Mccrea.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jennifer Pahlka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeremy Heckman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jeremy Rubin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jerry Yang.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jesper Koll.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jessica Sousa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jessy Kate Schingler.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jie Qi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Jigme Tenzing.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Jim Messina.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Jin Chen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jini Kim.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jiro Kawakami.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jiro Kokuryo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jj Abrams.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Joe Derisi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Joe Gerber.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Joe Shanahan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John Brown.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John DiFava.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John Maeda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John Manelski.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John Markoff.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John Palfrey.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John Roos.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/John Sasaki.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/John Underkoffler.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Joichi Ito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jon Phillips.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jonathan Fanton.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jonathan Zittrain.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jordi Weinstock.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Josh Kopelman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Josh Tenenbaum.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Joshua Cooper Ramo.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Joshua Goldbard.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Joshua Ramo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Julia Stasch.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Juliana Rotich.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Julie Farris.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Julie Fujishima.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Julie Katzman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Julius Maada Bio.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Jun Makihara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Jun Murai.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/June Miyachi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Junichi Kanda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Junji Nukata.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Junji Tanigawa.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Junpei Fukuda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Justin Waldron.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kaho Shimizu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kana Shinoda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kaoru Hayashi.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Kaoru Sugano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Karen Levine.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Karole Armitage.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Karthik Dinakar.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kate Darling.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kate McCall-Kiley.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kathleen Walker.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kathy Matsui.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Katie Salen.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Katsuaki Usami.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Kawaii Skull.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kazuhiko Tanaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kazuhiro Sugita.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Kazuyoshi Hayase.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Keigo Oyamada.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Keiichi Hida.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Keiji Tonomura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Keiko Okawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Keiko.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Keisuke Honda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Keisuke Murakami.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Keith Yamashita.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Keizo Odori.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ken Hasebe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ken Kawai.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ken Mogi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kenichi Masuda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kenichi Takahashi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Kenji Fujiwara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kenji Tateiwa.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Kenta Akutsu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kentaro Kawabe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kentaro Tobimatsu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kenya Hara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kevin Kelly.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kevin Lin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kevin Phung.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kevin Scott.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kim Polese.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kio Ito.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Kirito Christopher Machida.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Kisei Takahashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kiyoko Morihara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kiyoshi Fujita.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kiyoshi Kurokawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ko Sasaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kohei Shikano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kohei Yoshida.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Koichi Akaishi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Koichi Akaishi #person_p

### /Users/joi/switchboard/Koichi Hagiuda.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Koichi Hagiuda #person_p

### /Users/joi/switchboard/Koichiro Nakamura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Koji Kanazawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kojo Morimoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kono Taro.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kota Matsubara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kotaro Chiba.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kozo Kato.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kriti Godey.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @9: # Kriti Godey #person_p

### /Users/joi/switchboard/Kumi Sato.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kumiko Isono.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kumiko Kamachi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kunimasa Suzuki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kyle Staller.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Kyoiku Chokugo.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#ideas_p @9: # Kyoiku Chokugo #ideas_p #japan

### /Users/joi/switchboard/Laura Langer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lauren Chung.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Laurene Powell Jobs.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Laurene Powell.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lawrence Lessig.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Leland Melvin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lili Cheng.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Linda Chadwick.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Linda Stone.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lisa Goldman-Van Nostrand.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lisa Katayama.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lisa Koyama.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Lisa Randall.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Literature Review.md

- inline:#ideas_p @5: # Literature Review #ideas_p

### /Users/joi/switchboard/Louis Kang.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Luli Shioi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lulu Ito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Lyn Sato.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Léonie Weerakoon.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @10: #people

### /Users/joi/switchboard/Madars Virza.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @9: # Madars Virza #person_p

### /Users/joi/switchboard/Madoka Murakami.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Madoka Tachibana.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Magdalena Schoeneich.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mai Fujimoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Maika Isogawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Maiko Kobayakawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Maja Brisvall.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Makoto Ezure.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Makoto Sakai.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mami Kataoka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mamoru Taniya.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marc Rotenberg.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marco Munoz-Ruiz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Margarita Mora.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Maria Eitel.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Maria Zuber.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marico Nishimura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marie Fukuda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mariko Nishimura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marissa Marcoux.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marjorie Scardino.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marjorie Yang -Esquel Group.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mark Montgomery.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mark Stoelting.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Marshall Ganz.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Martha Denis.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Martha Minow.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Martin Baron.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Martin Karplus.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Martin Nowak.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Martt Carney.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Masaaki Taira.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masaaki Tomiyama.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Masahiko Ogasawara.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Masahito Okuma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masakazu Masujima.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masaki Fujihata.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masaki Fujimoto.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Masaki Fujimoto #person_p

### /Users/joi/switchboard/Masanori Kusunoki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @15: # Masanori Kusunoki #person_p #da_ops

### /Users/joi/switchboard/Masaru Kitsuregawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masaru Nagura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masashi Tanaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masataka Hosoo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Masato Kito.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @10: #people

### /Users/joi/switchboard/Masumitsu Ito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Matt Carney.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Matt Fuller.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Matt Groh.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Matt McKenna.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Matt McKenna #person_p

### /Users/joi/switchboard/Matthew Kowalski.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Matthew Romaine.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Maurice Ashley.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Maxim Lobovsky.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mayumi Hara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Meghan O'Sullivan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mei Ling.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Melissa De Klerk.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Melissa De Klerk #person_p #kio

### /Users/joi/switchboard/Mellody Hobson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Merve Hickok.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Metaverse.md

- inline:#ideas_p @1: # Metaverse #ideas_p

### /Users/joi/switchboard/Michael Carter.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @15: # Michael Carter #person_p

### /Users/joi/switchboard/Michael Casey.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michael J. Green.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Michael J. Green #person_p

### /Users/joi/switchboard/Michael Kleeman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michael Langer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michail Bletsas.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michelle Huang.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michelle Lee (USPTO).md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michelle Lee (Washington Post).md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michelle Peluso.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michelle Thorne.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michelle Yee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Michiaki Matsushima.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Midori Ogura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Miho Shinada.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mika Kanaya.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Mika Tanaka.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Mika Ueno.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Mike Alfant.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Mike Bracken.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Mike Bracken #person_p

### /Users/joi/switchboard/Mike Kayamori.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Miki Aiba.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Miki Shiozawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mikiharu Noma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mimi Ito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Minako Muramatsu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Minh Do.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Minoru Yokoo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mitchel Resnick.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mitsuhiro Takemura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mizuki Oka.md

- frontmatter:people-tag @5: tags: [people, list]
- code:people-in-tags-logic @5: tags: [people, list]
- inline:#people @23: #people

### /Users/joi/switchboard/Mizuko Ito.md

- inline:#person_p @23: # Mizuko Ito #person_p

### /Users/joi/switchboard/Mizuto Tanaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mohamed Nanabhay.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Momoko Fujioka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Moto Tani.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Motonori Nakamura.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Motoshi Shinozaki.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Mun Leong Liew.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mundi Vondi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Muneaki Masuda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Mustafa Suleyman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/NFT.md

- frontmatter:ideas_p-tag @2: tags: ideas_p, stub

### /Users/joi/switchboard/Naeema Zarif.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nana Okui.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nanako Ishido.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nancy Lublin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Naohiko Okuda.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Naohiko Okuda #person_p #da_ops

### /Users/joi/switchboard/Naohisa Yahagi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Naomi Hayashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Naoyuki Iwashita.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Naoyuki Iwashita #person_p

### /Users/joi/switchboard/Natsuko Mitsugi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Neha Narula.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @9: # Neha Narula #person_p

### /Users/joi/switchboard/Neri Oxman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Neurodiversity.md

- inline:#ideas_p @1: # Neurodiversity #ideas_p

### /Users/joi/switchboard/Nicholas Negroponte.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nick Andersson.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Nick Grossman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nick Philip.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nilgun Gokgur.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nina Wishnok.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nippon Kaigi.md

- inline:#ideas_p @5: # Nippon Kaigi #ideas_p #japan

### /Users/joi/switchboard/Nishino Shigeo.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Nobuo Kita.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Nobuyuki Matsuda.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Nobuyuki Suzuki.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Noliko Utsuzawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Nora Abousteit.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Noriaki Iwashima.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Noriaki Nakamura.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Norika Sora.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Noriko Watanabe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Norio Hasegawa.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Noritake Matsuda.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Noritake Matsuda #person_p

### /Users/joi/switchboard/Noriyuki Fujimura.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/ORGANIZATION-CLEANUP-PLAN.md

- code:people-in-tags-logic @17: - **Mixed formats**: Some use `tags: people`, others use `tags: [people]`
- code:people-in-tags-logic @19: - **No tag hierarchy**: Could benefit from nested tags like `people/client`, `people/colleague`
- frontmatter:people-tag @42: tags: [people]  # Not tags: people
- code:people-in-tags-logic @42: tags: [people]  # Not tags: people
- frontmatter:people-tag @51: tags: [people/personal/family]  # Creates: people → personal → family
- code:people-in-tags-logic @51: tags: [people/personal/family]  # Creates: people → personal → family
- frontmatter:people-tag @70: tags: [people/personal/family]
- code:people-in-tags-logic @70: tags: [people/personal/family]
- frontmatter:people-tag @71: tags: [people/personal/friend]
- code:people-in-tags-logic @71: tags: [people/personal/friend]
- frontmatter:people-tag @72: tags: [people/professional/colleague]
- code:people-in-tags-logic @72: tags: [people/professional/colleague]
- frontmatter:people-tag @73: tags: [people/professional/client]
- code:people-in-tags-logic @73: tags: [people/professional/client]
- frontmatter:people-tag @74: tags: [people/professional/investor]
- code:people-in-tags-logic @74: tags: [people/professional/investor]
- frontmatter:people-tag @75: tags: [people/professional/advisor]
- code:people-in-tags-logic @75: tags: [people/professional/advisor]
- frontmatter:people-tag @76: tags: [people/research/collaborator]
- code:people-in-tags-logic @76: tags: [people/research/collaborator]
- ... 4 more

### /Users/joi/switchboard/Oki Matsumoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Open Source in Government.md

- inline:#ideas_p @5: # Open Source in Government #ideas_p

### /Users/joi/switchboard/Ophelia Dahl.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Osamu Nakamura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Osamu Setokuma.md

- frontmatter:people-tag @5: tags: [people, list]
- code:people-in-tags-logic @5: tags: [people, list]

### /Users/joi/switchboard/Otsuka Umio.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ozzie Ray.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Paola Antonelli.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Patrick Lin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Pattie Maes.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Paul Ha.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Paul Keller.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Paul Klingenstein.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Pavish Kumar Ramani Gopal.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Per Mosseby.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Personal Knowledge Management.md

- inline:#ideas_p @5: # Personal Knowledge Management #ideas_p

### /Users/joi/switchboard/Pete Roney.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Peter Faust.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Peter Gabriel.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Peter Seligmann.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Peter Wayne.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Phil Wickham.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Phillip Torrone.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Pieter Franken.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Quantum Computing.md

- inline:#ideas_p @5: # Quantum Computing #ideas_p

### /Users/joi/switchboard/R Picard.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/README_email_update.md

- frontmatter:people-tag @89: tags: [people]
- code:people-in-tags-logic @89: tags: [people]

### /Users/joi/switchboard/Rabsel Dorji.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rachid Saleh.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Raffi Krikorian.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Rahm Emanuel.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Ralph Hersom.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rasty Turek.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ray Ozzie.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Ray Ozzie #person_p

### /Users/joi/switchboard/Rebecca Saxe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rebecca Van Dyck.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rei Mitsui.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Reid Hoffman.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Reiji Ando.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Reijiro Izumi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Remi Yano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rena Kaneko.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Renata Avila.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Renu Dvivedi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rich Miner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Richard Ma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Richard Wolpert.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rikako Abe.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Risa Akiba.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rizuki Matsumoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rob Briggs.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rob Meyerson.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Rob Pardo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Robbie Schingler.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Robert C. Green.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Robert Denham.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Robert Harris.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Robert Langer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rocky Mitsuhashi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Roger Wood.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Roland Tegeder.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Rumiko Hasegawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Russell Cummer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Russell Saito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryan Phelan.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Ryan Phelan #person_p

### /Users/joi/switchboard/Ryoko Kurakazu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryosuke Ushida.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryu Hayashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryu Murakami.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryuichi Mori.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryuichi Sakamoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryuichi Terayama.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ryutaro Kiyohara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Saida Sapieva.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sam Kass.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sam Langer.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Samantha Bates.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @15: # Samantha Bates #person_p

### /Users/joi/switchboard/Sammy Lee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sanae Takaichi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Sanjay Sarma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Saori Ishihara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Satoko Takita.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Satoshi Seki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sayoko Hatano.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Scott Page.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sean Bonner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sean Parker.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Sei Yoshida.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Seiichi Saito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @9: # Seiichi Saito #person_p

### /Users/joi/switchboard/Sendhil Mullainathan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Seow Hiang Lee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sera Tsutsumi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Seth Godin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Seth Goldstein.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shafi Goldwasser.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shaimay Shah.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shaka Senghor.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sheila Hayman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shidara Yusuke.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shigeaki Saegusa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @15: # Shigeaki Saegusa #person_p

### /Users/joi/switchboard/Shin Horie.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shin Iwata.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shingo Tsuji.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]
- inline:#person_p @102: # Shingo Tsuji #person_p

### /Users/joi/switchboard/Shinya Yamanaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shirley Tan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sho Ito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#people @12: #people

### /Users/joi/switchboard/Shoko Takeda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shota Matsuzawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shuguang Zhang.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shunichi Kimuro.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Shusaku Maeda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Simon Johnson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Simon Levene.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Siranush Babakhanova.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @10: #people

### /Users/joi/switchboard/So Saito.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Sooku Sen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sota Mizushima.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Sota Mizushima #person_p

### /Users/joi/switchboard/Sota Watanabe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Souhei Imamu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Stephanie Bell-Rose.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Stephanie Nguyen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Stephanie Strom.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Stephanie T. Nguyen.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @11: # Stephanie T. Nguyen #person_p

### /Users/joi/switchboard/Stephen Friedman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Steven Levy.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Stewart Alsop.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Stewart Brand.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Stewart Butterfield.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sultan Sooud Al Qassemi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sumi Hiromi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Sumio Matsumoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sunny Bates.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Susan Rice.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Susan Schuman.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Susannah Breslin.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Sylvia Burwell.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/T Jimbo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/TESTING.md

- code:people-in-tags-logic @109: - Tag standardization (`tags: people` → `tags: [people]`)
- code:people-in-tags-logic @232: assert "tags: [people]" in sample_person_page

### /Users/joi/switchboard/Tadahisa Kagimoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tadao Gen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Taeminn Song.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Taihei Shii.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Taiichiro Tomiyasu.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Tak Umezawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takafumi Matsui.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Takamitsu Asaoka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takanori Sowa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takao Nitta.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takao Takahashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takashi Asanuma.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Takashi Asanuma #person_p

### /Users/joi/switchboard/Takashi Hara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takashi Toda.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Takashi Yanagi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Takato Utsunomiya.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takayuki Furuta.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Takayuki Noro.md

- frontmatter:people-tag @3: tags: [people]
- code:people-in-tags-logic @3: tags: [people]

### /Users/joi/switchboard/Takayuki Yoda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takehiko Koyanagi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takeo Akiba.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takeshi Natsuno.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Takuya Hirai.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]
- inline:#people @19: #people

### /Users/joi/switchboard/Tamaki Nishimura.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tamako Mitarai.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tamao Funahashi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tara Brown.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Taro Kono.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Tashi Nakanishi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tateki Matsuda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tatsuaki Miyake.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tatsuro Yasukawa.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Tatsuya Haraguchi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tatsuya Honmaru.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Tatsuya Honmaru #person_p

### /Users/joi/switchboard/Tatsuya Ishibe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tatsuya Saito.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Temple Fennell.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tenzin Priyadarshi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Teru Sato.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Teruhide Sato.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Thierry Porte.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tim Burress.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tim Mansfield.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tim Romero.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tim Rowe.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Timo Hannay.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Tod Machover.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Todor Tashev.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tom Kehler.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tomoko Namba.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tomomi Inada.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Tomomi Inada #person_p

### /Users/joi/switchboard/Tony Chen.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tony Tjan.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Toru Matsubara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Toshi Zamma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Toshiaki Takase.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Toshimoto Mitomo.md

- frontmatter:people-tag @2: tags: [people, list]
- code:people-in-tags-logic @2: tags: [people, list]

### /Users/joi/switchboard/Toshio Kuramata.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Toshiyuki Shimano.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Toshiyuki Zamma.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Toyoki Shibayama.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Travis Rich.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tsunekazu Ishihara.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Tutor Prompt.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Ujjwal Deep Dahal.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Ulli Schaechtle.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ulrich Schaechtle.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Umio Otsuka.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Umio Otsuka #person_p

### /Users/joi/switchboard/Untitled 3.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Valentin Heun.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Valentin Heun #person_p

### /Users/joi/switchboard/Van Jones.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Vasu Vyas.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Verbal さん.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Victor Mulas.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Viktoria Modesta.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Vincent Gebes.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Vincenzo Iozzo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @9: # Vincenzo Iozzo #person_p

### /Users/joi/switchboard/Vincenzo Lessons.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Vinit Sahni.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Vishal Punwani.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Vitalik Buterin.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Waka Itagaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Wataru Baba.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/William Gibson.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/William Skinner.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Xin Liu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/YAML.md

- inline:#ideas_p @1: # YAML #ideas_p

### /Users/joi/switchboard/Yamada Hiromi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yasuhiro Takeda.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yasuhiro Yamai.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yasutoshi Nishimura.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Yasutoshi Nishimura #person_p

### /Users/joi/switchboard/Yasuyuki Ogyu.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Yasuyuki Rokuyata.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yat Siu.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @11: # Yat Siu #person_p

### /Users/joi/switchboard/Yee Ean Pang.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Ying Lee.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yo-Yo Ma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yochai Benkler.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yogetsu Akasaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yohei Miyamoto.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoichi Miyazawa.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Yoichi Ochiai.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Yoichi Ochiai #person_p

### /Users/joi/switchboard/Yojiro Nonaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoko Fukui.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoko Ishikura.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @9: # Yoko Ishikura #person_p #da_ops

### /Users/joi/switchboard/Yoriko Beal.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoshiaki Ueno.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoshiharu Negishi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoshiharu Takizawa.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Yoshihide Suga.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Yoshihide Suga #person_p

### /Users/joi/switchboard/Yoshikazu Iwase.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoshiko Kikuchi.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoshiko Sakurai.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]
- inline:#person_p @18: # Yoshiko Sakurai #person_p

### /Users/joi/switchboard/Yoshiko Tsuwaki.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoshimasa Hayashi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#person_p @15: # Yoshimasa Hayashi #person_p

### /Users/joi/switchboard/Yoshinobu Noma.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yoshiyuki Shikura.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]
- inline:#people @11: #people

### /Users/joi/switchboard/Yuji Kuroiwa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yukari Matsuzawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yuki Endo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yuki Ota.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yuki Takashima.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Yukka Kiyo.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yuko Barnaby.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yusuke Nakanishi.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Yuya Kikukawa.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Yuzo Kano.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Zane Shelby.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Zenbo Hidaka.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/Zenbo Hikada.md

- frontmatter:people-tag @5: tags: [people]
- code:people-in-tags-logic @5: tags: [people]

### /Users/joi/switchboard/Zettel ID.md

- inline:#ideas_p @5: # Zettel ID #ideas_p

### /Users/joi/switchboard/Zettelkasten.md

- inline:#ideas_p @1: # Zettelkasten #ideas_p

### /Users/joi/switchboard/_DA Ideas.md

- inline:#ideas_p @5: # DA Ideas #da_ops  #ideas_p  #active

### /Users/joi/switchboard/obs-dailynotes.md

- code:symbol-people @3: Authoritative overview of the `obs-dailynotes` project that powers daily notes, Reminders/GTD, and people-centric workflows in this Obsidian vault. This page lives in the vault so it can be linked from tasks, meetings, and people pages.
- code:symbol-people @12: - Syncs Apple Reminders and renders people agendas and inbox views under `reminders/`
- frontmatter:people-tag @52: tags: [people]
- code:people-in-tags-logic @52: tags: [people]
- code:symbol-people @52: tags: [people]
- code:symbol-people @60: - Build index: `cd /Users/joi/obs-dailynotes && npm run people:index`

### /Users/joi/switchboard/person-quick.md

- frontmatter:people-tag @3: tags: [people]
- code:people-in-tags-logic @3: tags: [people]

### /Users/joi/switchboard/person.md

- frontmatter:people-tag @3: tags: [people]
- code:people-in-tags-logic @3: tags: [people]

### /Users/joi/switchboard/Éric Salobir.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/なっちゃん P2P Bar.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/奥谷 禮子.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/松岡 遼太郎.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/澤田 伸.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/牧野 宏司.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/長島 雅則.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/長澤宏昭 局次長.md

- frontmatter:people-tag @2: tags: [people]
- code:people-in-tags-logic @2: tags: [people]

### /Users/joi/switchboard/templates/idea.md

- frontmatter:ideas_p-tag @2: tags: ideas_p, stub

### /Users/joi/switchboard/templates/person-extract.md

- frontmatter:people-tag @46: tags: people
- frontmatter:people-inline @46: tags: people
- code:people-in-tags-logic @46: tags: people

### /Users/joi/switchboard/templates/person-quick.md

- frontmatter:people-tag @2: tags: people
- frontmatter:people-inline @2: tags: people
- code:people-in-tags-logic @2: tags: people

### /Users/joi/switchboard/templates/person-smart.md

- frontmatter:people-tag @63: tags: people
- frontmatter:people-inline @63: tags: people
- code:people-in-tags-logic @63: tags: people

### /Users/joi/switchboard/templates/person.md

- frontmatter:people-tag @2: tags: people
- frontmatter:people-inline @2: tags: people
- code:people-in-tags-logic @2: tags: people

### /Users/joi/switchboard/Meetings/2023/2023-04-21-1100.md

- frontmatter:people-tag @2: tags: people
- frontmatter:people-inline @2: tags: people
- code:people-in-tags-logic @2: tags: people

### /Users/joi/switchboard/Meetings/2025/2025-05-21.md

- frontmatter:people-tag @2: tags: people
- frontmatter:people-inline @2: tags: people
- code:people-in-tags-logic @2: tags: people

### /Users/joi/switchboard/Meetings/2025/2025-08-02.md

- frontmatter:people-tag @2: tags: people
- frontmatter:people-inline @2: tags: people
- code:people-in-tags-logic @2: tags: people

### /Users/joi/switchboard/Meetings/2025/2025-08-03.md

- frontmatter:people-tag @2: tags: people
- frontmatter:people-inline @2: tags: people
- code:people-in-tags-logic @2: tags: people
