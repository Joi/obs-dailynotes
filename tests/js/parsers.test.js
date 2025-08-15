const { parseZoom, parseTeams, parseWebex, parseOtherMeetingType } = require('../../lib/parsers');

function makeEvent({ summary='Test', start='2025-08-13T10:00:00Z', end='2025-08-13T10:30:00Z', location='', description='' }) {
  return {
    summary,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: [ { email: 'alice@example.com', displayName: 'Alice' }, { email: 'bob@example.com', displayName: 'Bob' } ],
    location,
    description,
  };
}

describe('Parsers: meeting URL detection', () => {
  test('detects Zoom link from location', () => {
    const ev = makeEvent({ location: 'https://us06web.zoom.us/j/123456789' });
    const out = parseZoom(ev);
    expect(out).toBeTruthy();
    expect(out.url).toContain('zoom.us');
  });

  test('detects Teams link from description', () => {
    const ev = makeEvent({ description: 'Join here: https://teams.microsoft.com/l/meetup-join/abc' });
    const out = parseTeams(ev);
    expect(out).toBeTruthy();
    expect(out.url).toContain('teams.microsoft.com');
  });

  test('detects Webex link from summary', () => {
    const ev = makeEvent({ summary: 'Standup https://company.webex.com/meet/room' });
    const out = parseWebex(ev);
    expect(out).toBeTruthy();
    expect(out.url).toContain('webex.com');
  });

  test('falls back to in-person when only location text', () => {
    const ev = makeEvent({ location: 'Conference Room A' });
    const out = parseOtherMeetingType(ev);
    expect(out).toBeTruthy();
    expect(out.url).toBe('');
    expect(out.location).toBe('Conference Room A');
  });
});


