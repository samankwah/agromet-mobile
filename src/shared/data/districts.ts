import { districtId } from './districtId';
import { GHANA_REGIONS } from './ghanaRegions';
import { HOME_LOCATIONS } from './mockWeather';
import { districtAt } from '../location/districtAt';

/**
 * Every district in Ghana, for alert targeting: the 261 MMDAs of
 * `ghanaRegions.ts`, spelled as the backend stores them.
 *
 * `region` drops the " Region" suffix `ghanaRegions.ts` carries, because the
 * hazards API addresses regions without it. `id` is the same string the
 * district's polygon carries in `ghanaBoundaries.json`, so a GPS fix resolved
 * against the map lands on a district in this list.
 *
 * Guan (Oti, 2022) is listed but has no polygon in the source shapefile, so it
 * can be chosen by hand but never detected.
 */
export type District = {
  id: string;
  name: string;
  region: string;
};

export const DISTRICTS: District[] = GHANA_REGIONS.flatMap((region) =>
  region.districts.map((name) => ({ id: districtId(name), name, region: region.name.replace(/ Region$/, '') })),
).sort((a, b) => a.name.localeCompare(b.name));

/**
 * Ids from the hand-picked 35-district list this replaced, where the full
 * district name gives a different slug. Saved alert districts are stored by id,
 * so `locationStore` rewrites these on load.
 */
export const LEGACY_DISTRICT_IDS: Record<string, string> = {
  'west-gonja': 'west-gonja-municipal',
  'new-juaben-south': 'new-juaben-south-municipal',
  'asunafo-north': 'asunafo-north-municipal',
  'krachi-east': 'krachi-east-municipal',
  'east-mamprusi': 'east-mamprusi-municipal',
  'ketu-south': 'ketu-south-municipal',
  'anloga-district': 'anloga',
  'awutu-senya-east': 'awutu-senya-east-municipal',
  'nzema-east': 'nzema-east-municipal',
  'tarkwa-nsuaem': 'tarkwa-nsuaem-municipal',
  'birim-central': 'birim-central-municipal',
  'ejura-sekyedumase': 'ejura-sekyedumase-municipal',
  'bibiani-anhwiaso-bekwai': 'bibiani-anhwiaso-bekwai-municipal',
  'krachi-west': 'krachi-west-municipal',
  'atebubu-amantin': 'atebubu-amantin-municipal',
  'kintampo-north': 'kintampo-north-municipal',
  'bole-district': 'bole',
};

/** The current id for one that may have been saved under the old list. */
export function currentDistrictId(id: string): string {
  return LEGACY_DISTRICT_IDS[id] ?? id;
}

const BY_ID = new Map(DISTRICTS.map((district) => [district.id, district]));

export function getDistrictById(id: string): District | undefined {
  return BY_ID.get(currentDistrictId(id));
}

/** The district id a Home-screen town (mockWeather.ts HOME_LOCATIONS) sits in,
 * found from the town's coordinates on the district map, or undefined for an
 * unknown town. */
export function getDistrictIdForLocation(locationId: string): string | undefined {
  const town = HOME_LOCATIONS.find((location) => location.id === locationId);
  return town ? districtAt(town.lat, town.lng)?.id : undefined;
}

export function getDistrictNameForLocation(locationId: string): string | undefined {
  const id = getDistrictIdForLocation(locationId);
  return id ? getDistrictById(id)?.name : undefined;
}
