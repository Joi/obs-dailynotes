/**
 * Make sure the format is HH + join token + MM
 * @param {Date} date the date to format
 * @param {String} join_token the join token
 */
function formatHourAndMin(date, join_token='') {
    return (date.getHours() < 10 ? '0' : '') + date.getHours()
        + join_token + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
}

/**
 * Make sure the format is MM + join token + DD
 * @param {Date} date the date to format
 * @param {String} join_token the join token
 */
function formatMonthAndDay(date, join_token='') {
    let month = date.getMonth() + 1;
    let day = date.getDate();

    return (month < 10 ? '0' : '') + month + join_token + 
        (day < 10 ? '0' : '') + day;
}

/**
 * Get today's date boundaries
 */
function getTodayBoundaries() {
    return {
        iso: {
            start: () => new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
            now: () => new Date().toISOString(),
            end: () => new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
        },
        local: {
            start: () => new Date(new Date(new Date().setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString(),
            now: () => new Date(new Date().toString().split('GMT')[0] + ' UTC').toISOString(),
            end: () => new Date(new Date(new Date().setHours(23, 59, 59, 999)).toString().split('GMT')[0] + ' UTC').toISOString()
        }
    };
}

module.exports = {
    formatHourAndMin,
    formatMonthAndDay,
    getTodayBoundaries
};