const { formatHourAndMin, formatMonthAndDay, getRFC3339LocalDayBounds } = require('../../lib/dateUtils');

describe('dateUtils', () => {
  test('formatHourAndMin pads correctly', () => {
    const d = new Date('2025-01-01T03:04:00Z');
    d.setHours(3); d.setMinutes(4);
    expect(formatHourAndMin(d, '')).toBe('0304');
    expect(formatHourAndMin(d, ':')).toBe('03:04');
  });

  test('formatMonthAndDay pads correctly', () => {
    const d = new Date('2025-01-01T00:00:00Z');
    expect(formatMonthAndDay(d, '')).toBe('0101');
    expect(formatMonthAndDay(d, '-')).toBe('01-01');
  });

  test('getRFC3339LocalDayBounds returns consistent format', () => {
    const d = new Date('2025-01-02T12:34:56Z');
    const b = getRFC3339LocalDayBounds(d);
    expect(b.ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(b.start).toMatch(/T00:00:00[+-]\d{2}:\d{2}$/);
    expect(b.end).toMatch(/T23:59:59\.999[+-]\d{2}:\d{2}$/);
  });
});
