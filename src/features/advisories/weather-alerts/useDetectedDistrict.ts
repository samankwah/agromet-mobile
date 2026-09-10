import { useEffect } from 'react';

import { ensureLocationPermission, getCurrentCoords } from '../../../shared/location/locationClient';
import { resolveDistrictFromCoords } from '../../../shared/location/resolveDistrict';
import { useLocationStore } from '../../../shared/state/locationStore';

/**
 * Put the farmer in a district from the device's location, so alerts are
 * scoped to where they are without anyone hand-picking from a 35-row list.
 *
 * Runs at most once per install: the first time a screen that shows the alert
 * card mounts with no saved districts and no prior attempt. Asks for the
 * permission then (with the card visible behind the prompt, so it has a
 * reason), resolves the fix to the nearest known town, and records both that
 * town's district (for alerts) and the town itself (for the Home weather,
 * unless a town was already chosen by hand).
 *
 * Whatever the outcome — a district, a refusal, or no fix — it ends by marking
 * the attempt resolved so the app does not prompt again on the next launch.
 * The retry is a deliberate button in the saved-districts screen.
 */
export async function detectAndStoreDistrict(): Promise<void> {
  const store = useLocationStore.getState();

  try {
    const permission = await ensureLocationPermission();
    store.setLocationPermission(permission);
    if (permission !== 'granted') return;

    const coords = await getCurrentCoords();
    if (!coords) return;

    const match = resolveDistrictFromCoords(coords.latitude, coords.longitude);
    if (!match) return;

    store.setDetectedLocation({ districtId: match.districtId, townId: match.townId });
    if (!useLocationStore.getState().townChoiceIsManual) {
      store.setDetectedTown(match.townId);
    }
  } finally {
    useLocationStore.getState().markLocationResolved();
  }
}

export function useDetectedDistrict(): void {
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const hasSavedDistricts = useLocationStore((state) => state.savedDistrictIds.length > 0);
  const locationResolved = useLocationStore((state) => state.locationResolved);

  useEffect(() => {
    if (!hasHydrated || hasSavedDistricts || locationResolved) return;
    void detectAndStoreDistrict();
  }, [hasHydrated, hasSavedDistricts, locationResolved]);
}
