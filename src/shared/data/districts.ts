/**
 * A small curated catalog of Ghanaian districts used for alert targeting.
 * Alerts are issued by district + hazard type (not by the 10 home towns used
 * for the current-conditions view — see mockWeather.ts), so this is a
 * separate, purpose-built list rather than reusing the town list.
 *
 * Covers the districts of the 10 home towns, plus one district in every
 * remaining region so that all sixteen are selectable. That last part matters:
 * flood and drought readings are published per region, and a region with no
 * selectable district can never raise an alert for anyone.
 *
 * Still not exhaustive — Ghana has 261 MMDAs, listed in `ghanaRegions.ts`. That
 * list is not used here because its region names carry a " Region" suffix the
 * hazards API does not accept; the `region` strings below match the backend
 * verbatim.
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

  /* The regional capitals of the eight regions the original ten towns did not
     reach. Flood and drought readings are published for all sixteen regions,
     and until these existed a farmer in Bono, Ahafo, Oti, Western, Western
     North, Bono East, North East or Upper West could not select a district at
     all — so could never receive an alert, however severe the reading. */
  { id: 'sekondi-takoradi-metropolitan', name: 'Sekondi-Takoradi Metropolitan', region: 'Western' },
  { id: 'sefwi-wiawso-municipal', name: 'Sefwi Wiawso Municipal', region: 'Western North' },
  { id: 'sunyani-municipal', name: 'Sunyani Municipal', region: 'Bono' },
  { id: 'techiman-municipal', name: 'Techiman Municipal', region: 'Bono East' },
  { id: 'asunafo-north', name: 'Asunafo North (Goaso)', region: 'Ahafo' },
  { id: 'krachi-east', name: 'Krachi East (Dambai)', region: 'Oti' },
  { id: 'east-mamprusi', name: 'East Mamprusi (Nalerigu)', region: 'North East' },
  { id: 'wa-municipal', name: 'Wa Municipal', region: 'Upper West' },
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
