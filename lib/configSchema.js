function validateConfig(config) {
  const warnings = [];
  if (!config || typeof config !== 'object') {
    return ['config: missing or invalid; using defaults'];
  }
  if (config.filters) {
    if (Array.isArray(config.filters.eventTitles)) {
      if (config.filters.eventTitles.some(s => /joi|ito\.com/i.test(String(s)))) {
        warnings.push('filters.eventTitles contains personal terms; consider generic filters');
      }
    }
  }
  return warnings;
}

module.exports = { validateConfig };


