/**
 * A thing the farmer has asked to be reminded about.
 *
 * Reminders are device-local and have no backend: there is no reminders table,
 * no scheduler and no push infrastructure on the AgroMet server, and a farmer
 * in a field with no signal is the case this app is built for. The record here
 * is the source of truth; the operating system holds only a scheduled
 * notification pointing back at it.
 */

/** How often a reminder repeats. Anything richer than this is a calendar, and
 * the app already has one of those. */
export type ReminderRepeat = 'none' | 'daily' | 'weekly';

/** Where the reminder came from. Drives the row's chip and the empty-state copy. */
export type ReminderSource = 'manual' | 'calendar-activity' | 'weather-alert';

/**
 * What the reminder points back at, when it was not typed from scratch.
 *
 * Kept as one optional object rather than a scatter of nullable columns, so a
 * reminder either has a provenance or plainly does not.
 */
export type ReminderSourceRef = {
  calendarId?: string;
  /** `CalendarActivity.activityId` — the backend's activity_code slug. */
  activityId?: string;
  /** Denormalised so a row can name its origin without loading the calendar. */
  activityName?: string;
  cycleId?: string;
  alertId?: string;
};

export type FarmReminder = {
  id: string;
  title: string;
  note?: string;
  /**
   * ISO 8601 with offset. Written from a local `Date`, so the wall-clock time
   * the farmer picked is what survives a round trip.
   */
  dueAt: string;
  repeat: ReminderRepeat;
  isDone: boolean;
  completedAt?: string | null;
  source: ReminderSource;
  sourceRef?: ReminderSourceRef;
  crop?: string;
  /**
   * The OS's handle on the scheduled notification, so it can be cancelled or
   * rescheduled when the reminder changes.
   *
   * Null is a real and expected state, not a failure: it means nothing is
   * scheduled — because permission was denied, because the runtime cannot
   * schedule at all (Expo Go), or because the reminder is already done. The
   * store reconciles these on launch rather than assuming they hold.
   */
  notificationId?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** What the farmer fills in; everything else is derived by the store. */
export type ReminderDraft = {
  title: string;
  note?: string;
  dueAt: string;
  repeat: ReminderRepeat;
  crop?: string;
  source: ReminderSource;
  sourceRef?: ReminderSourceRef;
};

export const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  none: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
};

export const SOURCE_LABELS: Record<ReminderSource, string> = {
  manual: 'Personal',
  'calendar-activity': 'From calendar',
  'weather-alert': 'From alert',
};
