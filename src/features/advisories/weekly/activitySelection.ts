import type { AdvisoryActivity } from '../../../shared/domain/weeklyAdvisory';
import type { SheetOption } from '../../../shared/ui/OptionSheet';

/**
 * Choosing an activity by when it happens rather than by what it is called.
 *
 * The chip row picks an activity by name — "Land preparation". These pick the
 * same activities by their week, their month, or a date on the calendar, which
 * is how a farmer who wants to know about *next week* thinks. Both end in the
 * same place: an index into the bulletin's activities.
 *
 * Pure, and separate from the panel, because the awkward parts are the parsing
 * and the ties, not the rendering.
 */

/**
 * A bulletin date, as the spreadsheet writes it: "YYYY-MM-DD".
 *
 * Parsed by hand rather than with `new Date(text)`, which reads a bare date as
 * UTC midnight. A device in a negative-offset timezone would then see the day
 * before, which is enough to land on the wrong week.
 */
export function parseIsoDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return Number.isNaN(date.getTime()) ? null : date;
}

/** The distinct week labels in the bulletin, each pointing at its activity. */
export function weekOptions(activities: AdvisoryActivity[]): SheetOption[] {
  return distinctBy(activities, (activity) => activity.metadata.week);
}

/** The distinct months in the bulletin, each pointing at its first activity. */
export function monthOptions(activities: AdvisoryActivity[]): SheetOption[] {
  return distinctBy(activities, (activity) => activity.metadata.monthYear);
}

/**
 * The first activity holding each distinct value, as sheet options.
 *
 * First rather than last: two activities can share a month, and the earlier one
 * is the one a farmer reading down the bulletin reaches first. Blank values are
 * dropped — an option labelled "-" selects nothing a farmer asked for.
 */
function distinctBy(activities: AdvisoryActivity[], read: (activity: AdvisoryActivity) => string): SheetOption[] {
  const seen = new Set<string>();
  const options: SheetOption[] = [];

  activities.forEach((activity, index) => {
    const label = read(activity).trim();
    if (label === '' || label === '-' || seen.has(label)) return;

    seen.add(label);
    options.push({ id: String(index), label });
  });

  return options;
}

/** The dates an activity covers, where the bulletin gave them. */
export function activityWindow(activity: AdvisoryActivity): { start: Date | null; end: Date | null } {
  return {
    start: parseIsoDate(activity.metadata.startDate),
    end: parseIsoDate(activity.metadata.endDate),
  };
}

/**
 * The activity covering a date, or the nearest one to it.
 *
 * A bulletin's activities do not always tile the calendar — there can be a gap
 * between one activity ending and the next beginning, and a farmer who picks a
 * date in that gap still means "the advice around then". Falling back to the
 * nearest window answers that, where returning nothing would leave the tap
 * looking broken. Ties go to the earlier activity.
 *
 * Returns -1 only when no activity carries a usable date at all.
 */
export function activityForDate(activities: AdvisoryActivity[], date: Date): number {
  const target = date.getTime();

  /* One activity with a missing end date still covers its start date, and vice
     versa — a one-day window rather than no window at all. */
  const windows = activities.map((activity) => {
    const { start, end } = activityWindow(activity);
    if (!start && !end) return null;

    return { from: (start ?? end)!.getTime(), to: (end ?? start)!.getTime() };
  });

  const covering = windows.findIndex((window) => window && target >= window.from && target <= window.to);
  if (covering !== -1) return covering;

  let nearest = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  windows.forEach((window, index) => {
    if (!window) return;

    const distance = target < window.from ? window.from - target : target - window.to;
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });

  return nearest;
}

/** The date a date picker should open on for the activity being shown. */
export function initialPickerDate(activity: AdvisoryActivity | null, field: 'start' | 'end'): Date {
  if (!activity) return new Date();

  const { start, end } = activityWindow(activity);

  return (field === 'start' ? start ?? end : end ?? start) ?? new Date();
}
