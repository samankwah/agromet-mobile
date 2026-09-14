import { getDistrictIdForLocation } from '../data/districts';
import { HOME_LOCATIONS } from '../data/mockWeather';

/**
 * Beyond this many degrees from the nearest known town, a fix is treated as
 * "not somewhere we serve" — a phone abroad, or an emulator sitting on its
 * default coordinates (Google HQ) with no fix set. 1.5° is roughly 165 km,
 * comfortably wider than the gap between any inhabited part of Ghana and the
 * nearest of the 32 towns, and well short of the neighbouring capitals.
 */
const MAX_DEGREES = 1.5;

/**
 * The town/district a coordinate sits nearest to, or null when it is outside
 * the served area.
 *
 * Nearest-neighbour by squared degrees, the same trig-free method as `cellAt`
 * in `shared/api/subseasonalService.ts`: over a country five degrees across,
 * squared degrees and a great-circle distance never disagree about which of a
 * handful of well-spaced towns is closest, and this needs no `Math`.
 *
 * The result is a real `HOME_LOCATIONS` town id and a real `DISTRICTS` id, so
 * it can drive both the Home weather selection and the alert scope with no
 * further reconciliation.
 */
export function resolveDistrictFromCoords(
  latitude: number,
  longitude: number,
): { townId: string; districtId: string } | null {
  let nearest: (typeof HOME_LOCATIONS)[number] | undefined;
  let nearestDistance = Infinity;

  for (const town of HOME_LOCATIONS) {
    const distance = (town.lat - latitude) ** 2 + (town.lng - longitude) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = town;
    }
  }

  if (!nearest || nearestDistance > MAX_DEGREES ** 2) return null;

  const districtId = getDistrictIdForLocation(nearest.id);
  return districtId ? { townId: nearest.id, districtId } : null;
}
