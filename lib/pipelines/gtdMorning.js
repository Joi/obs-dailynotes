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

async function runGtdMorningPipeline(log = console) {
  // Mirror npm run gtd:morning
  await run('npm', ['run', 'reminders:pull', '--silent']);
  await run('npm', ['run', 'gtd:process', '--silent']);
  await run(process.execPath, ['tools/generateTodayTodos.js']);
  if (log && log.info) log.info('GTD morning pipeline completed');
}

module.exports = {
  runGtdMorningPipeline,
};


