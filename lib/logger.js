const levelToNum = { error: 0, warn: 1, info: 2, debug: 3 };

function getLogLevel() {
    if (String(process.env.VERBOSE || '').toLowerCase() === 'true') return 'info';
    const lvl = String(process.env.LOG_LEVEL || 'warn').toLowerCase();
    return levelToNum.hasOwnProperty(lvl) ? lvl : 'warn';
}

function createLogger() {
    const current = getLogLevel();
    const curNum = levelToNum[current];
    const emit = (lvl, args) => {
        if (levelToNum[lvl] <= curNum) {
            // eslint-disable-next-line no-console
            console[lvl === 'debug' ? 'log' : lvl](...args);
        }
    };
    return {
        error: (...args) => emit('error', args),
        warn: (...args) => emit('warn', args),
        info: (...args) => emit('info', args),
        debug: (...args) => emit('debug', args),
        level: current,
    };
}

module.exports = {
    createLogger,
};


