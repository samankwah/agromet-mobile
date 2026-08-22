import { dayLabel, startsNewDay } from '../../features/chat/dayLabel';

// A fixed "now" so these never depend on the real clock, following
// formatRelativeTime's injectable-now convention.
const NOW = new Date(2026, 7, 22, 9, 30);

describe('dayLabel', () => {
  it('names today and yesterday rather than dating them', () => {
    expect(dayLabel(new Date(2026, 7, 22, 6, 0).toISOString(), NOW)).toBe('Today');
    expect(dayLabel(new Date(2026, 7, 21, 23, 59).toISOString(), NOW)).toBe('Yesterday');
  });

  it('dates anything older', () => {
    // Whatever `formatDateShort` produces for the locale — asserted as its
    // actual output rather than a hand-written string, since the ordering is
    // Intl's to choose.
    expect(dayLabel(new Date(2026, 7, 19, 12, 0).toISOString(), NOW)).toBe('Wed, Aug 19');
  });

  it('compares local calendar days, not elapsed hours', () => {
    // Four hours apart, but either side of midnight — so "Yesterday", which is
    // what a 20-hour rule would get wrong.
    expect(dayLabel(new Date(2026, 7, 21, 22, 0).toISOString(), new Date(2026, 7, 22, 2, 0))).toBe(
      'Yesterday',
    );
  });

  it('returns nothing for an unparseable timestamp rather than "Invalid Date"', () => {
    expect(dayLabel('not a date', NOW)).toBe('');
  });
});

describe('startsNewDay', () => {
  it('opens the transcript', () => {
    expect(startsNewDay(NOW.toISOString(), undefined)).toBe(true);
  });

  it('is false within a day and true across midnight', () => {
    const morning = new Date(2026, 7, 22, 8, 0).toISOString();
    const evening = new Date(2026, 7, 22, 20, 0).toISOString();
    const nextDay = new Date(2026, 7, 23, 1, 0).toISOString();

    expect(startsNewDay(evening, morning)).toBe(false);
    expect(startsNewDay(nextDay, evening)).toBe(true);
  });
});
