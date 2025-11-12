const path = require('path');
const fs = require('fs').promises;
const { getSyncStatusEmoji, getSyncStatusMessage } = require('./repoSync');

/**
 * Scans the switchboard/amplifier folder for project files and generates
 * a section for the daily note showing current project status and next actions.
 *
 * @param {string} switchboardPath - Path to switchboard directory (from env SWITCHBOARD_DATA_PATH)
 * @param {Function} log - Logger function
 * @returns {Promise<string>} Formatted markdown content for the Amplifier Projects section
 */
async function buildAmplifierProjectsSection(switchboardPath, log = console) {
  try {
    const amplifierPath = path.join(switchboardPath, 'amplifier');
    const projectStatusFile = path.join(amplifierPath, 'project-status.json');
    const reposFile = path.join(amplifierPath, 'repos.json');

    // Check if amplifier folder exists
    try {
      await fs.access(amplifierPath);
    } catch (err) {
      // No amplifier folder yet - skip silently
      return '';
    }

    // Load repos data if available
    let reposData = null;
    try {
      const reposContent = await fs.readFile(reposFile, 'utf8');
      reposData = JSON.parse(reposContent);
    } catch (err) {
      // No repos file - continue without repo sync info
    }

    // Check if project-status.json exists
    let projectData;
    try {
      const content = await fs.readFile(projectStatusFile, 'utf8');
      projectData = JSON.parse(content);
    } catch (err) {
      // No project status file - skip silently
      return '';
    }

    if (!projectData || !projectData.projects || projectData.projects.length === 0) {
      return '';
    }

    // Build the markdown section
    const lines = ['', '## 🔧 Amplifier Projects', ''];

    // Group projects by status
    const started = projectData.projects.filter(p => p.status === 'started');
    const notStarted = projectData.projects.filter(p => p.status === 'not-started');
    const completed = projectData.projects.filter(p => p.status === 'completed');

    // Helper function to get repo info for a project
    const getRepoInfo = (project) => {
      if (!reposData || !project.repoId) return null;
      return reposData.repos.find(r => r.id === project.repoId || r.name === project.repoId);
    };

    // Active projects (started)
    if (started.length > 0) {
      lines.push('### 🚀 Active');
      started
        .sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
        })
        .forEach(project => {
          const priorityEmoji = {
            urgent: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
          }[project.priority] || '';

          lines.push(`- ${priorityEmoji} **[[amplifier/${project.file}|${project.title}]]** (${project.priority})`);

          // Add repo sync status if available
          const repo = getRepoInfo(project);
          if (repo) {
            const syncEmoji = getSyncStatusEmoji(repo.syncStatus);
            const syncMessage = getSyncStatusMessage(repo);
            const versionInfo = repo.version ? ` v${repo.version}` : '';
            lines.push(`  - 📦 ${repo.name}${versionInfo}: ${repo.currentBranch} @ ${repo.localCommit} - ${syncEmoji} ${syncMessage}`);
          }

          if (project.nextActions && project.nextActions.length > 0) {
            const nextAction = project.nextActions[0]; // Show first action only
            lines.push(`  - Next: ${nextAction}`);
          }
        });
      lines.push('');
    }

    // Planned projects (not-started)
    if (notStarted.length > 0 && notStarted.length <= 3) {
      lines.push('### 📋 Planned');
      notStarted.forEach(project => {
        lines.push(`- [[amplifier/${project.file}|${project.title}]]`);
      });
      lines.push('');
    }

    // Recently completed (show only if completed today/this week)
    const recentlyCompleted = completed.filter(p => {
      // For now, show all completed - could add date filtering later
      return true;
    }).slice(0, 2); // Max 2 recent completions

    if (recentlyCompleted.length > 0) {
      lines.push('### ✅ Recently Completed');
      recentlyCompleted.forEach(project => {
        lines.push(`- [[amplifier/${project.file}|${project.title}]]`);
      });
      lines.push('');
    }

    // Add quick links
    lines.push('_See all: [[amplifier/README|Amplifier Projects]] • [[amplifier/REPOS-DASHBOARD|All Repositories]] • [[amplifier/REPO-SYNC-GUIDE|Sync Guide]]_');
    lines.push('');

    return lines.join('\n');

  } catch (error) {
    if (log && log.debug) {
      log.debug('Error building Amplifier projects section:', error.message);
    }
    // Return empty string on error - don't break daily note generation
    return '';
  }
}

module.exports = {
  buildAmplifierProjectsSection,
};
