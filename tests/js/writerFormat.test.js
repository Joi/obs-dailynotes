const { formatOutput } = require('../../lib/writer');

function baseOutput(overrides = {}) {
  const now = new Date('2025-08-13T10:00:00Z');
  return Object.assign({
    emoji: '',
    callTitle: 'Test Meeting',
    fullStartDate: now,
    callStart: '10:00',
    callEnd: '10:30',
    attendees: ['alice@example.com', 'Bob Smith', 'charlie.long-name@example.com', 'Dana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'],
    url: 'https://teams.microsoft.com/l/meetup-join/abc',
    type: 'videoCall',
    location: ''
  }, overrides);
}

const config = {
  formatting: {
    includeEmojis: {},
    showAttendees: true,
    maxAttendeesShown: 10,
    showMeetingLinks: true,
    meetingLinkText: 'Call Link',
    showLocation: true,
  },
  output: {
    meetingTemplate: {
      format: '### {emoji} {title} #{tag}',
      includeTime: true,
      includeAttendees: true,
      includeLink: true,
      includeNoteLink: false,
      includeLocation: true,
    }
  }
};

describe('formatOutput vendor label and attendee truncation', () => {
  test('labels Teams link and moves long attendees to a block line', () => {
    const out = formatOutput(baseOutput(), config);
    expect(out).toContain('[Teams Link](');
    expect(out).toContain('\n- Attendees: ');
  });

  test('uses Meet Link label', () => {
    const output = baseOutput({ url: 'https://meet.google.com/abc-defg-hij' });
    const out = formatOutput(output, config);
    expect(out).toContain('[Meet Link](');
  });

  test('uses Webex Link label', () => {
    const output = baseOutput({ url: 'https://company.webex.com/meet/room' });
    const out = formatOutput(output, config);
    expect(out).toContain('[Webex Link](');
  });

  test('uses Zoom Link label', () => {
    const output = baseOutput({ url: 'https://us06web.zoom.us/j/123456' });
    const out = formatOutput(output, config);
    expect(out).toContain('[Zoom Link](');
  });
});


