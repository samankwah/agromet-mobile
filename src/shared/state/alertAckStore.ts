import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AlertAck } from '../domain/alertInterrupt';

/**
 * Which alert popups the farmer has already seen.
 *
 * Persisted, and that is the whole point: an interruption a cold start forgets
 * is an interruption on every cold start. Same `agromet:zustand:*` namespace and
 * the same `hasHydrated` gate as `locationStore` — see its docblock for why this
 * is Zustand `persist` rather than `shared/storage/cache.ts`.
 *
 * `hasHydrated` matters more here than anywhere else in the app. Before the
 * persisted record is read back, `acks` is `{}` and every live alert looks
 * unacknowledged — so a popup would flash on launch and then vanish. Consumers
 * must wait.
 *
 * Keyed by `alert.id`, which `hazardAlertId` deliberately keeps free of the band
 * and the timestamp. The severity and issue time live in the value instead, so a
 * record survives conditions changing and can still tell an escalation from a
 * continuation.
 */
type AlertAckState = {
  acks: Record<string, AlertAck>;
  hasHydrated: boolean;
  acknowledge: (alertId: string, ack: AlertAck) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAlertAckStore = create<AlertAckState>()(
  persist(
    (set) => ({
      acks: {},
      hasHydrated: false,
      acknowledge: (alertId, ack) => set((state) => ({ acks: { ...state.acks, [alertId]: ack } })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'agromet:zustand:alert-acks',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the record is persisted; `hasHydrated` is per-launch by definition.
      partialize: (state) => ({ acks: state.acks }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
