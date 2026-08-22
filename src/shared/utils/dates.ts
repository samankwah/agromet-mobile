/**
 * Local-time date helpers.
 *
 * Every function here works in the device's own timezone, deliberately. The
 * temptation with dates in JavaScript is to reach for `toISOString()`, which
 * converts to UTC — and for anyone west of Greenwich that silently moves the
 * date back a day. Ghana sits at UTC+0 but its neighbours do not, and a farmer
 * whose reminder fires on the wrong day has been failed by the app.
 *
 * `toIsoDate` and `formatDate` were previously private to StartCycleForm; they
 * live here now because the reminders form needs exactly the same behaviour and
 * two copies of a timezone rule is one copy too many.
 */

/** ISO calendar date (YYYY-MM-DD) in local time, never shifted to UTC. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "Monday, 20 August 2026" — long form, for confirming a chosen date. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "Mon 20 Aug" — short form, for list rows where space is tight. */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "07:00" — 24-hour, which is unambiguous and shorter than an am/pm string. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "Mon 20 Aug, 07:00". */
export function formatDateTime(date: Date): string {
  return `${formatDateShort(date)}, ${formatTime(date)}`;
}

/** A copy of `date` at the given wall-clock time, seconds and ms zeroed. */
export function atTimeOfDay(date: Date, hours: number, minutes = 0): Date {
  const next = new Date(date.getTime());
  next.setHours(hours, minutes, 0, 0);
  return next;
}

/** Midnight at the start of `date`'s day, in local time. */
export function startOfDay(date: Date): Date {
  return atTimeOfDay(date, 0, 0);
}

/**
 * `days` whole days after `date`, preserving the wall-clock time.
 *
 * Uses `setDate` rather than adding milliseconds so that a daylight-saving
 * transition moves the clock, not the appointment: 07:00 stays 07:00.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** True when both instants fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** Whole local days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  const millisPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / millisPerDay);
}
