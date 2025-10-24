const { spawn } = require('child_process');

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...options });
    p.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function runGtdSyncPipeline(log = console) {
  // Mirror npm run gtd:sync
  await run('npm', ['run', 'reminders:sync-full', '--silent']);
  await run('npm', ['run', 'reminders:pull', '--silent']);
  await run('npm', ['run', 'gtd:process', '--silent']);
  if (log && log.info) log.info('GTD sync pipeline completed');
}

module.exports = {
  runGtdSyncPipeline,
};


