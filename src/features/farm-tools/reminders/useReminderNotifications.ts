import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

import { attachResponseListener } from '../../../shared/notifications/notificationClient';
import { useReminderStore } from '../../../shared/state/reminderStore';
import { useSettingsStore } from '../../../shared/state/settingsStore';

/**
 * App-wide reminder plumbing, mounted once at the root.
 *
 * Two jobs that belong nowhere near a screen, because both must work when the
 * reminders screen is not mounted — which, for a notification tap on a cold
 * start, is always:
 *
 *   1. A tapped notification opens the reminders list with that reminder
 *      highlighted.
 *   2. Toggling the reminders setting cancels or restores every scheduled
 *      notification, so the switch means what it says.
 */
export function useReminderNotifications() {
  const hasHydrated = useReminderStore((state) => state.hasHydrated);
  const reconcile = useReminderStore((state) => state.reconcile);
  const cancelAll = useReminderStore((state) => state.cancelAll);
  const remindersEnabled = useSettingsStore((state) => state.notificationPrefs.remindersEnabled);

  useEffect(
    () =>
      attachResponseListener((reminderId) => {
        router.push(`/reminders?focus=${encodeURIComponent(reminderId)}`);
      }),
    [],
  );

  // Skips the first run: on launch the setting has not changed, and reconcile
  // is already the reminders screen's job. Without this guard a start-up with
  // reminders disabled would cancel notifications that were never scheduled.
  const previousEnabled = useRef<boolean | null>(null);
  useEffect(() => {
    if (!hasHydrated) return;

    const changed = previousEnabled.current !== null && previousEnabled.current !== remindersEnabled;
    previousEnabled.current = remindersEnabled;
    if (!changed) return;

    if (remindersEnabled) reconcile();
    else cancelAll();
  }, [hasHydrated, remindersEnabled, reconcile, cancelAll]);
}
