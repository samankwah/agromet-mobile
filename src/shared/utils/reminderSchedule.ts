import type { FarmReminder, ReminderRepeat } from '../domain/farmReminder';
import { addDays, daysBetween, isSameDay, startOfDay } from './dates';

/**
 * When a reminder is due, and how a list of them should be arranged.
 *
 * Pure: no React, no storage, no native modules, and no hidden clock. Every
 * function takes `now` as a defaulted last argument, which is the convention
 * `formatRelativeTime` and `gridGeometry` already follow — the repo has no
 * fake-timer infrastructure precisely because nothing needs it.
 */

export type DueState = 'done' | 'overdue' | 'today' | 'upcoming';

export type ReminderGroups = {
  overdue: FarmReminder[];
  today: FarmReminder[];
  thisWeek: FarmReminder[];
  later: FarmReminder[];
  done: FarmReminder[];
};

/** Parses `dueAt`, returning null rather than an Invalid Date. */
export function parseDueAt(reminder: FarmReminder): Date | null {
  const parsed = new Date(reminder.dueAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Where this reminder stands.
 *
 * `done` wins over everything: a completed task is not overdue, and telling a
 * farmer they are late for something they have already finished is the fastest
 * way to make them stop trusting the list.
 */
export function dueState(reminder: FarmReminder, now: Date = new Date()): DueState {
  if (reminder.isDone) return 'done';

  const due = parseDueAt(reminder);
  if (!due) return 'upcoming';

  if (due.getTime() < now.getTime()) return isSameDay(due, now) ? 'today' : 'overdue';
  return isSameDay(due, now) ? 'today' : 'upcoming';
}

/**
 * The next time a repeating reminder should fire after `now`.
 *
 * Steps forward in whole days from the original due time so the wall-clock
 * hour is preserved across a daylight-saving change — 07:00 stays 07:00 rather
 * than drifting to 06:00. Returns null for a one-off reminder, which is the
 * signal to stop rescheduling rather than an error.
 */
export function nextOccurrence(reminder: FarmReminder, now: Date = new Date()): Date | null {
  if (reminder.repeat === 'none') return null;

  const due = parseDueAt(reminder);
  if (!due) return null;

  const step = reminder.repeat === 'weekly' ? 7 : 1;
  if (due.getTime() > now.getTime()) return due;

  // Jump most of the way in one calculation rather than looping day by day,
  // which matters for a daily reminder left untouched for a season.
  const elapsed = daysBetween(due, now);
  const periods = Math.floor(elapsed / step);
  let next = addDays(due, periods * step);
  while (next.getTime() <= now.getTime()) {
    next = addDays(next, step);
  }
  return next;
}

/**
 * The instant to hand the OS scheduler, or null when nothing should be scheduled.
 *
 * A one-off reminder whose time has passed returns null: the farmer still sees
 * it in the overdue list, but re-firing a notification for a moment that is
 * gone would be noise.
 */
export function scheduleTargetFor(reminder: FarmReminder, now: Date = new Date()): Date | null {
  if (reminder.isDone) return null;

  if (reminder.repeat !== 'none') return nextOccurrence(reminder, now);

  const due = parseDueAt(reminder);
  if (!due || due.getTime() <= now.getTime()) return null;
  return due;
}

/** Soonest first. Unparseable dates sort last rather than scrambling the list. */
export function sortByDue(reminders: FarmReminder[]): FarmReminder[] {
  return [...reminders].sort((a, b) => {
    const left = parseDueAt(a);
    const right = parseDueAt(b);
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return left.getTime() - right.getTime();
  });
}

/** Most recently completed first — the useful order for a "done" list. */
function sortByCompleted(reminders: FarmReminder[]): FarmReminder[] {
  return [...reminders].sort((a, b) => {
    const left = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const right = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return right - left;
  });
}

/**
 * Split reminders into the buckets the screen renders.
 *
 * "This week" means the next seven days rather than up to Sunday: a farmer on
 * Saturday cares what is coming in the next week, not that the calendar week is
 * nearly over.
 */
export function groupReminders(reminders: FarmReminder[], now: Date = new Date()): ReminderGroups {
  const groups: ReminderGroups = { overdue: [], today: [], thisWeek: [], later: [], done: [] };
  const weekEnd = startOfDay(addDays(now, 7));

  for (const reminder of reminders) {
    const state = dueState(reminder, now);
    if (state === 'done') {
      groups.done.push(reminder);
      continue;
    }
    if (state === 'overdue') {
      groups.overdue.push(reminder);
      continue;
    }
    if (state === 'today') {
      groups.today.push(reminder);
      continue;
    }

    const due = parseDueAt(reminder);
    if (due && due.getTime() < weekEnd.getTime()) groups.thisWeek.push(reminder);
    else groups.later.push(reminder);
  }

  return {
    overdue: sortByDue(groups.overdue),
    today: sortByDue(groups.today),
    thisWeek: sortByDue(groups.thisWeek),
    later: sortByDue(groups.later),
    done: sortByCompleted(groups.done),
  };
}

/**
 * What the Farm Tools badge shows: things needing attention now.
 *
 * Overdue plus due-today, because a badge counting everything scheduled for
 * next month would be permanently lit and therefore ignored.
 */
export function attentionCount(reminders: FarmReminder[], now: Date = new Date()): number {
  return reminders.filter((reminder) => {
    const state = dueState(reminder, now);
    return state === 'overdue' || state === 'today';
  }).length;
}

/** Human label for a repeat rule, for the notification body. */
export function repeatSuffix(repeat: ReminderRepeat): string {
  if (repeat === 'daily') return ' · repeats daily';
  if (repeat === 'weekly') return ' · repeats weekly';
  return '';
}

export type WeekProgress = {
  /** Completed in the last seven days. */
  completed: number;
  /** Still outstanding and due within the next seven days, overdue included. */
  remaining: number;
  total: number;
  percent: number;
};

/**
 * How much of this week's work is behind the farmer.
 *
 * Deliberately a seven-day window in both directions rather than a calendar
 * week: on a Saturday, "since Monday" would show almost nothing done and
 * almost nothing left, which flatters and informs in equal measure — neither
 * of which is useful.
 *
 * Anything not due this week is excluded from both halves. Counting next
 * month's work as "remaining" would keep the bar permanently short no matter
 * how much the farmer got through today.
 */
export function weekProgress(reminders: FarmReminder[], now: Date = new Date()): WeekProgress {
  const weekAgo = addDays(now, -7).getTime();
  const weekAhead = startOfDay(addDays(now, 7)).getTime();

  let completed = 0;
  let remaining = 0;

  for (const reminder of reminders) {
    if (reminder.isDone) {
      const at = reminder.completedAt ? new Date(reminder.completedAt).getTime() : NaN;
      if (!Number.isNaN(at) && at >= weekAgo) completed += 1;
      continue;
    }

    const due = parseDueAt(reminder);
    if (due && due.getTime() < weekAhead) remaining += 1;
  }

  const total = completed + remaining;
  return { completed, remaining, total, percent: total === 0 ? 0 : (completed / total) * 100 };
}
