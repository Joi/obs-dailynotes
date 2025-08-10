const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('generated markdown linting', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const vaultRoot = path.resolve('/Users/joi/switchboard');
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

  test('markdownlint passes for generated files', () => {
    // Ensure files exist (ignore failures, they may already exist)
    try { execSync('npm run gtd:process', { cwd: projectRoot, stdio: 'ignore' }); } catch {}
    try { execSync('npm run reminders:pull', { cwd: projectRoot, stdio: 'ignore' }); } catch {}

    const files = getExistingFiles(candidates);
    expect(files.length).toBeGreaterThan(0);

    // Run markdownlint via node API-less CLI using execSync; quote paths safely
    const bin = path.join(projectRoot, 'node_modules', '.bin', 'markdownlint');
    const args = ['--config', '.markdownlint.json', ...files];
    // Use spawn-like argv escaping by passing array to execSync command string
    const cmd = [bin, ...args.map((a) => `'${a.replace(/'/g, "'\\''")}'`)].join(' ');
    execSync(cmd, { cwd: projectRoot, stdio: 'inherit', shell: '/bin/bash' });
  });
});


