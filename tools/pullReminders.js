#!/usr/bin/env node
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dailyDir = process.env.DAILY_NOTE_PATH;
if (!dailyDir) {
  console.error('DAILY_NOTE_PATH not set');
  process.exit(1);
}
const vaultRoot = path.resolve(dailyDir, '..');
const remindersDir = path.join(vaultRoot, 'reminders');
const agendasDir = path.join(remindersDir, 'agendas');
const cachePath = path.join(remindersDir, 'reminders_cache.json');
const fullMdPath = path.join(remindersDir, 'reminders.md');
const peopleIndexPath = path.join(vaultRoot, 'people.index.json');

function runRemindersShowAll() {
  return new Promise((resolve, reject) => {
    execFile('reminders', ['show-all', '--format', 'json'], (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        resolve(JSON.parse(stdout));
      } catch (e) { reject(e); }
    });
  });
}

function normalizeItem(it) {
  return {
    id: it.externalId,
    title: it.title || '',
    list: it.list || '',
    notes: it.notes || '',
    flagged: !!it.flagged,
    priority: it.priority || 0,
    due: it.dueDate || null,
    completed: !!it.isCompleted
  };
}

(async () => {
  const items = await runRemindersShowAll();
  const normalized = items.map(normalizeItem).filter(it => !it.completed);

  // Load people index if present
  let peopleIndex = {};
  try { peopleIndex = JSON.parse(fs.readFileSync(peopleIndexPath, 'utf8')); } catch {}

  // Build cache keyed by list and by person
  const byList = {};
  const byPerson = {};
  for (const it of normalized) {
    if (!byList[it.list]) byList[it.list] = [];
    byList[it.list].push(it);

    // Person resolution by list name match
    const match = Object.entries(peopleIndex).find(([pid, info]) => info.reminders && info.reminders.listName === it.list);
    if (match) {
      const [personId, info] = match;
      if (!byPerson[personId]) byPerson[personId] = { name: info.name, pagePath: info.pagePath, items: [] };
      byPerson[personId].items.push(it);
    }
  }

  fs.mkdirSync(remindersDir, { recursive: true });
  fs.mkdirSync(agendasDir, { recursive: true });

  // Write full markdown mirror
  const lines = ['# Reminders', ''];
  for (const it of normalized) {
    const meta = `<!--reminders-id:${it.id} list:${it.list}${it.due ? ' due:'+it.due : ''}${it.flagged ? ' flagged:true' : ''}-->`;
    lines.push(`- [ ] ${it.title} (${it.list}) ${meta}`);
  }
  fs.writeFileSync(fullMdPath, lines.join('\n') + '\n', 'utf8');

  // Write per-person agendas
  for (const [personId, info] of Object.entries(byPerson)) {
    const md = ['# Agenda', '', `Person: ${info.name} (${personId})`, ''];
    for (const it of info.items) {
      const meta = `<!--reminders-id:${it.id} list:${it.list}${it.due ? ' due:'+it.due : ''}${it.flagged ? ' flagged:true' : ''} person-id:${personId}-->`;
      md.push(`- [ ] ${it.title} (${it.list}) ${meta}`);
    }
    const safeName = info.name.replace(/[\/:*?"<>|]/g, '-');
    fs.writeFileSync(path.join(agendasDir, `${safeName}.md`), md.join('\n') + '\n', 'utf8');
  }

  // Write cache
  fs.writeFileSync(cachePath, JSON.stringify({ byList, byPerson }, null, 2));
})();


