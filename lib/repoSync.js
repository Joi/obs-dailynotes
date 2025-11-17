const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Updates a single repository's sync status
 * @param {Object} repo - Repository metadata object
 * @param {Function} log - Logger function
 * @returns {Promise<Object>} Updated repo metadata
 */
async function updateRepoSyncStatus(repo, log = console) {
  const { localPath, currentBranch } = repo;

  try {
    const execOpts = {
      cwd: localPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: '/bin/bash',
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
    };

    // Fetch latest from remotes
    if (log && log.debug) log.debug(`Fetching updates for ${repo.name}...`);
    try {
      execSync('git fetch origin', execOpts);
      if (repo.upstream) {
        execSync('git fetch upstream', execOpts);
      }
    } catch (error) {
      if (log && log.warn) log.warn(`Failed to fetch for ${repo.name}:`, error.message);
    }

    // Get updated commit hashes
    let localCommit;
    let localCommitDate;
    try {
      localCommit = execSync('git rev-parse HEAD', execOpts).trim();
      localCommitDate = execSync('git log -1 --format=%cI HEAD', execOpts).trim();
    } catch {
      localCommit = 'unknown';
      localCommitDate = null;
    }

    // Get remote commit hash
    let remoteCommit = null;
    try {
      const trackingBranch = execSync(`git rev-parse --abbrev-ref ${currentBranch}@{upstream}`, execOpts).trim();
      remoteCommit = execSync(`git rev-parse ${trackingBranch}`, execOpts).trim();
    } catch {
      // No tracking branch
    }

    // Get upstream commit hash if exists
    let upstreamCommit = null;
    if (repo.upstream) {
      try {
        upstreamCommit = execSync(`git rev-parse upstream/${currentBranch}`, execOpts).trim();
      } catch {
        // No upstream branch
      }
    }

    // Check working tree status
    let workingTreeClean;
    try {
      const status = execSync('git status --porcelain', execOpts).trim();
      workingTreeClean = status.length === 0;
    } catch {
      workingTreeClean = false;
    }

    // Determine sync status
    const syncStatus = determineSyncStatus(localCommit, remoteCommit, localPath);

    // Calculate commits ahead/behind
    const syncDetails = calculateSyncDetails(localCommit, remoteCommit, localPath);

    return {
      ...repo,
      localCommit: localCommit.substring(0, 7),
      localCommitDate,
      remoteCommit: remoteCommit ? remoteCommit.substring(0, 7) : null,
      upstreamCommit: upstreamCommit ? upstreamCommit.substring(0, 7) : null,
      syncStatus,
      syncDetails,
      workingTreeClean,
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    if (log && log.error) log.error(`Error updating ${repo.name}:`, error.message);
    return {
      ...repo,
      syncStatus: 'error',
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Determines sync status between local and remote
 * @param {string} localCommit - Local commit hash
 * @param {string|null} remoteCommit - Remote commit hash
 * @param {string} repoPath - Repository path
 * @returns {string} Sync status
 */
function determineSyncStatus(localCommit, remoteCommit, repoPath) {
  if (!remoteCommit) return 'no-remote';
  if (localCommit === 'unknown') return 'unknown';

  if (localCommit.startsWith(remoteCommit) || remoteCommit.startsWith(localCommit)) {
    return 'synced';
  }

  try {
    const execOpts = {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: '/bin/bash',
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
    };

    const aheadCount = execSync(`git rev-list ${remoteCommit}..${localCommit} --count`, execOpts).trim();
    const behindCount = execSync(`git rev-list ${localCommit}..${remoteCommit} --count`, execOpts).trim();

    const ahead = parseInt(aheadCount, 10) || 0;
    const behind = parseInt(behindCount, 10) || 0;

    if (ahead > 0 && behind > 0) return 'diverged';
    if (ahead > 0) return 'ahead';
    if (behind > 0) return 'behind';

    return 'synced';
  } catch {
    return 'unknown';
  }
}

/**
 * Calculates detailed sync information (commits ahead/behind)
 * @param {string} localCommit - Local commit hash
 * @param {string|null} remoteCommit - Remote commit hash
 * @param {string} repoPath - Repository path
 * @returns {Object} Sync details with ahead/behind counts
 */
function calculateSyncDetails(localCommit, remoteCommit, repoPath) {
  if (!remoteCommit || localCommit === 'unknown') {
    return { ahead: 0, behind: 0 };
  }

  try {
    const execOpts = {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: '/bin/bash',
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
    };

    const aheadCount = execSync(`git rev-list ${remoteCommit}..${localCommit} --count`, execOpts).trim();
    const behindCount = execSync(`git rev-list ${localCommit}..${remoteCommit} --count`, execOpts).trim();

    return {
      ahead: parseInt(aheadCount, 10) || 0,
      behind: parseInt(behindCount, 10) || 0
    };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

/**
 * Updates all repositories' sync status
 * @param {Object} reposData - Repository data structure
 * @param {Function} log - Logger function
 * @returns {Promise<Object>} Updated repos data
 */
async function updateAllReposSyncStatus(reposData, log = console) {
  if (log && log.info) log.info('Updating sync status for all repositories...');

  const updatedRepos = [];
  for (const repo of reposData.repos) {
    if (log && log.info) log.info(`Checking ${repo.name}...`);
    const updated = await updateRepoSyncStatus(repo, log);
    updatedRepos.push(updated);
  }

  return {
    lastScanned: reposData.lastScanned,
    lastSynced: new Date().toISOString(),
    repos: updatedRepos
  };
}

/**
 * Pulls latest changes for a repository
 * @param {Object} repo - Repository metadata
 * @param {Function} log - Logger function
 * @returns {Promise<Object>} Result object with success status and message
 */
async function pullRepo(repo, log = console) {
  const { localPath, currentBranch, workingTreeClean } = repo;

  if (!workingTreeClean) {
    return {
      success: false,
      message: `Working tree is not clean. Commit or stash changes first.`
    };
  }

  try {
    const execOpts = {
      cwd: localPath,
      encoding: 'utf8',
      shell: '/bin/bash',
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
    };

    if (log && log.info) log.info(`Pulling ${repo.name} on branch ${currentBranch}...`);

    // Pull with rebase
    const output = execSync(`git pull origin ${currentBranch} --rebase`, execOpts).trim();

    return {
      success: true,
      message: output || 'Already up to date'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Pushes local changes for a repository
 * @param {Object} repo - Repository metadata
 * @param {Function} log - Logger function
 * @returns {Promise<Object>} Result object with success status and message
 */
async function pushRepo(repo, log = console) {
  const { localPath, currentBranch, workingTreeClean } = repo;

  try {
    const execOpts = {
      cwd: localPath,
      encoding: 'utf8',
      shell: '/bin/bash',
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' }
    };

    if (log && log.info) log.info(`Pushing ${repo.name} on branch ${currentBranch}...`);

    const output = execSync(`git push origin ${currentBranch}`, execOpts).trim();

    return {
      success: true,
      message: output || 'Everything up-to-date'
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Generates a sync status emoji
 * @param {string} syncStatus - Sync status string
 * @returns {string} Emoji representing status
 */
function getSyncStatusEmoji(syncStatus) {
  const emojiMap = {
    'synced': '✅',
    'ahead': '⬆️',
    'behind': '⚠️',
    'diverged': '❌',
    'no-remote': '🔗',
    'unknown': '❓',
    'error': '💥'
  };
  return emojiMap[syncStatus] || '❓';
}

/**
 * Generates a human-readable sync status message
 * @param {Object} repo - Repository metadata
 * @returns {string} Status message
 */
function getSyncStatusMessage(repo) {
  const { syncStatus, syncDetails, workingTreeClean } = repo;

  const dirtyFlag = workingTreeClean ? '' : ' (dirty)';

  switch (syncStatus) {
    case 'synced':
      return `synced${dirtyFlag}`;
    case 'ahead':
      return `${syncDetails.ahead} commit${syncDetails.ahead > 1 ? 's' : ''} ahead${dirtyFlag}`;
    case 'behind':
      return `${syncDetails.behind} commit${syncDetails.behind > 1 ? 's' : ''} behind${dirtyFlag}`;
    case 'diverged':
      return `diverged (${syncDetails.ahead} ahead, ${syncDetails.behind} behind)${dirtyFlag}`;
    case 'no-remote':
      return `no remote${dirtyFlag}`;
    case 'unknown':
      return 'unknown';
    case 'error':
      return 'error checking status';
    default:
      return syncStatus;
  }
}

module.exports = {
  updateRepoSyncStatus,
  updateAllReposSyncStatus,
  pullRepo,
  pushRepo,
  getSyncStatusEmoji,
  getSyncStatusMessage
};
