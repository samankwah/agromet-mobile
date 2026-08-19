import type { CalendarActivity } from '../../../shared/domain/calendar';

/**
 * The pure maths behind the calendar grid — no React, no theme, no layout.
 *
 * Extracted for the same reason `computeRangeBarPosition` was pulled out of
 * TemperatureRangeBar: an off-by-one in week indexing draws a bar under the
 * wrong month, which is the kind of bug that survives every visual review
 * and only shows up when a farmer plants three weeks late.
 */

/** A merged header segment spanning `endWeek - startWeek + 1` columns. */
export type WeekBand = { key: string; label: string; startWeek: number; endWeek: number };

/** A contiguous, single-coloured stretch of one activity — one View. */
export type ActivityRun = { key: string; startWeek: number; endWeek: number; color: string | null };

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** "April" | "apr" | "4" → 3 (0-based). Null when unrecognised. */
export function monthNameToIndex(name: string | null | undefined): number | null {
  if (!name) return null;
  const value = String(name).trim().toLowerCase();
  if (!value) return null;

  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric - 1;

  const index = MONTHS_LONG.findIndex((month) => month === value || month.slice(0, 3) === value.slice(0, 3));
  return index === -1 ? null : index;
}

/**
 * The real date week 1 begins, or null when the calendar has no anchor.
 *
 * Most calendars genuinely have none — the Tomato calendar in the database
 * has `year: null` and no season start month, because a production calendar
 * describes a cycle ("week 4 after planting"), not a point in the year. A
 * running production cycle supplies one, which is what turns week numbers
 * into dates a farmer can act on.
 */
