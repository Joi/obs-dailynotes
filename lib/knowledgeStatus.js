const path = require('path');
const fs = require('fs').promises;

/**
 * Builds a knowledge status section for the daily note from knowledge-status.json.
 * This displays items needing attention and recent curation activity without making API calls.
 *
 * @param {string} switchboardPath - Path to switchboard directory (from env SWITCHBOARD_DATA_PATH parent)
 * @param {Function} log - Logger function
 * @returns {Promise<string>} Formatted markdown content for the Knowledge Status section
 */
async function buildKnowledgeStatusSection(switchboardPath, log = console) {
  try {
    const amplifierPath = path.join(switchboardPath, 'amplifier');
    const knowledgeStatusFile = path.join(amplifierPath, 'knowledge-status.json');

    // Check if knowledge-status.json exists
    let statusData;
    try {
      const content = await fs.readFile(knowledgeStatusFile, 'utf8');
      statusData = JSON.parse(content);
    } catch (err) {
      // No knowledge status file yet - skip silently
      return '';
    }

    if (!statusData || !statusData.vaults) {
      return '';
    }

    // Collect all items needing attention across vaults
    const needsAttention = [];
    for (const [vaultName, vault] of Object.entries(statusData.vaults)) {
      if (vault.needsAttention && vault.needsAttention.length > 0) {
        for (const item of vault.needsAttention) {
          needsAttention.push({
            ...item,
            vault: vaultName,
            vaultPath: vault.path
          });
        }
      }
    }

    // Get recent activity (last 5 items)
    const recentActivity = (statusData.recentActivity || []).slice(0, 5);

    // If nothing to show, return empty
    if (needsAttention.length === 0 && recentActivity.length === 0 && !statusData.lastCuratorRun) {
      return '';
    }

    // Build the markdown section
    const lines = ['', '## 📚 Knowledge Status', ''];

    // Items needing attention
    if (needsAttention.length > 0) {
      lines.push('### Needs Attention');
      needsAttention
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
        })
        .slice(0, 5) // Max 5 items
        .forEach(item => {
          const priorityEmoji = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
          }[item.priority] || '⚪';

          // Format reason for display
          const reasonDisplay = formatReason(item.reason);

          // Create wiki-link path
          const linkPath = item.file.replace('.md', '');
          const displayName = extractDisplayName(item.file);

          lines.push(`- ${priorityEmoji} [[${item.vaultPath}${linkPath}|${displayName}]] - ${reasonDisplay}`);
        });
      lines.push('');
    }

    // Recent curation activity
    if (recentActivity.length > 0) {
      lines.push('### Recent Curation');
      recentActivity.forEach(activity => {
        const actionEmoji = {
          'added-citations': '✅',
          'verified': '✓',
          'flagged': '⚠️',
          'expanded': '📝'
        }[activity.action] || '•';

        const actionDisplay = formatAction(activity);
        const linkPath = activity.file.replace('.md', '');
        const displayName = extractDisplayName(activity.file);
        const dateDisplay = formatDate(activity.date);

        lines.push(`- ${actionEmoji} [[${activity.vault}/${linkPath}|${displayName}]] - ${actionDisplay} (${dateDisplay})`);
      });
      lines.push('');
    }

    // Footer with last run info and link to full report
    const lastRunDisplay = statusData.lastCuratorRun
      ? formatDate(statusData.lastCuratorRun)
      : 'never';
    lines.push(`_Last analysis: ${lastRunDisplay} • [[amplifier/KNOWLEDGE-STATUS|Full Report]]_`);
    lines.push('');

    return lines.join('\n');

  } catch (error) {
    if (log && log.debug) {
      log.debug('Error building Knowledge Status section:', error.message);
    }
    // Return empty string on error - don't break daily note generation
    return '';
  }
}

/**
 * Format reason code into human-readable text
 */
function formatReason(reason) {
  const reasonMap = {
    'uncited-claims': 'uncited claims',
    'outdated-info': 'outdated info',
    'needs-expansion': 'needs expansion',
    'contradictions': 'contradictions found',
    'missing-sources': 'missing sources',
    'unverified': 'unverified'
  };
  return reasonMap[reason] || reason;
}

/**
 * Format activity action into human-readable text
 */
function formatAction(activity) {
  if (activity.action === 'added-citations' && activity.citations) {
    return `added ${activity.citations} citation${activity.citations > 1 ? 's' : ''}`;
  }
  const actionMap = {
    'added-citations': 'added citations',
    'verified': 'verified',
    'flagged': 'flagged for review',
    'expanded': 'expanded content'
  };
  return actionMap[activity.action] || activity.action;
}

/**
 * Extract display name from file path
 */
function extractDisplayName(filePath) {
  // Get the filename without extension and path
  const basename = path.basename(filePath, '.md');
  // Convert kebab-case to Title Case
  return basename
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format date for display (e.g., "Dec 4")
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return dateStr;
  }
}

module.exports = {
  buildKnowledgeStatusSection,
};
