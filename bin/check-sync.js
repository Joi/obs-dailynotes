#!/usr/bin/env node

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { updateAllReposSyncStatus, getSyncStatusEmoji, getSyncStatusMessage } = require('../lib/repoSync');

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
 * Main execution function
 */
async function main() {
  try {
    logger.info('Checking sync status for all repositories...');

    // Load repos.json
    let reposData;
    try {
      const content = await fs.readFile(REPOS_FILE, 'utf8');
      reposData = JSON.parse(content);
    } catch (error) {
      logger.error(`Could not load ${REPOS_FILE}`);
      logger.info('Run "npm run scan-repos" first to discover repositories');
      process.exit(1);
    }

    if (!reposData.repos || reposData.repos.length === 0) {
      logger.warn('No repositories found in repos.json');
      process.exit(0);
    }

    // Update sync status for all repos
    const updatedData = await updateAllReposSyncStatus(reposData, logger);

    // Save updated data
    await fs.writeFile(REPOS_FILE, JSON.stringify(updatedData, null, 2), 'utf8');
    logger.info(`Updated sync status saved to: ${REPOS_FILE}`);

    // Display results
    console.log('\n📊 Sync Status Report:');
    console.log('─'.repeat(80));

    const grouped = {
      synced: [],
      ahead: [],
      behind: [],
      diverged: [],
      dirty: [],
      other: []
    };

    for (const repo of updatedData.repos) {
      if (!repo.workingTreeClean) {
        grouped.dirty.push(repo);
      } else {
        switch (repo.syncStatus) {
          case 'synced':
            grouped.synced.push(repo);
            break;
          case 'ahead':
            grouped.ahead.push(repo);
            break;
          case 'behind':
            grouped.behind.push(repo);
            break;
          case 'diverged':
            grouped.diverged.push(repo);
            break;
          default:
            grouped.other.push(repo);
        }
      }
    }

    console.log(`✅ Synced: ${grouped.synced.length}`);
    console.log(`⬆️  Ahead (needs push): ${grouped.ahead.length}`);
    console.log(`⚠️  Behind (needs pull): ${grouped.behind.length}`);
    console.log(`❌ Diverged: ${grouped.diverged.length}`);
    console.log(`💾 Dirty (uncommitted changes): ${grouped.dirty.length}`);

    // Show repos that need attention
    const needsAttention = [
      ...grouped.ahead,
      ...grouped.behind,
      ...grouped.diverged,
      ...grouped.dirty
    ];

    if (needsAttention.length > 0) {
      console.log('\n⚡ Repositories Needing Attention:');
      console.log('─'.repeat(80));

      for (const repo of needsAttention) {
        const emoji = getSyncStatusEmoji(repo.syncStatus);
        const message = getSyncStatusMessage(repo);
        const versionInfo = repo.version ? ` v${repo.version}` : '';

        console.log(`${emoji} ${repo.name}${versionInfo}`);
        console.log(`   ${repo.currentBranch} @ ${repo.localCommit} - ${message}`);
        console.log(`   ${repo.localPath}`);

        if (repo.githubRepo) {
          console.log(`   📦 ${repo.githubRepo}`);
        }

        // Suggest action
        if (!repo.workingTreeClean) {
          console.log(`   💡 Action: Commit or stash changes`);
        } else if (repo.syncStatus === 'behind') {
          console.log(`   💡 Action: npm run sync-repos ${repo.name} (pull)`);
        } else if (repo.syncStatus === 'ahead') {
          console.log(`   💡 Action: npm run sync-repos ${repo.name} --push`);
        } else if (repo.syncStatus === 'diverged') {
          console.log(`   💡 Action: Manual resolution needed`);
        }

        console.log('');
      }
    } else {
      console.log('\n🎉 All repositories are in sync!');
    }

    console.log('─'.repeat(80));

  } catch (error) {
    logger.error('Error checking sync status:', error.message);
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
