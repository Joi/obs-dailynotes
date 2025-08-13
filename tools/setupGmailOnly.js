#!/usr/bin/env node
/**
 * SOLUTION: Configure enrichment to always use Gmail API
 * Since Mail.app doesn't use .emlx files on this system
 */
const fs = require('fs');
const path = require('path');

console.log('Configuring Enrichment for Gmail-Only Mode');
console.log('=' + '='.repeat(45));
console.log();

console.log('Since your Mail.app doesn\'t use .emlx files,');
console.log('local search won\'t work. Setting up Gmail API as default.');
console.log();

// Create a config file to always skip local search
const configPath = path.join(__dirname, '..', 'config', 'enrichment.json');
const config = {
  skipLocalSearch: true,
  reason: "Mail.app doesn't use .emlx format",
  useGmailAPI: true,
  configured: new Date().toISOString()
};

try {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✓ Created config: config/enrichment.json');
} catch (err) {
  console.log('Error creating config:', err.message);
}

// Create convenience script
const scriptContent = `#!/usr/bin/env node
// Enrich person using Gmail API (skip local search)
const { spawn } = require('child_process');
const person = process.argv[2];
if (!person) {
  console.log('Usage: enrich-person "Person Name"');
  process.exit(1);
}
process.env.SKIP_LOCAL = '1';
process.env.PERSON_KEY = person;
process.env.PERSON_FILE = \`/Users/<Owner>/switchboard/\${person}.md\`;
spawn('node', ['tools/enrichFromLLM.js'], {
  cwd: '/Users/<Owner>/obs-dailynotes',
  stdio: 'inherit',
  env: process.env
});
`;

const scriptPath = path.join(__dirname, '..', 'enrich-person');
fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
console.log('✓ Created convenience script: enrich-person');
console.log();

console.log('=' + '='.repeat(45));
console.log('USAGE:');
console.log('=' + '='.repeat(45));
console.log();
console.log('To enrich any person using Gmail API:');
console.log();
console.log('  cd /Users/<Owner>/obs-dailynotes');
console.log('  ./enrich-person "Alexander Lourie"');
console.log();
console.log('Or use the full command:');
console.log();
console.log('  SKIP_LOCAL=1 PERSON_FILE="/path/to/person.md" \\');
console.log('    node tools/enrichFromLLM.js');
console.log();
console.log('This will always use Gmail API and skip the broken local search.');
