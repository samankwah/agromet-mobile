import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';

import type { FarmReminder } from '../domain/farmReminder';
import { repeatSuffix, scheduleTargetFor } from '../utils/reminderSchedule';

/**
 * Everything that talks to the operating system's notification service.
 *
 * This is the only module in the app that imports `expo-notifications`. Keeping
 * that boundary tight is what lets the reminder store, the screens and all the
 * scheduling arithmetic be tested without a native module in sight — the tests
 * mock this one file, not a native API surface.
 *
 * Nothing here throws. A farmer who has denied notification permission, or who
 * is running the app in Expo Go, should still get a working reminders list; the
 * alerts are the part that degrades, and the UI says so plainly rather than
 * pretending the schedule was accepted.
 */

/** The Android channel reminders are delivered on. Mirrors app.json's `defaultChannel`. */
const CHANNEL_ID = 'reminders';

/**
 * `undetermined` and `denied` are deliberately separate.
 *
 * Android 13+ grants POST_NOTIFICATIONS only on request, so a fresh install
 * sits at `undetermined` — nothing is wrong, nobody has been asked yet.
 * Telling that farmer notifications are "blocked" and sending them to system
 * settings is both untrue and useless: the switch they need is not there. Only
 * `denied` — refused, and `canAskAgain` false — warrants system settings.
 */
export type PermissionState = 'unknown' | 'granted' | 'undetermined' | 'denied';

/** Why scheduling is unavailable, when it is. */
export type SchedulingBlocker = 'expo-go' | 'permission-undetermined' | 'permission-denied' | null;

/**
 * Whether this runtime can schedule a local notification at all.
 *
 * Expo Go dropped Android support for `expo-notifications` in SDK 53, so in
 * Expo Go a scheduled reminder would be accepted and then never arrive — the
 * worst possible outcome for a farmer relying on it. Detected from the
 * execution environment rather than by catching an error from a native call,
 * because a silent catch cannot tell "not supported here" from "genuinely broke".
 */
export function canScheduleNotifications(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

/**
 * Show reminders even while the app is in the foreground.
 *
 * Guarded and wrapped because this runs at import time, before any caller has
 * had the chance to check anything. In Expo Go the native module is absent, and
 * an exception here would take down every screen that transitively imports the
 * reminder store — which, via the root layout, is all of them.
 */
if (canScheduleNotifications()) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Left unset: notifications simply will not surface in the foreground.
  }
}

/**
 * Create the Android channel.
 *
 * Android ignores per-notification importance; a channel set below HIGH can
 * never produce a heads-up alert, and the channel's settings are fixed at
 * creation — changing them later in code has no effect once it exists. So this
 * is set correctly the first time.
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Farm reminders',
    description: 'Reminders you set for farm tasks and calendar activities.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Ask for permission, if it has not already been settled.
 *
 * Called when the farmer creates their first reminder rather than at launch:
 * a permission prompt that arrives with a reason attached is granted far more
 * often than one that ambushes you on the splash screen.
 */
export async function ensurePermission(): Promise<PermissionState> {
  if (!canScheduleNotifications()) return 'denied';

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      await ensureChannel();
      return 'granted';
    }

    // `canAskAgain === false` means the farmer has permanently refused; asking
    // again is a no-op that just returns denied, so skip the round trip.
    if (!existing.canAskAgain) return 'denied';

    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) return 'denied';

    await ensureChannel();
    return 'granted';
  } catch {
    return 'denied';
  }
}

/** The current permission state without prompting. Used to render the banner. */
export async function getPermissionState(): Promise<PermissionState> {
  if (!canScheduleNotifications()) return 'denied';

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';
    return existing.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/** Prompt for permission from the UI, e.g. the reminders screen's banner. */
export async function requestPermission(): Promise<PermissionState> {
  return ensurePermission();
}

/** What is stopping scheduling right now, for the UI to explain. */
export function schedulingBlocker(permission: PermissionState): SchedulingBlocker {
  if (!canScheduleNotifications()) return 'expo-go';
  if (permission === 'undetermined') return 'permission-undetermined';
  if (permission === 'denied') return 'permission-denied';
  return null;
}

/**
 * Schedule the OS notification for a reminder.
 *
 * Returns the handle to store, or null when nothing was scheduled — which is a
 * legitimate outcome for a completed reminder, a one-off whose time has passed,
 * or a runtime that cannot schedule. The caller persists whatever comes back;
 * it must never assume a notification exists.
 */
export async function scheduleReminder(
  reminder: FarmReminder,
  now: Date = new Date(),
): Promise<string | null> {
  if (!canScheduleNotifications()) return null;

  const target = scheduleTargetFor(reminder, now);
  if (!target) return null;

  try {
    await ensureChannel();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.note || `Due now${repeatSuffix(reminder.repeat)}`,
        // Carried so a tap can open this exact reminder without a lookup table.
        data: { reminderId: reminder.id },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
      },
    });
  } catch {
    // A refused schedule must not take the reminder down with it. The record is
    // kept, the notification simply is not registered, and reconciliation on
    // the next launch will try again.
    return null;
  }
}

/** Cancel one scheduled notification. Safe to call with a stale or null handle. */
export async function cancelReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId || !canScheduleNotifications()) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or already cancelled — both are the state we wanted.
  }
}

/** Cancel everything this app has scheduled. Used when reminders are switched off. */
export async function cancelAllReminders(): Promise<void> {
  if (!canScheduleNotifications()) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing to clean up.
  }
}

/**
 * Run `onOpenReminder` when the farmer taps a reminder notification.
 *
 * Covers both entry paths, which are easy to confuse: `getLastNotificationResponseAsync`
 * is the notification that launched a cold app, while the listener catches taps
 * that arrive while it is already running. Handling only the second is the
 * common bug — the notification appears to do nothing when the app was closed,
 * which is exactly when a reminder matters most.
 */
export function attachResponseListener(onOpenReminder: (reminderId: string) => void): () => void {
  if (!canScheduleNotifications()) return () => {};

  const handle = (response: Notifications.NotificationResponse | null) => {
    const reminderId = response?.notification.request.content.data?.reminderId;
    if (typeof reminderId === 'string') onOpenReminder(reminderId);
  };

  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
