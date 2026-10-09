import { HOME_LOCATIONS } from '../data/mockWeather';
import { districtAt } from './districtAt';

/**
 * Beyond this many degrees from the nearest Home town, the town is not
 * selected for the weather card. 1.5° is roughly 165 km, wider than the gap
 * between any inhabited part of Ghana and the nearest of the 32 towns.
 */
const MAX_TOWN_DEGREES = 1.5;

/**
 * Where a coordinate is: the district it falls in on the district map (for
 * alerts), and the nearest Home town (for the weather card). Null when the
 * fix is outside Ghana, a phone abroad or an emulator on its default
 * coordinates.
 *
 * The district comes from the polygon itself, not from the nearest town, so a
 * farmer between two towns is put in the district they are actually standing
 * in.
 */
export function resolveDistrictFromCoords(latitude: number, longitude: number): { townId: string; districtId: string } | null {
  const district = districtAt(latitude, longitude);
  if (!district) return null;

  let nearest: (typeof HOME_LOCATIONS)[number] | undefined;
  let nearestDistance = Infinity;
  for (const town of HOME_LOCATIONS) {
    const distance = (town.lat - latitude) ** 2 + (town.lng - longitude) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = town;
    }
  }
  if (!nearest || nearestDistance > MAX_TOWN_DEGREES ** 2) return null;

  return { townId: nearest.id, districtId: district.id };
}
