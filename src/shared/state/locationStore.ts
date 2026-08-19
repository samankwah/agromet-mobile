import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_LOCATION_ID } from '../data/mockWeather';

/**
 * Client-only preference/selection state — which town is selected on Home,
 * which districts the farmer saved for alerts. This is NOT the same job as
 * `shared/storage/cache.ts`: cache.ts is a timestamped "last successful
 * fetch" cache for *query results* (alerts fallback, later forecast/
 * bulletin offline caches); this store is a "last known selection" for
 * *user preferences*, which has no "cachedAt"/staleness concept at all.
 * Two different problems — Zustand's own `persist` + AsyncStorage
 * middleware is the idiomatic tool for this one, and forcing it through
 * cache.ts's CachedEntry<T> wrapper would fight the middleware's own
 * serialize/merge/rehydration hooks for no benefit. Namespaced under
 * `agromet:zustand:*` (vs cache.ts's `agromet:cache:*`) so the two are
 * trivially distinguishable in device storage debugging.
 *
 * Replaces the old useHomeData local-state + useAlerts.useSavedDistricts()
 * pattern from the previous increment.
 */
type LocationState = {
  selectedLocationId: string;
  savedDistrictIds: string[];
  /** True once the persisted value has been read from AsyncStorage — the
   * one place a consumer (useAlerts's `enabled` flag) needs to know not to
   * query yet, so it doesn't fire once against the default [] and again
   * once hydration completes. */
  hasHydrated: boolean;
  setSelectedLocationId: (id: string) => void;
  setSavedDistrictIds: (ids: string[]) => void;
  toggleSavedDistrict: (id: string) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      selectedLocationId: DEFAULT_LOCATION_ID,
      savedDistrictIds: [],
      hasHydrated: false,
      setSelectedLocationId: (id) => set({ selectedLocationId: id }),
      setSavedDistrictIds: (ids) => set({ savedDistrictIds: ids }),
      toggleSavedDistrict: (id) => {
        const current = get().savedDistrictIds;
        set({ savedDistrictIds: current.includes(id) ? current.filter((d) => d !== id) : [...current, id] });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'agromet:zustand:location',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
