/**
 * Simple macOS Keychain wrapper using the `security` CLI.
 *
 * Provides helpers to read the MailStore password from the Keychain.
 * Falls back to environment variables when not found.
 */
const { execFileSync } = require('child_process');

function getGenericPassword({ service, account }) {
  if (!service || !account) return null;
  try {
    const output = execFileSync(
      'security',
      ['find-generic-password', '-s', service, '-a', account, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const password = output.trim();
    return password.length > 0 ? password : null;
  } catch {
    return null;
  }
}

function getMailstorePassword({ account, service } = {}) {
  const resolvedService = service || process.env.MAILSTORE_KEYCHAIN_SERVICE || 'obs-dailynotes.mailstore';
  const resolvedAccount = account || process.env.MAILSTORE_KEYCHAIN_ACCOUNT || process.env.MAILSTORE_USER;
  const fromKeychain = getGenericPassword({ service: resolvedService, account: resolvedAccount });
  if (fromKeychain) return fromKeychain;
  // Fallback for compatibility
  return process.env.MAILSTORE_PASSWORD || null;
}

module.exports = {
  getGenericPassword,
  getMailstorePassword,
};


