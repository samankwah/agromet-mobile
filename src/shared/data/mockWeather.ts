import type { CurrentWeather } from '../domain/currentWeather';

/**
 * The 10 towns AgroMet's mobile Home screen supports (the user's exact
 * requested list — cross-referenced against the web app's `ghanaCities`
 * array in frontend/src/pages/Home.jsx for coordinates/region). Structured
 * as one record per town keyed by id so appending more later is a one-line
 * addition, not a refactor.
 *
 * Obuasi (from an earlier increment) is deliberately dropped — it isn't in
 * the user's exact 10-town list. Its district catalog entry stays (see
 * districts.ts) since district-level content can still reference it.
 */
export const HOME_LOCATIONS: { id: string; name: string; lat: number; lng: number; region: string }[] = [
  { id: 'accra', name: 'Accra', lat: 5.6037, lng: -0.187, region: 'Greater Accra' },
  { id: 'kumasi', name: 'Kumasi', lat: 6.6885, lng: -1.6244, region: 'Ashanti' },
  { id: 'tamale', name: 'Tamale', lat: 9.4034, lng: -0.8424, region: 'Northern' },
  { id: 'bolgatanga', name: 'Bolgatanga', lat: 10.7856, lng: -0.8514, region: 'Upper East' },
  { id: 'damongo', name: 'Damongo', lat: 9.0842, lng: -1.815, region: 'Savannah' },
  { id: 'cape-coast', name: 'Cape Coast', lat: 5.1054, lng: -1.2466, region: 'Central' },
  { id: 'koforidua', name: 'Koforidua', lat: 6.0941, lng: -0.2631, region: 'Eastern' },
  { id: 'tema', name: 'Tema', lat: 5.6698, lng: -0.0166, region: 'Greater Accra' },
  { id: 'ho', name: 'Ho', lat: 6.6009, lng: 0.4709, region: 'Volta' },
  { id: 'yendi', name: 'Yendi', lat: 9.4427, lng: -0.0093, region: 'North East' },
];

export const DEFAULT_LOCATION_ID = 'accra';

/**
 * One realistic current-conditions record per town, plausible for Ghana's
 * climate by region. `observedAt` is generated relative to "now" at module
 * load so the "updated X minutes ago" label always looks fresh during a
 * demo/dev session rather than showing a stale hardcoded timestamp.
 */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function forLocation(
  id: string,
  overrides: Omit<CurrentWeather, 'locationId' | 'locationName' | 'lat' | 'lng' | 'region'>,
): CurrentWeather {
  const location = HOME_LOCATIONS.find((entry) => entry.id === id);
  if (!location) {
    throw new Error(`mockWeather: no HOME_LOCATIONS entry for "${id}"`);
  }
  return {
    locationId: location.id,
    locationName: location.name,
    lat: location.lat,
    lng: location.lng,
    region: location.region,
    ...overrides,
  };
}

export const MOCK_CURRENT_CONDITIONS: Record<string, CurrentWeather> = {
  accra: forLocation('accra', {
    observedAt: minutesAgo(12),
    temperatureC: 29,
    minC: 25,
    maxC: 31,
    feelsLikeC: 32,
    condition: 'Partly cloudy',
    rainfallMm: 0,
    humidityPct: 78,
    windKph: 14,
  }),
  kumasi: forLocation('kumasi', {
    observedAt: minutesAgo(16),
    temperatureC: 27,
    minC: 22,
    maxC: 29,
    feelsLikeC: 28,
    condition: 'Overcast',
    rainfallMm: 3,
    humidityPct: 81,
    windKph: 9,
  }),
  tamale: forLocation('tamale', {
    observedAt: minutesAgo(18),
    temperatureC: 33,
    minC: 24,
    maxC: 36,
    feelsLikeC: 36,
    condition: 'Thunderstorms likely',
    rainfallMm: 18,
    humidityPct: 65,
    windKph: 19,
  }),
  bolgatanga: forLocation('bolgatanga', {
    observedAt: minutesAgo(20),
    temperatureC: 34,
    minC: 23,
    maxC: 38,
    feelsLikeC: 37,
    condition: 'Hazy sunshine',
    rainfallMm: 0,
    humidityPct: 42,
    windKph: 15,
  }),
  damongo: forLocation('damongo', {
    observedAt: minutesAgo(25),
    temperatureC: 32,
    minC: 23,
    maxC: 35,
    feelsLikeC: 34,
    condition: 'Sunny, dry',
    rainfallMm: 0,
    humidityPct: 38,
    windKph: 13,
  }),
  'cape-coast': forLocation('cape-coast', {
    observedAt: minutesAgo(9),
    temperatureC: 27,
    minC: 24,
    maxC: 29,
    feelsLikeC: 29,
    condition: 'Sunny',
    rainfallMm: 0,
    humidityPct: 82,
    windKph: 17,
  }),
  koforidua: forLocation('koforidua', {
    observedAt: minutesAgo(21),
    temperatureC: 26,
    minC: 21,
    maxC: 28,
    feelsLikeC: 27,
    condition: 'Light rain',
    rainfallMm: 4,
    humidityPct: 84,
    windKph: 10,
  }),
  tema: forLocation('tema', {
    observedAt: minutesAgo(11),
    temperatureC: 28,
    minC: 25,
    maxC: 30,
    feelsLikeC: 30,
    condition: 'Partly cloudy',
    rainfallMm: 0,
    humidityPct: 77,
    windKph: 16,
  }),
  ho: forLocation('ho', {
    observedAt: minutesAgo(15),
    temperatureC: 28,
    minC: 22,
    maxC: 30,
    feelsLikeC: 30,
    condition: 'Scattered showers',
    rainfallMm: 6,
    humidityPct: 76,
    windKph: 12,
  }),
  yendi: forLocation('yendi', {
    observedAt: minutesAgo(7),
    temperatureC: 34,
    minC: 25,
    maxC: 37,
    feelsLikeC: 37,
    condition: 'Heavy rain',
    rainfallMm: 26,
    humidityPct: 68,
    windKph: 22,
  }),
};
