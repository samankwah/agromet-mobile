import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Whether the farmer has been through the welcome screen.
 *
 * Its own store rather than a field on `settingsStore`, because that store's
 * shape *is* `UserSettings` — a preference the farmer chose. This is neither
 * chosen nor a preference; it is a fact about the install. Same reasoning, and
 * the same `agromet:zustand:*` namespace, as `alertAckStore`.
 *
 * `hasHydrated` is load-bearing here in a way it is not elsewhere. Before the
 * persisted flag is read back, `hasSeenWelcome` is `false` and every returning
 * farmer looks like a new one — so the app would flash the welcome screen on
 * every cold start. The root layout holds the native splash until this turns
 * true, and the Home route renders nothing until then.
 */
type OnboardingState = {
  hasSeenWelcome: boolean;
  hasHydrated: boolean;
  markWelcomeSeen: () => void;
  /** Puts the welcome screen back for the next launch — Settings offers this so
   * the screen can be demonstrated without wiping app data. */
  resetWelcome: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      hasHydrated: false,
      markWelcomeSeen: () => set({ hasSeenWelcome: true }),
      resetWelcome: () => set({ hasSeenWelcome: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'agromet:zustand:onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the flag survives a launch; `hasHydrated` is per-launch by
      // definition and persisting it would make it permanently true.
      partialize: (state) => ({ hasSeenWelcome: state.hasSeenWelcome }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
