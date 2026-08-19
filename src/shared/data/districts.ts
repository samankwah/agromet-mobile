/**
 * A small curated catalog of Ghanaian districts used for alert targeting.
 * Alerts are issued by district + hazard type (not by the 10 home towns used
 * for the current-conditions view — see mockWeather.ts), so this is a
 * separate, purpose-built list rather than reusing the town list.
 *
 * Covers the districts of the 10 home towns plus the Northern/Savannah-region
 * districts the two required mock alerts are issued for. Not exhaustive —
 * the backend has no regions/districts table at all today (that catalog
 * only exists client-side in the web app's ghanaCodes.js, 261 districts);
 * this list only needs to be big enough to exercise saved-district
 * filtering meaningfully, and is trivially extendable.
 *
 * Note: Koforidua itself is not a literal district name in the web app's
 * ghanaCodes.js (New Juaben North/South Municipal are) — it's included here
 * as a recognizable town-level label under Eastern region, not a formal code.
 *
 * Obuasi Municipal is kept even though `obuasi` is no longer a Home-screen
 * town (dropped to match the user's exact 10-town list) — district-level
 * content (a future alert, say) can still target it; only its town mapping
 * below is removed.
 */
export type District = {
  id: string;
  name: string;
  region: string;
};

export const DISTRICTS: District[] = [
  { id: 'accra-metropolitan', name: 'Accra Metropolitan', region: 'Greater Accra' },
  { id: 'kumasi-metropolitan', name: 'Kumasi Metropolitan', region: 'Ashanti' },
  { id: 'tamale-metropolitan', name: 'Tamale Metropolitan', region: 'Northern' },
  { id: 'bolgatanga-municipal', name: 'Bolgatanga Municipal', region: 'Upper East' },
  { id: 'west-gonja', name: 'West Gonja (Damongo)', region: 'Savannah' },
  { id: 'cape-coast-metropolitan', name: 'Cape Coast Metropolitan', region: 'Central' },
  { id: 'new-juaben-south', name: 'New Juaben South (Koforidua)', region: 'Eastern' },
  { id: 'tema-metropolitan', name: 'Tema Metropolitan', region: 'Greater Accra' },
  { id: 'ho-municipal', name: 'Ho Municipal', region: 'Volta' },
  { id: 'yendi-municipal', name: 'Yendi Municipal', region: 'Northern' },
  { id: 'obuasi-municipal', name: 'Obuasi Municipal', region: 'Ashanti' },
];

export function getDistrictById(id: string): District | undefined {
  return DISTRICTS.find((district) => district.id === id);
}

/** Maps a Home-screen town id (mockWeather.ts HOME_LOCATIONS) to the
 * district it sits in, so district-scoped content (advisories, alerts) can
 * be shown for whichever town the farmer currently has selected, without
 * requiring them to separately pick a district. */
const LOCATION_TO_DISTRICT_ID: Record<string, string> = {
  accra: 'accra-metropolitan',
  kumasi: 'kumasi-metropolitan',
  tamale: 'tamale-metropolitan',
  bolgatanga: 'bolgatanga-municipal',
  // The one required fix this round — makes the existing Savannah-drought
  // mock alert (district: "West Gonja (Damongo)") reachable from a Home
  // town selection for the first time.
  damongo: 'west-gonja',
  'cape-coast': 'cape-coast-metropolitan',
  koforidua: 'new-juaben-south',
  tema: 'tema-metropolitan',
  ho: 'ho-municipal',
  yendi: 'yendi-municipal',
};

export function getDistrictNameForLocation(locationId: string): string | undefined {
  const districtId = LOCATION_TO_DISTRICT_ID[locationId];
  return districtId ? getDistrictById(districtId)?.name : undefined;
}
