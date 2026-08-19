import { formatDayOfYearAsWeekOfMonth, weekOfMonth } from '../../shared/utils/formatDayOfYear';
import { formatSpatialValue } from '../../shared/utils/formatSpatialValue';

describe('weekOfMonth', () => {
  it('counts calendar weeks from the 1st', () => {
    expect(weekOfMonth(1)).toBe(1);
    expect(weekOfMonth(7)).toBe(1);
    expect(weekOfMonth(8)).toBe(2);
    expect(weekOfMonth(15)).toBe(3);
    expect(weekOfMonth(29)).toBe(5);
  });
});

describe('formatDayOfYearAsWeekOfMonth', () => {
  it('resolves day-of-year into the right month and week', () => {
    // Day 1 = Jan 1
    expect(formatDayOfYearAsWeekOfMonth(1)).toBe('Jan W1');
    // Day 74 = Mar 15 (31 Jan + 28 Feb = 59, +15)
    expect(formatDayOfYearAsWeekOfMonth(74)).toBe('Mar W3');
    // Day 365 = Dec 31
    expect(formatDayOfYearAsWeekOfMonth(365)).toBe('Dec W5');
  });

  it('covers the onset range used by the seasonal outlook', () => {
    expect(formatDayOfYearAsWeekOfMonth(74)).toMatch(/^Mar W\d$/);
    expect(formatDayOfYearAsWeekOfMonth(135)).toMatch(/^May W\d$/);
  });

  it('is stable rather than shifting with leap years', () => {
    // Pinned reference year — the same input must always give the same
    // week, otherwise a forecast would appear to move between years.
    expect(formatDayOfYearAsWeekOfMonth(74)).toBe(formatDayOfYearAsWeekOfMonth(74));
    expect(formatDayOfYearAsWeekOfMonth(60)).toBe('Mar W1');
  });

  it('falls back readably for non-finite input', () => {
    expect(formatDayOfYearAsWeekOfMonth(NaN)).toBe('—');
  });
});

describe('formatSpatialValue', () => {
  it('renders day-of-year variables as a week of month, not a raw number', () => {
    expect(formatSpatialValue(74, 'day-of-year', 61)).toBe('Mar W3');
  });

  it('rounds plain numbers on a wide range', () => {
    expect(formatSpatialValue(612.4, 'number', 557)).toBe('612');
  });

  it('keeps a decimal on a narrow range so adjacent legend breaks stay distinct', () => {
    expect(formatSpatialValue(24.25, 'number', 8)).toBe('24.3');
  });
});
