import { daysBetween, formatDateShort } from '../../shared/utils/dates';

/**
 * The label on a date separator: "Today", "Yesterday", or the short date.
 *
 * `now` is injectable so tests do not depend on the real clock, following
 * `formatRelativeTime`. Built on `daysBetween`, which works in local time — a
 * transcript that labelled last night's messages "Today" because the device is
 * west of Greenwich would be worse than no separator at all.
 */
export function dayLabel(isoString: string, now: Date = new Date()): string {
  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return '';

  const days = daysBetween(then, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return formatDateShort(then);
}

/** True when these two instants belong under different date separators. */
export function startsNewDay(isoString: string, previousIsoString?: string): boolean {
  if (!previousIsoString) return true;

  const then = new Date(isoString);
  const previous = new Date(previousIsoString);
  if (Number.isNaN(then.getTime()) || Number.isNaN(previous.getTime())) return false;

  return daysBetween(previous, then) !== 0;
}
