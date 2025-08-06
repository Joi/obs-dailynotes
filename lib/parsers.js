const { formatHourAndMin } = require('./dateUtils');

/**
 * Find an URL inside a string and potentially find a token in it
 * @param {String} text the text search the URL into
 * @param {String} substr the token to search for
 */
function findUrlWithHint(text, substr) {
    let urlRegex = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

    let ret = text.match(urlRegex);
    if (ret == null || ret == undefined)
        return '';

    if (substr != undefined) {
        for (var i = 0; i < ret.length; i++) {
            if (ret[i].indexOf(substr) != -1)
                return ret[i];
        }
        return '';
    } else
        return ret[0];
}

/**
 * Parse an invite with a google hangout link
 * @return {object} None or an object with call details
 */
function parseGoogleHangout(event) {
    let output = {
        'callTitle': '', 'fullStartDate':'', 'callStart': '', 'callEnd': '',
        'attendees': [], 'url': '', 'type': 'videoCall', 'location': ''
    };
    if (event.hangoutLink == undefined)
        return undefined;

    output.callTitle = event.summary;
    output.url = event.hangoutLink;

    let tmpDate = new Date(event.start.dateTime || event.start.date);
    output.fullStartDate = tmpDate;
    output.callStart = formatHourAndMin(tmpDate, ":");
    tmpDate = new Date(event.end.dateTime || event.end.date);
    output.callEnd = formatHourAndMin(tmpDate, ":");

    event.attendees.map((attendee, i) => {
        output.attendees.push(attendee.displayName || attendee.email);
    });
    
    output.location = '';

    return output;
}

/**
 * Parse an invite with a Zoom link
 * @return {object} None or an object with call details
 */
function parseZoom(event) {
    let output = {
        'callTitle': '', 'fullStartDate':'', 'callStart': '', 'callEnd': '',
        'attendees': [], 'url': '', 'type': 'videoCall', 'location': ''
    };

    output.callTitle = event.summary;

    let tmpDate = new Date(event.start.dateTime || event.start.date);
    output.fullStartDate = tmpDate;
    output.callStart = formatHourAndMin(tmpDate, ":");
    tmpDate = new Date(event.end.dateTime || event.end.date);
    output.callEnd = formatHourAndMin(tmpDate, ":");

    if (event.attendees) {
        event.attendees.map((attendee, i) => {
            output.attendees.push(attendee.displayName || attendee.email);
        });
    } else
        output.attendees.push('no attendees listed');

    if (event.location && event.location.indexOf('http') != -1)
        output.url = findUrlWithHint(event.location, 'zoom');
    if (output.url.indexOf('zoom') == -1 && event.description &&
        event.description.indexOf('http') != -1)
        output.url = findUrlWithHint(event.description, 'zoom');
    if (output.url.indexOf('zoom') == -1 && event.summary &&
        event.summary.indexOf('http') != -1)
        output.url = findUrlWithHint(event.summary, 'zoom');
    
    if (output.url == '')
        return undefined;
    
    output.location = '';

    return output;
}

/**
 * Parse other meeting types (in-person or with generic URLs)
 * @return {object} None or an object with meeting details
 */
function parseOtherMeetingType(event) {
    let output = {
        'callTitle': '', 'fullStartDate': '', 'callStart': '', 'callEnd': '',
        'attendees': [], 'url': '', 'location' : '', 'type': 'inPerson'
    };

    output.callTitle = event.summary;

    let tmpDate = new Date(event.start.dateTime || event.start.date);
    output.fullStartDate = tmpDate;
    output.callStart = formatHourAndMin(tmpDate, ":");
    tmpDate = new Date(event.end.dateTime || event.end.date);
    output.callEnd = formatHourAndMin(tmpDate, ":");

    if (event.attendees) {
        event.attendees.map((attendee, i) => {
            output.attendees.push(attendee.displayName || attendee.email);
        });
    } else
        return undefined;

    if (event.location && event.location.indexOf('http') != -1)
        output.url = findUrlWithHint(event.location);
    if (output.url.indexOf('http') == -1 && event.description &&
        event.description.indexOf('http') != -1)
        output.url = findUrlWithHint(event.description);
    if (output.url.indexOf('http') == -1 && event.summary &&
        event.summary.indexOf('http') != -1)
        output.url = findUrlWithHint(event.summary);

    if (output.url == '') {
        output.location = event.location || '';
    } else {
        output.location = '';
    }

    return output;
}

module.exports = {
    parseGoogleHangout,
    parseZoom,
    parseOtherMeetingType
};