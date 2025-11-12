#!/usr/bin/env node

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');
const { pullRepo, pushRepo, getSyncStatusEmoji, getSyncStatusMessage } = require('../lib/repoSync');

const SWITCHBOARD_PATH = process.env.SWITCHBOARD_PATH || path.join(os.homedir(), 'switchboard');
const REPOS_FILE = path.join(SWITCHBOARD_PATH, 'amplifier', 'repos.json');

/**
 * Simple console logger
 */
const logger = {
  info: (...args) => console.log('ℹ️ ', ...args),
  debug: (...args) => {
    if (process.env.DEBUG) {
      console.log('🔍', ...args);
    }
  },
  warn: (...args) => console.warn('⚠️ ', ...args),
  error: (...args) => console.error('❌', ...args)
};

/**
 * Prompts user for yes/no confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} True if user confirms
 */
function promptConfirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const repoName = args.find(arg => !arg.startsWith('--'));
  const isPush = args.includes('--push');
  const isForce = args.includes('--force') || args.includes('-f');

  try {
    // Load repos.json
    let reposData;
    try {
      const content = await fs.readFile(REPOS_FILE, 'utf8');
      reposData = JSON.parse(content);
    } catch (error) {
      logger.error(`Could not load ${REPOS_FILE}`);
      logger.info('Run "npm run check-sync" first to check repository status');
      process.exit(1);
    }

    if (!reposData.repos || reposData.repos.length === 0) {
      logger.warn('No repositories found in repos.json');
      process.exit(0);
    }

    // Filter repos to sync
    let reposToSync;
    if (repoName) {
      reposToSync = reposData.repos.filter(r => r.name === repoName || r.id === repoName);
      if (reposToSync.length === 0) {
        logger.error(`Repository "${repoName}" not found`);
        process.exit(1);
      }
    } else {
      // Sync all repos that need it
      if (isPush) {
        reposToSync = reposData.repos.filter(r => r.syncStatus === 'ahead' && r.workingTreeClean);
      } else {
        reposToSync = reposData.repos.filter(r => r.syncStatus === 'behind' && r.workingTreeClean);
      }

      if (reposToSync.length === 0) {
        logger.info(isPush ? 'No repositories need pushing' : 'No repositories need pulling');
        process.exit(0);
      }
    }

    // Display what will be synced
    console.log(`\n📋 Repositories to ${isPush ? 'push' : 'pull'}:`);
    console.log('─'.repeat(80));

    for (const repo of reposToSync) {
      const emoji = getSyncStatusEmoji(repo.syncStatus);
      const message = getSyncStatusMessage(repo);
      console.log(`${emoji} ${repo.name}`);
      console.log(`   ${repo.currentBranch} - ${message}`);
      console.log(`   ${repo.localPath}`);
      console.log('');
    }

    // Confirm unless forced
    if (!isForce) {
      const action = isPush ? 'push these repositories' : 'pull these repositories';
      const confirmed = await promptConfirm(`\nDo you want to ${action}?`);
      if (!confirmed) {
        logger.info('Cancelled');
        process.exit(0);
      }
    }

    // Perform sync
    console.log('\n🔄 Syncing repositories...');
    console.log('─'.repeat(80));

    const results = [];
    for (const repo of reposToSync) {
      console.log(`\n${isPush ? '⬆️  Pushing' : '⬇️  Pulling'} ${repo.name}...`);

      let result;
      if (isPush) {
        result = await pushRepo(repo, logger);
      } else {
        result = await pullRepo(repo, logger);
      }

      results.push({ repo, result });

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
      }
    }

    // Summary
    console.log('\n📊 Sync Summary:');
    console.log('─'.repeat(80));

    const successful = results.filter(r => r.result.success);
    const failed = results.filter(r => !r.result.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Repositories:');
      for (const { repo, result } of failed) {
        console.log(`   ${repo.name}: ${result.message}`);
      }
    }

    console.log('─'.repeat(80));
    logger.info('Sync complete! Run "npm run check-sync" to verify status');

  } catch (error) {
    logger.error('Error during sync:', error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
