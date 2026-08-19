import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Guest-only placeholder (Foundation milestone's explicit ask) — no login
 * UI or service calls exist yet. Exists purely so later milestones don't
 * have to retrofit an auth concept into stores/components that assumed a
 * single implicit user. `mode` is a literal union of one member today so
 * 'authenticated' slots in later without a reshape (mirrors
 * shared/domain/account.ts's Account type).
 */
type AuthState = {
  mode: 'guest';
  guestId: string;
};

function generateGuestId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useAuthStore = create<AuthState>()(
  persist(() => ({ mode: 'guest', guestId: generateGuestId() }), {
    name: 'agromet:zustand:auth',
    storage: createJSONStorage(() => AsyncStorage),
    // persist's own state creator only produces the initial in-memory
    // default — it isn't written to AsyncStorage until a `set()` call
    // happens. Without this, a fresh install would regenerate (and lose)
    // a new guestId on every cold start instead of keeping one stable id.
    // This forces exactly one write, right after rehydration resolves:
    // either the id that was actually persisted, or — on a genuinely
    // first-ever launch — the freshly generated one, now saved for next
    // time.
    onRehydrateStorage: () => (state) => {
      if (state) {
        useAuthStore.setState(state);
      }
    },
  }),
);
