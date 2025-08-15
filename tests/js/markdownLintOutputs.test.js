const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('generated markdown linting', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const dailyDir = (process.env.DAILY_NOTE_PATH || '/Users/Shared/switchboard/dailynote').replace('~', process.env.HOME || '~');
  const vaultRoot = path.resolve(dailyDir, '..');
  const candidates = [
    path.join(vaultRoot, 'GTD', 'dashboard.md'),
    path.join(vaultRoot, 'GTD', 'next-actions.md'),
    path.join(vaultRoot, 'GTD', 'email-tasks.md'),
    path.join(vaultRoot, 'GTD', 'waiting-for.md'),
    path.join(vaultRoot, 'GTD', 'scheduled.md'),
    path.join(vaultRoot, 'reminders', 'reminders.md'),
    path.join(vaultRoot, 'reminders', 'reminders_inbox.md')
  ];

  function getExistingFiles(files) {
    return files.filter((f) => fs.existsSync(f));
  }

  test('markdownlint passes for generated files (if present)', () => {
    // Attempt to generate files; ignore failures in CI
    try { execSync('npm run gtd:process', { cwd: projectRoot, stdio: 'ignore' }); } catch {}
    try { execSync('npm run reminders:pull', { cwd: projectRoot, stdio: 'ignore' }); } catch {}

    const files = getExistingFiles(candidates);
    if (files.length === 0) {
      console.warn('No generated GTD/reminders files found; skipping markdownlint test.');
      return;
    }

    const bin = path.join(projectRoot, 'node_modules', '.bin', 'markdownlint');
    const args = ['--config', '.markdownlint.json', ...files];
    const cmd = [bin, ...args.map((a) => `'${a.replace(/'/g, "'\\''")}'`)].join(' ');
    execSync(cmd, { cwd: projectRoot, stdio: 'inherit', shell: '/bin/bash' });
  });
});


