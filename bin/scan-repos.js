#!/usr/bin/env node

const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { scanAllRepos } = require('../lib/repoScanner');

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
    logger.info('Starting repository scan...');

    const homeDir = os.homedir();
    logger.info(`Scanning home directory: ${homeDir}`);

    // Scan for all repos
    const reposData = await scanAllRepos(homeDir, logger);

    logger.info(`Found ${reposData.repos.length} repositories`);

    // Ensure switchboard/amplifier directory exists
    const amplifierDir = path.dirname(REPOS_FILE);
    await fs.mkdir(amplifierDir, { recursive: true });

    // Save to repos.json
    await fs.writeFile(REPOS_FILE, JSON.stringify(reposData, null, 2), 'utf8');
    logger.info(`Saved repository data to: ${REPOS_FILE}`);

    // Display summary
    console.log('\n📊 Repository Summary:');
    console.log('─'.repeat(80));

    const grouped = {
      synced: [],
      ahead: [],
      behind: [],
      diverged: [],
      noRemote: [],
      other: []
    };

    for (const repo of reposData.repos) {
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
        case 'no-remote':
          grouped.noRemote.push(repo);
          break;
        default:
          grouped.other.push(repo);
      }
    }

    console.log(`✅ Synced: ${grouped.synced.length}`);
    console.log(`⬆️  Ahead: ${grouped.ahead.length}`);
    console.log(`⚠️  Behind: ${grouped.behind.length}`);
    console.log(`❌ Diverged: ${grouped.diverged.length}`);
    console.log(`🔗 No Remote: ${grouped.noRemote.length}`);
    console.log(`❓ Other: ${grouped.other.length}`);

    console.log('\n📋 Repositories:');
    console.log('─'.repeat(80));

    for (const repo of reposData.repos) {
      const statusEmoji = {
        'synced': '✅',
        'ahead': '⬆️',
        'behind': '⚠️',
        'diverged': '❌',
        'no-remote': '🔗',
        'unknown': '❓'
      }[repo.syncStatus] || '❓';

      const cleanStatus = repo.workingTreeClean ? '' : ' (dirty)';
      const versionInfo = repo.version ? ` v${repo.version}` : '';

      console.log(`${statusEmoji} ${repo.name}${versionInfo}`);
      console.log(`   ${repo.localPath}`);
      console.log(`   ${repo.currentBranch} @ ${repo.localCommit}${cleanStatus}`);

      if (repo.githubRepo) {
        console.log(`   📦 ${repo.githubRepo}`);
      }

      console.log('');
    }

    console.log('─'.repeat(80));
    logger.info('Scan complete!');
    logger.info(`Run "npm run check-sync" to update sync status`);

  } catch (error) {
    logger.error('Error during scan:', error.message);
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
