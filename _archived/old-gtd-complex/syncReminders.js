#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const { execFile } = require('child_process');

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
const vaultRoot = path.resolve(dailyDir, '..');
const inboxPath = path.join(vaultRoot, 'reminders', 'reminders_inbox.md');
const fullPath = path.join(vaultRoot, 'reminders', 'reminders.md');
const todoTodayPath = path.join(vaultRoot, 'reminders', 'todo-today.md');
const gtdDashboardPath = path.join(vaultRoot, 'GTD', 'dashboard.md');

function getTodayDailyNotePath() {
  const dailyDir = process.env.DAILY_NOTE_PATH || '/Users/<Owner>/switchboard/dailynote';
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
}

function parseTasksFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseTasksFromContent(content);
}

function parseTasksFromContent(content) {
  const lines = content.split(/\r?\n/);
  const tasks = [];
  for (const line of lines) {
    // Allow leading spaces before dash and capture both unchecked and checked
    const m = line.match(/^[\t ]*- \[( |x)\] (.*) \(([^)]+)\) <!--reminders-id:([^\s>]+)[^>]*-->$/);
    if (!m) continue;
    const done = m[1] === 'x';
    const title = m[2];
    const list = m[3];
    const id = m[4];
    tasks.push({ done, title, list, id });
  }
  return tasks;
}

function showListAndFindIndexById(list, id) {
  return new Promise((resolve, reject) => {
    execFile('reminders', ['show', list, '--format', 'json'], (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        const items = JSON.parse(stdout);
        for (let i = 0; i < items.length; i++) {
          if (items[i].externalId === id) return resolve(i);
        }
        resolve(-1);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function completeByIndex(list, index) {
  return new Promise((resolve, reject) => {
    // reminders CLI uses 1-based indexing for completion
    const oneBased = Number(index) + 1;
    execFile('reminders', ['complete', list, String(oneBased)], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

(async () => {
  const aggregated = new Map(); // key: list|id
  const addTasks = (arr) => {
    for (const t of arr) {
      const key = `${t.list}|${t.id}`;
      if (!aggregated.has(key)) aggregated.set(key, t);
      else if (t.done) aggregated.set(key, t); // prefer done state if any source shows done
    }
  };

  // Collect from reminders_inbox.md (if exists)
  try { if (fs.existsSync(inboxPath)) addTasks(parseTasksFromFile(inboxPath)); } catch {}
  // Collect from reminders.md (if exists)
  try { if (fs.existsSync(fullPath)) addTasks(parseTasksFromFile(fullPath)); } catch {}
  // Collect from todo-today.md (if exists)
  try { if (fs.existsSync(todoTodayPath)) addTasks(parseTasksFromFile(todoTodayPath)); } catch {}
  // Collect from today's daily note (meeting agendas)
  try {
    const todayPath = getTodayDailyNotePath();
    if (fs.existsSync(todayPath)) {
      const content = fs.readFileSync(todayPath, 'utf8');
      addTasks(parseTasksFromContent(content));
    }
  } catch {}
  // Collect from GTD dashboard
  try {
    if (fs.existsSync(gtdDashboardPath)) addTasks(parseTasksFromFile(gtdDashboardPath));
  } catch {}

  const tasks = Array.from(aggregated.values());
  for (const t of tasks) {
    if (!t.done) continue;
    try {
      const idx = await showListAndFindIndexById(t.list, t.id);
      if (idx >= 0) {
        await completeByIndex(t.list, idx);
      }
    } catch (e) {
      // continue with other tasks
    }
  }
})();


