const { execFile } = require('child_process');

/**
 * Fetch Apple Reminders due today and/or overdue using JXA via osascript
 * @param {Object} options
 * @param {string[]} [options.lists] - Reminders lists to include (empty = all)
 * @param {boolean} [options.includeToday] - Include reminders due today
 * @param {boolean} [options.includeOverdue] - Include reminders overdue (before today)
 * @returns {Promise<Array<{ title: string, due?: string, list: string }>>}
 */
function fetchAppleReminders({ lists = [], includeToday = true, includeOverdue = true } = {}) {
  return new Promise((resolve, reject) => {
    const jxa = `
function run() {
  const Reminders = Application('Reminders');
  Reminders.includeStandardAdditions = false;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const target = ${JSON.stringify(lists)};
  const useFilter = Array.isArray(target) && target.length > 0;
  const srcLists = Reminders.lists();

  const out = [];
  srcLists.forEach(list => {
    const listName = list.name();
    if (useFilter && target.indexOf(listName) === -1) return;
    const items = list.reminders();
    for (var i = 0; i < items.length; i++) {
      const r = items[i];
      try {
        if (r.completed()) continue;
        const d = r.dueDate();
        if (!d) continue;
        const due = new Date(d);
        const isToday = (due >= start && due <= end);
        const isOverdue = (due < start);
        if ((${includeToday} && isToday) || (${includeOverdue} && isOverdue)) {
          out.push({ title: r.name(), due: due.toISOString(), list: listName });
        }
      } catch (e) {
        // skip malformed items
      }
    }
  });
  return JSON.stringify(out);
}
`;

    execFile('osascript', ['-l', 'JavaScript', '-e', jxa], (err, stdout, stderr) => {
      if (err) {
        // If automation permission is denied or Reminders is unavailable
        return reject(new Error(stderr || err.message));
      }
      try {
        const data = JSON.parse(stdout || '[]');
        resolve(Array.isArray(data) ? data : []);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

module.exports = {
  fetchAppleReminders,
};


