const fs = require('fs').promises;
const path = require('path');
const { getSyncStatusEmoji, getSyncStatusMessage } = require('./repoSync');

/**
 * Generates the REPOS-DASHBOARD.md file from repos.json
 * @param {string} switchboardPath - Path to switchboard directory
 * @param {Function} log - Logger function
 * @returns {Promise<void>}
 */
async function generateReposDashboard(switchboardPath, log = console) {
  try {
    const amplifierPath = path.join(switchboardPath, 'amplifier');
    const reposFile = path.join(amplifierPath, 'repos.json');
    const dashboardFile = path.join(amplifierPath, 'REPOS-DASHBOARD.md');

    // Load repos.json
    let reposData;
    try {
      const content = await fs.readFile(reposFile, 'utf8');
      reposData = JSON.parse(content);
    } catch (error) {
      if (log && log.warn) log.warn('Could not load repos.json, skipping dashboard generation');
      return;
    }

    if (!reposData.repos || reposData.repos.length === 0) {
      if (log && log.warn) log.warn('No repositories found, skipping dashboard generation');
      return;
    }

    // Calculate summary stats
    const stats = {
      total: reposData.repos.length,
      synced: 0,
      ahead: 0,
      behind: 0,
      diverged: 0,
      dirty: 0
    };

    for (const repo of reposData.repos) {
      if (!repo.workingTreeClean) {
        stats.dirty++;
      }
      switch (repo.syncStatus) {
        case 'synced':
          stats.synced++;
          break;
        case 'ahead':
          stats.ahead++;
          break;
        case 'behind':
          stats.behind++;
          break;
        case 'diverged':
          stats.diverged++;
          break;
      }
    }

    // Generate markdown content
    const lines = [
      '# Repository Dashboard',
      '',
      `*Last updated: ${new Date().toISOString().split('T')[0]} (auto-generated from \`repos.json\`)*`,
      '',
      '## 📊 At a Glance',
      '',
      '| Repository | Status | Branch | Commit | Version | Action |',
      '|------------|--------|--------|--------|---------|--------|'
    ];

    // Generate table rows
    for (const repo of reposData.repos.sort((a, b) => a.name.localeCompare(b.name))) {
      const emoji = getSyncStatusEmoji(repo.syncStatus);
      const dirtyFlag = repo.workingTreeClean ? '' : ' 💾';
      const status = `${emoji}${dirtyFlag}`;
      const version = repo.version || '-';

      let action;
      if (!repo.workingTreeClean && (repo.syncStatus === 'behind' || repo.syncStatus === 'diverged')) {
        action = 'Commit first, then pull';
      } else if (!repo.workingTreeClean) {
        action = 'Commit changes';
      } else if (repo.syncStatus === 'behind') {
        const details = repo.syncDetails || { behind: 0 };
        action = `**Pull ${details.behind} commit${details.behind !== 1 ? 's' : ''}**`;
      } else if (repo.syncStatus === 'ahead') {
        const details = repo.syncDetails || { ahead: 0 };
        action = `**Push ${details.ahead} commit${details.ahead !== 1 ? 's' : ''}**`;
      } else if (repo.syncStatus === 'diverged') {
        action = '**Manual resolution needed**';
      } else if (repo.syncStatus === 'synced') {
        action = '✓ Good';
      } else {
        action = repo.syncStatus;
      }

      lines.push(`| ${repo.name} | ${status} | ${repo.currentBranch} | ${repo.localCommit} | ${version} | ${action} |`);
    }

    lines.push('');
    lines.push('**Legend:** ✅ Synced • ⬆️ Ahead • ⚠️ Behind • ❌ Diverged • 💾 Dirty');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📊 Status Summary');
    lines.push('');
    lines.push(`Total repositories: ${stats.total}`);
    lines.push('');
    lines.push(`- ✅ Synced: ${stats.synced}`);
    lines.push(`- ⬆️ Ahead: ${stats.ahead}`);
    lines.push(`- ⚠️ Behind: ${stats.behind}`);
    lines.push(`- ❌ Diverged: ${stats.diverged}`);
    lines.push(`- 💾 Uncommitted changes: ${stats.dirty}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 🔄 Quick Sync Commands');
    lines.push('');
    lines.push('```bash');
    lines.push('# In /Users/joi/obs-dailynotes directory:');
    lines.push('');
    lines.push('# Check sync status for all repos');
    lines.push('npm run repos:check');
    lines.push('');
    lines.push('# Pull all repos that are behind');
    lines.push('npm run repos:sync');
    lines.push('');
    lines.push('# Push all repos that are ahead');
    lines.push('npm run repos:sync-push');
    lines.push('');
    lines.push('# Sync specific repo');
    lines.push('npm run repos:sync amplifier');
    lines.push('npm run repos:sync amplifier -- --push');
    lines.push('');
    lines.push('# Re-scan for new repos');
    lines.push('npm run repos:scan');
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📦 All Repositories');
    lines.push('');

    // Generate detailed repo sections
    for (const repo of reposData.repos.sort((a, b) => a.name.localeCompare(b.name))) {
      const emoji = getSyncStatusEmoji(repo.syncStatus);
      const message = getSyncStatusMessage(repo);

      lines.push(`### ${repo.name}`);
      lines.push(`- **Path:** \`${repo.localPath}\``);
      if (repo.githubRepo) {
        lines.push(`- **GitHub:** [${repo.githubRepo}](https://github.com/${repo.githubRepo})`);
      }
      lines.push(`- **Branch:** ${repo.currentBranch} @ ${repo.localCommit}`);
      if (repo.version) {
        lines.push(`- **Version:** ${repo.version}`);
      }
      lines.push(`- **Status:** ${emoji} ${message}`);

      // Action suggestion
      if (!repo.workingTreeClean && (repo.syncStatus === 'behind' || repo.syncStatus === 'diverged')) {
        lines.push(`- **Action:** Commit or stash changes first, then sync`);
      } else if (!repo.workingTreeClean) {
        lines.push(`- **Action:** Commit or stash changes`);
      } else if (repo.syncStatus === 'behind') {
        lines.push(`- **Action:** \`npm run repos:sync ${repo.name}\``);
      } else if (repo.syncStatus === 'ahead') {
        lines.push(`- **Action:** \`npm run repos:sync ${repo.name} -- --push\``);
      } else if (repo.syncStatus === 'diverged') {
        lines.push(`- **Action:** Manual resolution needed (see instructions below)`);
      } else {
        lines.push(`- **Action:** None needed`);
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Add instructions section
    lines.push('## 🔍 Understanding Status Icons');
    lines.push('');
    lines.push('- ✅ **Synced** - Local matches remote, no action needed');
    lines.push('- ⬆️ **Ahead** - Local has commits to push: `npm run repos:sync REPO_NAME -- --push`');
    lines.push('- ⚠️ **Behind** - Remote has commits to pull: `npm run repos:sync REPO_NAME`');
    lines.push('- ❌ **Diverged** - Both have unique commits, manual resolution needed');
    lines.push('- 💾 **Dirty** - Uncommitted changes, commit or stash first');
    lines.push('- 🔗 **No Remote** - No remote configured');
    lines.push('- ❓ **Unknown** - Unable to determine status');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📚 Detailed Instructions');
    lines.push('');
    lines.push('### How to Sync a Repository');
    lines.push('');
    lines.push('**If repo is BEHIND (needs pull):**');
    lines.push('```bash');
    lines.push('cd /Users/joi/obs-dailynotes');
    lines.push('npm run repos:sync REPO_NAME');
    lines.push('```');
    lines.push('');
    lines.push('**If repo is AHEAD (needs push):**');
    lines.push('```bash');
    lines.push('npm run repos:sync REPO_NAME -- --push');
    lines.push('```');
    lines.push('');
    lines.push('**If repo is DIRTY (uncommitted changes):**');
    lines.push('```bash');
    lines.push('cd /path/to/repo');
    lines.push('git status                    # See what changed');
    lines.push('git add .                     # Stage changes');
    lines.push('git commit -m "your message"  # Commit changes');
    lines.push('```');
    lines.push('');
    lines.push('**If repo is DIVERGED (manual resolution needed):**');
    lines.push('```bash');
    lines.push('cd /path/to/repo');
    lines.push('git fetch origin');
    lines.push('git status');
    lines.push('# Choose one:');
    lines.push('git pull --rebase origin BRANCH  # Rebase your commits');
    lines.push('git pull origin BRANCH           # Merge (creates merge commit)');
    lines.push('```');
    lines.push('');
    lines.push('### Batch Operations');
    lines.push('');
    lines.push('**Pull all repos that are behind:**');
    lines.push('```bash');
    lines.push('npm run repos:sync');
    lines.push('# Will prompt for confirmation before pulling each repo');
    lines.push('```');
    lines.push('');
    lines.push('**Push all repos that are ahead:**');
    lines.push('```bash');
    lines.push('npm run repos:sync-push');
    lines.push('```');
    lines.push('');
    lines.push('**Skip confirmation prompts:**');
    lines.push('```bash');
    lines.push('npm run repos:sync -- --force');
    lines.push('npm run repos:sync-push -- --force');
    lines.push('```');
    lines.push('');
    lines.push('### Checking Status');
    lines.push('');
    lines.push('**Update sync status for all repos:**');
    lines.push('```bash');
    lines.push('npm run repos:check');
    lines.push('```');
    lines.push('');
    lines.push('This fetches from all remotes and updates the status. Run this daily or before syncing.');
    lines.push('');
    lines.push('**Re-scan for new repositories:**');
    lines.push('```bash');
    lines.push('npm run repos:scan');
    lines.push('```');
    lines.push('');
    lines.push('Run this when you clone new repos to your home directory.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 🔗 Related Documentation');
    lines.push('');
    lines.push('- [[amplifier/REPO-SYNC-GUIDE|Complete Repo Sync Guide]]');
    lines.push('- [[amplifier/README|Amplifier Projects]]');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*💡 Tip: This dashboard auto-updates when you run `npm run repos:check`*');
    lines.push('');

    // Write to file
    await fs.writeFile(dashboardFile, lines.join('\n'), 'utf8');

    if (log && log.info) {
      log.info(`Generated dashboard: ${dashboardFile}`);
    }

  } catch (error) {
    if (log && log.error) {
      log.error('Error generating repos dashboard:', error.message);
    }
  }
}

module.exports = {
  generateReposDashboard
};
