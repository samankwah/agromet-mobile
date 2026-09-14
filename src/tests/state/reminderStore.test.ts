import * as Notifications from 'expo-notifications';

import { useReminderStore } from '../../shared/state/reminderStore';
import type { ReminderDraft } from '../../shared/domain/farmReminder';

/**
 * The store's real job is keeping the OS schedule in step with what is stored.
 * These assert on the mocked expo-notifications calls, because "the record was
 * saved" is the easy half — the half that breaks in the field is the alert.
 */

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

function draft(overrides: Partial<ReminderDraft> = {}): ReminderDraft {
  return {
    title: 'Spray the tomatoes',
    dueAt: inDays(1),
    repeat: 'none',
    source: 'manual',
    ...overrides,
  };
}

beforeEach(() => {
  useReminderStore.setState({ reminders: [], permission: 'unknown', hasHydrated: true });
  jest.clearAllMocks();
});

describe('add', () => {
  it('stores the reminder and keeps the handle the OS gave back', async () => {
    const created = await useReminderStore.getState().add(draft());

    expect(useReminderStore.getState().reminders).toHaveLength(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(created.notificationId).toBeTruthy();
    expect(created.isDone).toBe(false);
  });

  it('carries the reminder id so a tapped notification knows what it is', async () => {
    const created = await useReminderStore.getState().add(draft());
    const [[request]] = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;

    expect(request.content.data).toEqual({ reminderId: created.id });
  });

  /* A reminder is still worth keeping when the phone will not announce it —
     the list remains the reliable record. It must simply not claim otherwise. */
  it('still saves the reminder when permission is refused', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, canAskAgain: false });

    const created = await useReminderStore.getState().add(draft());

    expect(useReminderStore.getState().reminders).toHaveLength(1);
    expect(created.notificationId).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('does not schedule a one-off that is already in the past', async () => {
    const created = await useReminderStore.getState().add(draft({ dueAt: inDays(-1) }));

    expect(created.notificationId).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('gives two reminders created in the same tick different ids', async () => {
    const [first, second] = await Promise.all([
      useReminderStore.getState().add(draft({ title: 'One' })),
      useReminderStore.getState().add(draft({ title: 'Two' })),
    ]);

    expect(first.id).not.toBe(second.id);
  });
});

describe('toggleDone', () => {
  it('cancels the alert when a reminder is completed', async () => {
    const created = await useReminderStore.getState().add(draft());
    await useReminderStore.getState().toggleDone(created.id);

    const [stored] = useReminderStore.getState().reminders;
    expect(stored.isDone).toBe(true);
    expect(stored.completedAt).toBeTruthy();
    expect(stored.notificationId).toBeNull();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(created.notificationId);
  });

  it('puts the alert back when a still-future reminder is un-completed', async () => {
    const created = await useReminderStore.getState().add(draft());
    await useReminderStore.getState().toggleDone(created.id);
    await useReminderStore.getState().toggleDone(created.id);

    const [stored] = useReminderStore.getState().reminders;
    expect(stored.isDone).toBe(false);
    expect(stored.completedAt).toBeNull();
    expect(stored.notificationId).toBeTruthy();
  });
});

describe('update', () => {
  /* Cancel before rescheduling: the other order strands the old notification
     whenever the new one fails to register. */
  it('cancels the old alert before booking the new one', async () => {
    const created = await useReminderStore.getState().add(draft());
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();

    await useReminderStore.getState().update(created.id, { dueAt: inDays(3) });

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(created.notificationId);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(useReminderStore.getState().reminders[0].notificationId).toBeTruthy();
  });
});

describe('remove', () => {
  it('cancels the alert as well as dropping the record', async () => {
    const created = await useReminderStore.getState().add(draft());
    await useReminderStore.getState().remove(created.id);

    expect(useReminderStore.getState().reminders).toHaveLength(0);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(created.notificationId);
  });
});

describe('reconcile', () => {
  /* Android drops scheduled notifications on reinstall, so a stored handle is
     no proof one still exists. This is the case that silently breaks in most
     implementations: the list looks right and nothing ever fires. */
  it('re-registers a future reminder whose notification the OS lost', async () => {
    useReminderStore.setState({
      reminders: [
        {
          id: 'orphan',
          title: 'Check the drip lines',
          dueAt: inDays(2),
          repeat: 'none',
          isDone: false,
          source: 'manual',
          notificationId: null,
          createdAt: inDays(-1),
          updatedAt: inDays(-1),
        },
      ],
    });

    await useReminderStore.getState().reconcile();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(useReminderStore.getState().reminders[0].notificationId).toBeTruthy();
  });

  it('clears the handle on anything that should no longer fire', async () => {
    useReminderStore.setState({
      reminders: [
        {
          id: 'finished',
          title: 'Already done',
          dueAt: inDays(2),
          repeat: 'none',
          isDone: true,
          source: 'manual',
          notificationId: 'stale-handle',
          createdAt: inDays(-1),
          updatedAt: inDays(-1),
        },
      ],
    });

    await useReminderStore.getState().reconcile();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stale-handle');
    expect(useReminderStore.getState().reminders[0].notificationId).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  /* Reconciliation runs on launch and awaits the OS at every step, so the
     farmer can be ticking things off the whole time it is working. Writing the
     snapshot back at the end silently undid those edits — the reminder
     un-ticked itself a moment after being completed. */
  it('does not undo an edit made while it was still working', async () => {
    const created = await useReminderStore.getState().add(draft());

    const reconciling = useReminderStore.getState().reconcile();
    await useReminderStore.getState().toggleDone(created.id);
    await reconciling;

    const [stored] = useReminderStore.getState().reminders;
    expect(stored.isDone).toBe(true);
    expect(stored.notificationId).toBeNull();
  });

  /* Not-yet-asked and refused are different states — the screen words them
     differently and offers different actions — but neither may schedule. */
  it.each([
    ['undetermined', { granted: false, canAskAgain: true }],
    ['denied', { granted: false, canAskAgain: false }],
  ])('reports %s and schedules nothing', async (expected, permissions) => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce(permissions);
    useReminderStore.setState({
      reminders: [
        {
          id: 'blocked',
          title: 'Blocked',
          dueAt: inDays(2),
          repeat: 'none',
          isDone: false,
          source: 'manual',
          notificationId: null,
          createdAt: inDays(-1),
          updatedAt: inDays(-1),
        },
      ],
    });

    await useReminderStore.getState().reconcile();

    expect(useReminderStore.getState().permission).toBe(expected);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelAll', () => {
  it('drops every handle when reminders are switched off', async () => {
    await useReminderStore.getState().add(draft({ title: 'One' }));
    await useReminderStore.getState().add(draft({ title: 'Two' }));

    await useReminderStore.getState().cancelAll();

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(useReminderStore.getState().reminders.every((r) => r.notificationId === null)).toBe(true);
  });
});
