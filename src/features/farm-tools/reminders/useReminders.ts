import { useEffect, useMemo } from 'react';

import { useReminderStore } from '../../../shared/state/reminderStore';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { schedulingBlocker } from '../../../shared/notifications/notificationClient';
import { attentionCount, groupReminders, weekProgress } from '../../../shared/utils/reminderSchedule';

/**
 * The reminders a screen needs, already grouped.
 *
 * `now` is captured once per mount rather than read inside the grouping. A
 * value read fresh on every render would give a new object identity each time
 * and re-sort the list underneath the farmer's finger; and no grouping boundary
 * here is fine-grained enough for a few seconds of drift to matter.
 */
export function useReminders() {
  const reminders = useReminderStore((state) => state.reminders);
  const permission = useReminderStore((state) => state.permission);
  const hasHydrated = useReminderStore((state) => state.hasHydrated);
  const reconcile = useReminderStore((state) => state.reconcile);
  const remindersEnabled = useSettingsStore((state) => state.notificationPrefs.remindersEnabled);

  // Only once the persisted reminders are actually loaded — reconciling an
  // empty pre-hydration list would cancel notifications for reminders that are
  // about to reappear.
  useEffect(() => {
    if (hasHydrated) reconcile();
  }, [hasHydrated, reconcile]);

  const groups = useMemo(() => groupReminders(reminders, new Date()), [reminders]);
  const attention = useMemo(() => attentionCount(reminders, new Date()), [reminders]);
  const progress = useMemo(() => weekProgress(reminders, new Date()), [reminders]);

  return {
    reminders,
    groups,
    progress,
    attention,
    hasHydrated,
    permission,
    remindersEnabled,
    blocker: remindersEnabled ? schedulingBlocker(permission) : 'disabled',
  };
}

/** Just the badge count, for surfaces that do not render the list. */
export function useReminderAttentionCount(): number {
  const reminders = useReminderStore((state) => state.reminders);
  return useMemo(() => attentionCount(reminders, new Date()), [reminders]);
}
