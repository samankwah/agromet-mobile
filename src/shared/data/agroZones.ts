import { GHANA_REGION_NAMES } from './ghanaRegions';

/**
 * Ghana's agro-ecological zones.
 *
 * The advisory spreadsheet carries a zone on every worksheet, because a
 * bulletin is written for a growing environment rather than for an
 * administrative boundary — the same district office serves farmers in more
 * than one zone, and the advice differs.
 *
 * A zone is not a region and does not nest inside one. Several regions straddle
 * two zones: Upper East and Upper West run from Sudan into Guinea Savannah,
 * Volta from Coastal Savannah up into the Transitional belt, Eastern from
 * Coastal Savannah into Semi-Deciduous Forest. So this is a many-to-many map,
 * and a region appears under every zone it genuinely reaches. Narrowing by zone
 * therefore filters the region list rather than replacing it.
 *
 * Classification follows the standard MoFA/GMet six-zone scheme used by the
 * agrometeorological bulletins themselves.
 */

export const AGRO_ZONES = [
  'Sudan Savannah',
  'Guinea Savannah',
  'Transitional',
  'Semi-Deciduous Forest',
  'Rain Forest',
  'Coastal Savannah',
] as const;

export type AgroZone = (typeof AGRO_ZONES)[number];

const ZONE_REGIONS: Record<AgroZone, string[]> = {
  'Sudan Savannah': ['Upper East Region', 'Upper West Region'],
  'Guinea Savannah': [
    'Northern Region',
    'North East Region',
    'Savannah Region',
    'Upper East Region',
    'Upper West Region',
  ],
  Transitional: ['Bono East Region', 'Bono Region', 'Oti Region', 'Volta Region', 'Eastern Region'],
  'Semi-Deciduous Forest': [
    'Ahafo Region',
    'Ashanti Region',
    'Bono Region',
    'Eastern Region',
    'Western North Region',
  ],
  'Rain Forest': ['Western Region', 'Western North Region'],
  'Coastal Savannah': ['Greater Accra Region', 'Central Region', 'Volta Region'],
};

/** The regions a zone reaches, in the order the region catalogue lists them. */
export function regionsInZone(zone: string): string[] {
  const regions = ZONE_REGIONS[zone as AgroZone];
  if (!regions) return GHANA_REGION_NAMES;

  return GHANA_REGION_NAMES.filter((region) => regions.includes(region));
}

/**
 * The zone a region sits in, for filling the field in before the farmer picks
 * one. Regions that straddle two zones report the one holding most of their
 * farmland, which is the first match in `AGRO_ZONES` order.
 */
export function zoneForRegion(region: string): string {
  return AGRO_ZONES.find((zone) => ZONE_REGIONS[zone].includes(region)) ?? '';
}

/** Whether a region can still be reached with this zone selected. */
export function regionIsInZone(region: string, zone: string): boolean {
  if (zone === '' || region === '') return true;

  return regionsInZone(zone).includes(region);
}