export function resolveWeekOneDate(input: {
  cycleStartDate?: string | null;
  seasonStartMonth?: string | null;
  year?: number | null;
}): Date | null {
  if (input.cycleStartDate) {
    const parsed = new Date(input.cycleStartDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const monthIndex = monthNameToIndex(input.seasonStartMonth);
  if (monthIndex === null || !input.year) return null;
  return new Date(input.year, monthIndex, 1);
}

export function weekStartDate(weekOne: Date, week: number): Date {
  const date = new Date(weekOne.getTime());
  date.setDate(date.getDate() + (week - 1) * 7);
  return date;
}

/**
 * Merged month headers. Walks the weeks, groups the ones landing in the same
 * calendar month, and returns one band per group — which is how you get a
 * colspan without a table engine: render each band as a single View of
 * `span * columnWidth`.
 */
export function buildMonthBands(totalWeeks: number, weekOne: Date | null): WeekBand[] {
  if (!weekOne || totalWeeks < 1) return [];

  const bands: WeekBand[] = [];
  const baseYear = weekOne.getFullYear();

  for (let week = 1; week <= totalWeeks; week += 1) {
    const date = weekStartDate(weekOne, week);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const previous = bands[bands.length - 1];

    if (previous && previous.key === key) {
      previous.endWeek = week;
      continue;
    }
    // Year suffix only once the season crosses into a new year, so the
    // common case reads "Apr May Jun", not "Apr '26 May '26".
    const suffix = date.getFullYear() === baseYear ? '' : ` '${String(date.getFullYear()).slice(-2)}`;
    bands.push({ key, label: `${MONTHS_SHORT[date.getMonth()]}${suffix}`, startWeek: week, endWeek: week });
  }

  return bands;
}

/** Fallback headers for a calendar with no date anchor: fixed week blocks. */
export function buildWeekBlockBands(totalWeeks: number, blockSize = 4): WeekBand[] {
  const bands: WeekBand[] = [];
  for (let start = 1; start <= totalWeeks; start += blockSize) {
    const end = Math.min(totalWeeks, start + blockSize - 1);
    bands.push({ key: `block-${start}`, label: start === end ? `W${start}` : `W${start}–${end}`, startWeek: start, endWeek: end });
  }
  return bands;
}

/**
 * An activity's coloured stretches.
 *
 * Rendering one cell per week would cost 12 activities x 36 weeks = 432
 * Views for a screen that only ever shows a dozen bars. A run is one View,
 * so the same calendar costs ~14. Weeks are clamped into [1, totalWeeks] so
 * a bad spreadsheet upload can't push a bar off-canvas.
 */
export function activityRuns(activity: CalendarActivity, totalWeeks: number): ActivityRun[] {
  if (totalWeeks < 1) return [];

  const color = activity.backgroundColor ?? activity.colors?.[0] ?? null;
  const rawStart = activity.startWeek;
  const rawEnd = activity.endWeek ?? activity.startWeek;
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) return [];

  const start = Math.min(Math.max(Math.round(rawStart), 1), totalWeeks);
  const end = Math.min(Math.max(Math.round(rawEnd), 1), totalWeeks);
  if (end < start) return [];

  return [{ key: `${activity.id}-${start}`, startWeek: start, endWeek: end, color }];
}

export function formatWeekRange(startWeek: number, endWeek: number): string {
  return startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}–${endWeek}`;
}

/**
 * A week's day range, as the printed calendars label it: "29-04" for the
 * week beginning 29 December. Null without a date anchor, so no screen can
 * imply a date the calendar does not carry.
 */
export function weekDateRange(weekOne: Date | null, week: number): string | null {
  if (!weekOne) return null;
  const start = weekStartDate(weekOne, week);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 6);
  const dd = (date: Date) => String(date.getDate()).padStart(2, '0');
  return `${dd(start)}-${dd(end)}`;
}

/** Compact form for the frozen column, where space is scarce. */
export function formatWeekRangeShort(startWeek: number, endWeek: number): string {
  return startWeek === endWeek ? `W${startWeek}` : `W${startWeek}–${endWeek}`;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "20 Apr – 11 May", or null without a date anchor. */
export function formatActivityDates(runs: ActivityRun[], weekOne: Date | null): string | null {
  if (!weekOne || runs.length === 0) return null;

  const first = weekStartDate(weekOne, runs[0].startWeek);
  // The last week's activity runs to the end of that week, not its start.
  const last = weekStartDate(weekOne, runs[runs.length - 1].endWeek);
  last.setDate(last.getDate() + 6);

  return `${formatDay(first)} – ${formatDay(last)}`;
}

/**
 * The one spoken description of a row.
 *
 * This is what makes the grid usable without sight and without colour: the
 * coloured bars are hidden from the accessibility tree entirely, and this
 * sentence carries every fact they encode.
 */
export function activityAccessibilityLabel(
  activity: CalendarActivity,
  runs: ActivityRun[],
  totalWeeks: number,
  weekOne: Date | null,
): string {
  if (runs.length === 0) return `${activity.activityName}. No scheduled weeks.`;

  const spans = runs
    .map((run) => (run.startWeek === run.endWeek ? `week ${run.startWeek}` : `weeks ${run.startWeek} to ${run.endWeek}`))
    .join(', and ');

  const dates = formatActivityDates(runs, weekOne);
  return `${activity.activityName}. ${spans} of ${totalWeeks}.${dates ? ` ${dates}.` : ''}`;
}

/** Which activities are live in a given week — the "what do I do now" view. */
export function activitiesInWeek(activities: CalendarActivity[], week: number, totalWeeks: number): CalendarActivity[] {
  return activities.filter((activity) => activityRuns(activity, totalWeeks).some((run) => week >= run.startWeek && week <= run.endWeek));
}

/**
 * One legible column width, always.
 *
 * There used to be a "fit the whole season on screen" mode. On a 360px
 * phone a 34-week calendar got 209px of body, which is 6px per week: a
 * single-week activity became a 6px dot, most bars were too narrow to
 * carry a label, and the month header was unreadable. The desktop version
 * gives each week ~50px. A calendar compressed eight-fold is not a smaller
 * calendar, it is a picture of one — so the grid now scrolls instead.
 */
export const WEEK_COLUMN_WIDTH = 38;

/** The frozen column. Wide enough for two lines of a real activity name,
 * narrow enough to leave a usable strip of weeks beside it. */
export function computeNameColumnWidth(screenWidth: number): number {
  return Math.round(Math.min(156, Math.max(112, screenWidth * 0.36)));
}
