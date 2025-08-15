const path = require('path');
const fs = require('fs');

/**
 * Load reminders agenda cache for per-person agendas from the vault root.
 * @param {string} pathPrefix - Path to daily notes directory (e.g., ~/switchboard/dailynote)
 * @param {Object} [log] - Optional logger
 * @returns {Promise<Object|null>} Parsed cache or null when unavailable
 */
async function loadAgendaCache(pathPrefix, log = console) {
  try {
    const vaultRoot = path.resolve(pathPrefix, '..');
    const cachePath = path.join(vaultRoot, 'reminders', 'reminders_cache.json');
    const raw = await fs.promises.readFile(cachePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (log && log.debug) log.debug('remindersService.loadAgendaCache: no cache found');
    return null;
  }
}

module.exports = {
  loadAgendaCache,
};


