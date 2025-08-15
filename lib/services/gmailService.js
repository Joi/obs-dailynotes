/**
 * Minimal Gmail service scaffold. Future work will plug a real client here.
 */

/**
 * Fetch flagged/starred messages for triage.
 * For now, returns an empty array to avoid side effects in refactor.
 * @param {Object} opts
 * @param {Object} [opts.log]
 * @returns {Promise<Array<{id:string, subject:string, from:string, date:string, threadId?:string}>>}
 */
async function fetchFlaggedMessages({ log = console } = {}) {
    if (log && log.debug) log.debug('gmailService.fetchFlaggedMessages: stub returning empty list');
    return [];
}

module.exports = {
    fetchFlaggedMessages,
};


