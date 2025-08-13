#!/usr/bin/env node
/**
 * Fallback: Use Gmail API while we debug local search
 * This ensures enrichment works immediately
 */
const { execSync } = require('child_process');

console.log('Quick Workaround: Force Gmail API for Alexander Lourie');
console.log('=' + '='.repeat(55));
console.log();

console.log('Since local Mail search is having issues, using Gmail API...');
console.log();

// Set up environment to skip local search
process.env.SKIP_LOCAL = '1';
process.env.PERSON_FILE = '/Users/joi/switchboard/Alexander Lourie.md';
process.env.PERSON_KEY = 'Alexander Lourie';

console.log('Running enrichment with Gmail API (skipping local search)...');
console.log('-'.repeat(60));

try {
  // Run the enrichment
  const result = execSync('node tools/enrichFromLLM.js', {
    cwd: '/Users/joi/obs-dailynotes',
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env
  });
} catch (err) {
  console.error('Error running enrichment:', err.message);
}

console.log();
console.log('=' + '='.repeat(55));
console.log('Note: This used Gmail API instead of local search.');
console.log('Local search will work once Spotlight finishes indexing.');
