import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FarmReminder, ReminderDraft } from '../domain/farmReminder';
import {
  cancelAllReminders,
  cancelReminder,
  ensurePermission,
  getPermissionState,
  scheduleReminder,
  type PermissionState,
} from '../notifications/notificationClient';
import { scheduleTargetFor } from '../utils/reminderSchedule';

/**
 * The farmer's reminders, and the OS notifications that back them.
 *
 * Zustand + persist rather than `shared/storage/cache.ts`: locationStore.ts
 * documents the house rule as zustand for user-authored state with no staleness
 * concept, and cache.ts for timestamped query results. Reminders have no server
 * behind them, so nothing can go stale — and three surfaces read them
 * reactively (the list, the Farm Tools badge, the calendar sheet), which async
 * cache reads could only serve by inventing a query layer.
 *
 * Every mutation keeps the OS schedule in step. The store is the source of
 * truth; the notification is a projection of it that the OS may drop at any
 * time, which is why `reconcile` exists.
 */

type ReminderState = {
  reminders: FarmReminder[];
  permission: PermissionState;
  hasHydrated: boolean;

  add: (draft: ReminderDraft) => Promise<FarmReminder>;
  update: (id: string, patch: Partial<ReminderDraft>) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Re-register OS notifications against the stored reminders. */
  reconcile: () => Promise<void>;
  /** Cancel everything — used when the farmer turns reminders off in settings. */
  cancelAll: () => Promise<void>;
  refreshPermission: () => Promise<void>;
  /** Prompt for permission from the UI, then reschedule anything waiting. */
  requestPermission: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
};

/**
 * Collision-resistant id.
 *
 * Follows diagnosisQueue.ts rather than the old reminderService's bare
 * `Date.now()`, which collides when two reminders are created in the same
 * millisecond — easy to do when generating several from one calendar.
 */
function newId(): string {
  return `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The fields that decide what alert a reminder wants.
 *
 * Used to tell whether a reminder changed while an await was in flight. A
 * timestamp cannot do this job: two mutations in the same millisecond share
 * one, and on a fast device that is an ordinary occurrence rather than a
 * corner case.
 */
function scheduleSignature(reminder: FarmReminder): string {
  return `${reminder.dueAt}|${reminder.repeat}|${reminder.isDone}`;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      permission: 'unknown',
      hasHydrated: false,

      add: async (draft) => {
        // Asked here, at the first point it is actually needed, rather than on
        // app launch — a prompt with an obvious reason gets granted; a cold one
        // gets dismissed.
        const permission = await ensurePermission();

        const timestamp = new Date().toISOString();
        const reminder: FarmReminder = {
          ...draft,
          id: newId(),
          isDone: false,
          completedAt: null,
          notificationId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const notificationId = permission === 'granted' ? await scheduleReminder(reminder) : null;
        const stored: FarmReminder = { ...reminder, notificationId };

        set({ reminders: [...get().reminders, stored], permission });
        return stored;
      },

      update: async (id, patch) => {
        const existing = get().reminders.find((reminder) => reminder.id === id);
        if (!existing) return;

        // Cancel before rescheduling, not after: the reverse order leaves a
        // stale notification behind whenever the reschedule fails.
        await cancelReminder(existing.notificationId);

        const next: FarmReminder = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        const notificationId = get().permission === 'granted' ? await scheduleReminder(next) : null;

        set({
          reminders: get().reminders.map((reminder) =>
            reminder.id === id ? { ...next, notificationId } : reminder,
          ),
        });
      },

      toggleDone: async (id) => {
        const existing = get().reminders.find((reminder) => reminder.id === id);
        if (!existing) return;

        const isDone = !existing.isDone;
        await cancelReminder(existing.notificationId);

        const next: FarmReminder = {
          ...existing,
          isDone,
          completedAt: isDone ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
          notificationId: null,
        };

        // Un-completing a still-future reminder should put its alert back.
        const notificationId =
          !isDone && get().permission === 'granted' ? await scheduleReminder(next) : null;

        set({
          reminders: get().reminders.map((reminder) =>
            reminder.id === id ? { ...next, notificationId } : reminder,
          ),
        });
      },

      remove: async (id) => {
        const existing = get().reminders.find((reminder) => reminder.id === id);
        if (existing) await cancelReminder(existing.notificationId);
        set({ reminders: get().reminders.filter((reminder) => reminder.id !== id) });
      },

      /**
       * Bring the OS schedule back in line with what is stored.
       *
       * Necessary because the two can drift in ways nothing in the app causes:
       * Android clears scheduled notifications on reinstall, a reminder created
       * while permission was denied has no notification at all, and a repeating
       * reminder that has already fired needs its next occurrence booked. Run on
       * launch once the store has hydrated.
       */
      reconcile: async () => {
        const permission = await getPermissionState();
        set({ permission });
        if (permission !== 'granted') return;

        const now = new Date();

        const results = await Promise.all(
          get().reminders.map(async (reminder) => {
            // Rescheduling unconditionally is deliberate. A stored handle is no
            // proof the OS still holds it, and the old one is cancelled first,
            // so this converges whatever state the device was left in.
            await cancelReminder(reminder.notificationId);

            const notificationId =
              scheduleTargetFor(reminder, now) === null ? null : await scheduleReminder(reminder, now);
            return { id: reminder.id, signature: scheduleSignature(reminder), notificationId };
          }),
        );

        /*
         * Reconciliation runs on launch and awaits the OS at every step, so the
         * farmer can be ticking things off the whole time it is working.
         * Writing the snapshot back would undo those edits, so results are
         * applied per id — and only where the reminder still wants the same
         * alert it did when the work started.
         *
         * The comparison is on the fields that decide scheduling, not on
         * `updatedAt`: two mutations inside the same millisecond share a
         * timestamp, so a clock is not a dependable change token here.
         * Anything that did change was rescheduled by its own mutation, making
         * the handle booked here a duplicate to cancel rather than store.
         */
        const superseded: (string | null)[] = [];

        set({
          reminders: get().reminders.map((reminder) => {
            const result = results.find((candidate) => candidate.id === reminder.id);
            if (!result) return reminder;

            if (result.signature !== scheduleSignature(reminder)) {
              superseded.push(result.notificationId);
              return reminder;
            }
            return { ...reminder, notificationId: result.notificationId };
          }),
        });

        await Promise.all(superseded.map(cancelReminder));
      },

      cancelAll: async () => {
        await cancelAllReminders();
        set({
          reminders: get().reminders.map((reminder) => ({ ...reminder, notificationId: null })),
        });
      },

      refreshPermission: async () => {
        set({ permission: await getPermissionState() });
      },

      requestPermission: async () => {
        const permission = await ensurePermission();
        set({ permission });
        // Anything created before the grant has no notification behind it yet.
        if (permission === 'granted') await get().reconcile();
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'agromet:zustand:reminders',
      storage: createJSONStorage(() => AsyncStorage),
      // Permission is the OS's state, not ours — persisting it would let a
      // revoked permission look granted until something happened to refresh it.
      partialize: (state) => ({ reminders: state.reminders }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
