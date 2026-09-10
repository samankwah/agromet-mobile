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

  /* The MMDAs of the towns added when the carousel grew from ten to
     thirty-two. Every Home town has to resolve to a district — advisories and
     alerts are district-scoped, and `getDistrictNameForLocation` returning
     undefined means a farmer who picks that town silently gets nothing.
     Named by the district, with the town in brackets where the two differ, so
     the row is recognisable to someone who knows the town but not the MMDA. */
  { id: 'ketu-south', name: 'Ketu South Municipal (Aflao)', region: 'Volta' },
  { id: 'anloga-district', name: 'Anloga District', region: 'Volta' },
  { id: 'awutu-senya-east', name: 'Awutu Senya East Municipal (Kasoa)', region: 'Central' },
  { id: 'effutu-municipal', name: 'Effutu Municipal (Winneba)', region: 'Central' },
  { id: 'nzema-east', name: 'Nzema East Municipal (Axim)', region: 'Western' },
  { id: 'tarkwa-nsuaem', name: 'Tarkwa-Nsuaem Municipal', region: 'Western' },
  { id: 'birim-central', name: 'Birim Central Municipal (Akim Oda)', region: 'Eastern' },
  { id: 'kwahu-east', name: 'Kwahu East (Kwahu Tafo)', region: 'Eastern' },
  { id: 'ejura-sekyedumase', name: 'Ejura-Sekyedumase Municipal', region: 'Ashanti' },
  { id: 'bibiani-anhwiaso-bekwai', name: 'Bibiani-Anhwiaso-Bekwai Municipal (Sefwi Bekwai)', region: 'Western North' },
  { id: 'krachi-west', name: 'Krachi West (Kete Krachi)', region: 'Oti' },
  { id: 'atebubu-amantin', name: 'Atebubu-Amantin Municipal', region: 'Bono East' },
  { id: 'kintampo-north', name: 'Kintampo North Municipal', region: 'Bono East' },
  { id: 'jaman-north', name: 'Jaman North (Sampa)', region: 'Bono' },
  { id: 'bole-district', name: 'Bole District', region: 'Savannah' },
  { id: 'jirapa-municipal', name: 'Jirapa Municipal', region: 'Upper West' },
];

export function getDistrictById(id: string): District | undefined {
  return DISTRICTS.find((district) => district.id === id);
}

/** Maps a Home-screen town id (mockWeather.ts HOME_LOCATIONS) to the
 * district it sits in, so district-scoped content (advisories, alerts) can
 * be shown for whichever town the farmer currently has selected, without
 * requiring them to separately pick a district. */
const LOCATION_TO_DISTRICT_ID: Record<string, string> = {
  aflao: 'ketu-south',
  anloga: 'anloga-district',
  accra: 'accra-metropolitan',
  kasoa: 'awutu-senya-east',
  winneba: 'effutu-municipal',
  'cape-coast': 'cape-coast-metropolitan',
  takoradi: 'sekondi-takoradi-metropolitan',
  axim: 'nzema-east',
  ho: 'ho-municipal',
  koforidua: 'new-juaben-south',
  'akim-oda': 'birim-central',
  'kwahu-tafo': 'kwahu-east',
  kumasi: 'kumasi-metropolitan',
  obuasi: 'obuasi-municipal',
  tarkwa: 'tarkwa-nsuaem',
  'sefwi-bekwai': 'bibiani-anhwiaso-bekwai',
  'kete-krachi': 'krachi-west',
  atebubu: 'atebubu-amantin',
  ejura: 'ejura-sekyedumase',
  kintampo: 'kintampo-north',
  goaso: 'asunafo-north',
  sunyani: 'sunyani-municipal',
  techiman: 'techiman-municipal',
  sampa: 'jaman-north',
  yendi: 'yendi-municipal',
  tamale: 'tamale-metropolitan',
  bole: 'bole-district',
  damongo: 'west-gonja',
  bolgatanga: 'bolgatanga-municipal',
  nalerigu: 'east-mamprusi',
  wa: 'wa-municipal',
  jirapa: 'jirapa-municipal',
};

export function getDistrictNameForLocation(locationId: string): string | undefined {
  const districtId = LOCATION_TO_DISTRICT_ID[locationId];
  return districtId ? getDistrictById(districtId)?.name : undefined;
}
