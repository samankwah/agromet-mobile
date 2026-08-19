import { formatRelativeTime } from '../../shared/utils/formatRelativeTime';

const NOW = new Date('2026-08-17T12:00:00.000Z');

function minutesBefore(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

function minutesAfter(minutes: number): string {
  return new Date(NOW.getTime() + minutes * 60_000).toISOString();
}

describe('formatRelativeTime', () => {
  it('reports "just now" for under a minute', () => {
    expect(formatRelativeTime(minutesBefore(0.5), NOW)).toBe('just now');
  });

  it('formats minutes in the past, singular and plural', () => {
    expect(formatRelativeTime(minutesBefore(1), NOW)).toBe('1 minute ago');
    expect(formatRelativeTime(minutesBefore(12), NOW)).toBe('12 minutes ago');
  });

  it('formats hours in the past once past 60 minutes', () => {
    expect(formatRelativeTime(minutesBefore(90), NOW)).toBe('2 hours ago');
  });

  it('formats days in the past once past 24 hours', () => {
    expect(formatRelativeTime(minutesBefore(60 * 30), NOW)).toBe('1 day ago');
  });

  it('formats future timestamps as "in X" (e.g. an alert expiry)', () => {
    expect(formatRelativeTime(minutesAfter(90), NOW)).toBe('in 2 hours');
  });

  it('falls back to an em dash for an unparseable timestamp', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('—');
  });
});
