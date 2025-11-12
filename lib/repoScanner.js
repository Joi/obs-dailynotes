const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively scans a directory for git repositories
 * @param {string} dir - Directory to scan
 * @param {number} maxDepth - Maximum depth to scan (default: 2)
 * @param {number} currentDepth - Current recursion depth
 * @returns {Promise<Array<string>>} Array of git repo paths
 */
async function findGitRepos(dir, maxDepth = 2, currentDepth = 0) {
  const repos = [];

  if (currentDepth > maxDepth) {
    return repos;
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // Check if current directory is a git repo
    const gitDir = path.join(dir, '.git');
    try {
      await fs.access(gitDir);
      repos.push(dir);
      return repos; // Don't scan inside git repos
    } catch {
      // Not a git repo, continue scanning
    }

    // Scan subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Skip common non-repo directories
      const skipDirs = [
        'node_modules', '.venv', '__pycache__', 'venv', 'env',
        '.npm', '.cache', 'Library', 'Applications', '.Trash',
        '.local', '.config', 'Music', 'Movies', 'Pictures', 'Public',
        'Desktop', 'Downloads', 'Documents' // Skip these unless explicitly needed
      ];

      if (skipDirs.includes(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.config') continue;

      const subDir = path.join(dir, entry.name);
      const subRepos = await findGitRepos(subDir, maxDepth, currentDepth + 1);
      repos.push(...subRepos);
    }
  } catch (error) {
    // Silently skip directories we can't read (permissions, etc.)
  }

  return repos;
}

/**
 * Extracts metadata from a git repository
 * @param {string} repoPath - Path to the git repository
 * @returns {Promise<Object|null>} Repository metadata or null if error
 */
async function extractRepoMetadata(repoPath) {
  try {
    const execOpts = { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] };

    // Get repo name
    const repoName = path.basename(repoPath);

    // Get current branch
    let currentBranch;
    try {
      currentBranch = execSync('git rev-parse --abbrev-ref HEAD', execOpts).trim();
    } catch {
      currentBranch = 'unknown';
    }

    // Get local commit hash
    let localCommit;
    let localCommitDate;
    try {
      localCommit = execSync('git rev-parse HEAD', execOpts).trim();
      localCommitDate = execSync('git log -1 --format=%cI HEAD', execOpts).trim();
    } catch {
      localCommit = 'unknown';
      localCommitDate = null;
    }

    // Get remote URL
    let githubRepo = null;
    let upstream = null;
    try {
      const originUrl = execSync('git remote get-url origin', execOpts).trim();
      githubRepo = parseGitHubUrl(originUrl);
    } catch {
      // No origin remote
    }

    try {
      const upstreamUrl = execSync('git remote get-url upstream', execOpts).trim();
      upstream = parseGitHubUrl(upstreamUrl);
    } catch {
      // No upstream remote
    }

    // Get remote commit hash (origin/branch)
    let remoteCommit = null;
    try {
      const trackingBranch = execSync(`git rev-parse --abbrev-ref ${currentBranch}@{upstream}`, execOpts).trim();
      remoteCommit = execSync(`git rev-parse ${trackingBranch}`, execOpts).trim();
    } catch {
      // No tracking branch
    }

    // Get upstream commit hash if exists
    let upstreamCommit = null;
    if (upstream) {
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
    const syncStatus = determineSyncStatus(localCommit, remoteCommit, repoPath);

    // Try to get version from package files
    const version = await detectVersion(repoPath);

    return {
      id: repoName,
      name: repoName,
      localPath: repoPath,
      githubRepo,
      upstream,
      currentBranch,
      localCommit: localCommit.substring(0, 7), // Short hash
      localCommitDate,
      remoteCommit: remoteCommit ? remoteCommit.substring(0, 7) : null,
      upstreamCommit: upstreamCommit ? upstreamCommit.substring(0, 7) : null,
      syncStatus,
      workingTreeClean,
      version,
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    return null;
  }
}

/**
 * Parses a Git URL to extract GitHub repo identifier
 * @param {string} url - Git URL
 * @returns {string|null} GitHub repo identifier (owner/repo) or null
 */
function parseGitHubUrl(url) {
  if (!url) return null;

  // Handle HTTPS URLs: https://github.com/owner/repo.git
  const httpsMatch = url.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2].replace('.git', '')}`;
  }

  // Handle SSH URLs: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@github\.com:(.+?)\/(.+?)(\.git)?$/);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2].replace('.git', '')}`;
  }

  return null;
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
    const execOpts = { cwd: repoPath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] };

    // Check if local is ahead
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
 * Detects version number from package files
 * @param {string} repoPath - Repository path
 * @returns {Promise<string|null>} Version string or null
 */
async function detectVersion(repoPath) {
  // Try pyproject.toml (Python)
  try {
    const pyprojectPath = path.join(repoPath, 'pyproject.toml');
    const content = await fs.readFile(pyprojectPath, 'utf8');
    const match = content.match(/^\s*version\s*=\s*["']([^"']+)["']/m);
    if (match) return match[1];
  } catch {
    // File doesn't exist or couldn't read
  }

  // Try package.json (Node)
  try {
    const packagePath = path.join(repoPath, 'package.json');
    const content = await fs.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(content);
    if (pkg.version) return pkg.version;
  } catch {
    // File doesn't exist or couldn't parse
  }

  return null;
}

/**
 * Scans home directory for all git repositories and returns metadata
 * @param {string} homeDir - Home directory path
 * @param {Function} log - Logger function
 * @returns {Promise<Object>} Repos data structure
 */
async function scanAllRepos(homeDir, log = console) {
  if (log && log.info) log.info('Scanning for git repositories in:', homeDir);

  const repoPaths = await findGitRepos(homeDir);

  if (log && log.info) log.info(`Found ${repoPaths.length} repositories`);

  const repos = [];
  for (const repoPath of repoPaths) {
    if (log && log.debug) log.debug('Processing:', repoPath);
    const metadata = await extractRepoMetadata(repoPath);
    if (metadata) {
      repos.push(metadata);
    }
  }

  return {
    lastScanned: new Date().toISOString(),
    repos: repos.sort((a, b) => a.name.localeCompare(b.name))
  };
}

module.exports = {
  findGitRepos,
  extractRepoMetadata,
  scanAllRepos,
  parseGitHubUrl,
  detectVersion
};
