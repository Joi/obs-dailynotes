#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const { execFile } = require('child_process');

const inputPath = '/Users/joi/switchboard/reminders.md';

function parseTasksFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const tasks = [];
  for (const line of lines) {
    const m = line.match(/^\- \[( |x)\] (.*) \(([^)]+)\) <!--reminders-id:([A-F0-9\-]+)-->$/);
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
    execFile('reminders', ['complete', list, String(index)], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

(async () => {
  const tasks = parseTasksFromFile(inputPath);
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


