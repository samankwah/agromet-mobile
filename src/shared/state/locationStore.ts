import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_LOCATION_ID } from '../data/mockWeather';
import type { LocationPermissionState } from '../location/locationClient';

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
  /** The district geolocation put the farmer in, used for alerts when they
   * have saved none of their own. Null until a fix has been resolved. */
  detectedDistrictId: string | null;
  /** The nearest Home town to that same fix — applied to `selectedLocationId`
   * unless the farmer has already chosen a town by hand. */
  detectedTownId: string | null;
  /** Last known foreground-location permission, so the card can explain why
   * alerts are not localised without re-querying the OS on every render. */
  locationPermission: LocationPermissionState;
  /** True once a detection attempt has finished (found a district, or asked
   * and was refused, or could not get a fix). Stops the app re-prompting on
   * every launch — the retry is a deliberate button in the saved-districts
   * screen. */
  locationResolved: boolean;
  /** True once the farmer has picked a town from the carousel. Geolocation
   * never moves the selection after this. */
  townChoiceIsManual: boolean;
  setSelectedLocationId: (id: string) => void;
  setSavedDistrictIds: (ids: string[]) => void;
  toggleSavedDistrict: (id: string) => void;
  setHasHydrated: (value: boolean) => void;
  setLocationPermission: (value: LocationPermissionState) => void;
  setDetectedLocation: (value: { districtId: string; townId: string }) => void;
  /** Move the Home selection to the detected town, without marking it manual. */
  setDetectedTown: (id: string) => void;
  markLocationResolved: () => void;
  clearLocationDetection: () => void;
};

/**
 * The district ids alerts should be scoped to: the farmer's own saved list if
 * they have one, otherwise the single district geolocation put them in,
 * otherwise nothing (which the alert pipeline reads as "every region").
 *
 * A plain function, not a selector — callers wrap it in `useMemo` so the array
 * identity is stable (zustand v5 bails a render if a selector returns a fresh
 * reference every time).
 */
export function effectiveDistrictIds(saved: string[], detected: string | null): string[] {
  if (saved.length > 0) return saved;
  return detected ? [detected] : [];
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      selectedLocationId: DEFAULT_LOCATION_ID,
      savedDistrictIds: [],
      hasHydrated: false,
      detectedDistrictId: null,
      detectedTownId: null,
      locationPermission: 'unknown',
      locationResolved: false,
      townChoiceIsManual: false,
      // The carousel is the only caller, so a change here is always a hand-tap;
      // that is what tells geolocation to stop moving the selection.
      setSelectedLocationId: (id) => set({ selectedLocationId: id, townChoiceIsManual: true }),
      setSavedDistrictIds: (ids) => set({ savedDistrictIds: ids }),
      toggleSavedDistrict: (id) => {
        const current = get().savedDistrictIds;
        set({ savedDistrictIds: current.includes(id) ? current.filter((d) => d !== id) : [...current, id] });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setLocationPermission: (value) => set({ locationPermission: value }),
      setDetectedLocation: ({ districtId, townId }) => set({ detectedDistrictId: districtId, detectedTownId: townId }),
      setDetectedTown: (id) => set({ selectedLocationId: id }),
      markLocationResolved: () => set({ locationResolved: true }),
      clearLocationDetection: () =>
        set({ detectedDistrictId: null, detectedTownId: null, locationResolved: false }),
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
