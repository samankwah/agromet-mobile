/**
 * Onset and cessation are published as day-of-year, which is unreadable
 * for planning — "day 74" tells a farmer nothing. This renders it as the
 * week of the month it falls in ("Mar W3"), which maps directly onto how
 * planting decisions are actually made.
 *
 * A fixed non-leap reference year keeps the mapping deterministic: leap
 * years shift day-of-year by one after February, which would make the
 * same forecast value render as a different week depending on the year.
 * At week granularity that shift is noise, and pinning the year avoids
 * it entirely.
 */
const REFERENCE_YEAR = 2025; // non-leap

/** Week of the month, 1-5 — calendar weeks counted from the 1st, not ISO
 * weeks, since "the second week of April" is how the target audience
 * talks about planting windows. */
export function weekOfMonth(dayOfMonth: number): number {
  return Math.ceil(dayOfMonth / 7);
}

export function formatDayOfYearAsWeekOfMonth(dayOfYear: number): string {
  if (!Number.isFinite(dayOfYear)) return '—';

  // Date's month overflow does the day-of-year arithmetic for us:
  // Jan 74th resolves to Mar 15th.
  const date = new Date(Date.UTC(REFERENCE_YEAR, 0, Math.round(dayOfYear)));
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} W${weekOfMonth(date.getUTCDate())}`;
}
