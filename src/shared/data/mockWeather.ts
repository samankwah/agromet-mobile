import type { CurrentWeather } from '../domain/currentWeather';
import { classifyCondition, isDaytime } from '../utils/classifyCondition';

/**
 * The towns the Home carousel offers, in the order they appear.
 *
 * The user's exact list, ordered as they gave it — which runs roughly along the
 * coast from the Togo border westward, then north through the middle belt to the
 * Upper regions. Keeping that order is deliberate: the carousel is a marquee, so
 * the sequence reads as a journey up the country rather than an arbitrary jumble.
 *
 * All sixteen regions are represented, which matters beyond the carousel —
 * `region` is what matches a town to a flood/drought reading, and
 * `districts.ts` maps every id here to an MMDA so district-scoped advisories
 * resolve for whichever town is selected.
 *
 * **Yendi is Northern, not North East.** It was listed as North East before,
 * which is wrong: Yendi remained in Northern Region when North East was carved
 * out in 2018, and North East's capital is Nalerigu (now its own entry below).
 * The error was invisible while it was only a label; it is not invisible now
 * that `region` selects which hazard reading a town inherits.
 *
 * The file is still named `mockWeather` for the mock records further down, which
 * nothing live reads any more — the real readings come from Open-Meteo.
 */
export const HOME_LOCATIONS: { id: string; name: string; lat: number; lng: number; region: string }[] = [
  { id: 'aflao', name: 'Aflao', lat: 6.1189, lng: 1.1918, region: 'Volta' },
  { id: 'anloga', name: 'Anloga', lat: 5.7947, lng: 0.8972, region: 'Volta' },
  { id: 'accra', name: 'Accra', lat: 5.6037, lng: -0.187, region: 'Greater Accra' },
  { id: 'kasoa', name: 'Kasoa', lat: 5.5347, lng: -0.4167, region: 'Central' },
  { id: 'winneba', name: 'Winneba', lat: 5.3511, lng: -0.6231, region: 'Central' },
  { id: 'cape-coast', name: 'Cape Coast', lat: 5.1054, lng: -1.2466, region: 'Central' },
  { id: 'takoradi', name: 'Takoradi', lat: 4.8845, lng: -1.7554, region: 'Western' },
  { id: 'axim', name: 'Axim', lat: 4.8699, lng: -2.2405, region: 'Western' },
  { id: 'ho', name: 'Ho', lat: 6.6009, lng: 0.4709, region: 'Volta' },
  { id: 'koforidua', name: 'Koforidua', lat: 6.0941, lng: -0.2631, region: 'Eastern' },
  { id: 'akim-oda', name: 'Akim Oda', lat: 5.9271, lng: -0.9847, region: 'Eastern' },
  { id: 'kwahu-tafo', name: 'Kwahu Tafo', lat: 6.6167, lng: -0.6333, region: 'Eastern' },
  { id: 'kumasi', name: 'Kumasi', lat: 6.6885, lng: -1.6244, region: 'Ashanti' },
  { id: 'obuasi', name: 'Obuasi', lat: 6.2028, lng: -1.6703, region: 'Ashanti' },
  { id: 'tarkwa', name: 'Tarkwa', lat: 5.3004, lng: -1.9959, region: 'Western' },
  { id: 'sefwi-bekwai', name: 'Sefwi Bekwai', lat: 6.2, lng: -2.3167, region: 'Western North' },
  { id: 'kete-krachi', name: 'Kete Krachi', lat: 7.7944, lng: -0.05, region: 'Oti' },
  { id: 'atebubu', name: 'Atebubu', lat: 7.75, lng: -0.9833, region: 'Bono East' },
  { id: 'ejura', name: 'Ejura', lat: 7.3833, lng: -1.3667, region: 'Ashanti' },
  { id: 'kintampo', name: 'Kintampo', lat: 8.0563, lng: -1.7306, region: 'Bono East' },
  { id: 'goaso', name: 'Goaso', lat: 6.8009, lng: -2.5303, region: 'Ahafo' },
  { id: 'sunyani', name: 'Sunyani', lat: 7.3378, lng: -2.3267, region: 'Bono' },
  { id: 'techiman', name: 'Techiman', lat: 7.5931, lng: -1.9381, region: 'Bono East' },
  { id: 'sampa', name: 'Sampa', lat: 7.9333, lng: -2.6833, region: 'Bono' },
  { id: 'yendi', name: 'Yendi', lat: 9.4427, lng: -0.0093, region: 'Northern' },
  { id: 'tamale', name: 'Tamale', lat: 9.4034, lng: -0.8424, region: 'Northern' },
  { id: 'bole', name: 'Bole', lat: 9.0333, lng: -2.4833, region: 'Savannah' },
  { id: 'damongo', name: 'Damongo', lat: 9.0842, lng: -1.815, region: 'Savannah' },
  { id: 'bolgatanga', name: 'Bolgatanga', lat: 10.7856, lng: -0.8514, region: 'Upper East' },
  { id: 'nalerigu', name: 'Nalerigu', lat: 10.5167, lng: -0.3667, region: 'North East' },
  { id: 'wa', name: 'Wa', lat: 10.06, lng: -2.5057, region: 'Upper West' },
  { id: 'jirapa', name: 'Jirapa', lat: 10.5333, lng: -2.7, region: 'Upper West' },
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

/**
 * `weatherCode` and `isDay` are derived rather than written out, so a mock
 * entry stays a short list of the numbers that actually differ between towns.
 * Deriving them from `condition` also means they cannot drift out of step with
 * the words the way nine hand-maintained copies would.
 */
function forLocation(
  id: string,
  overrides: Omit<CurrentWeather, 'locationId' | 'locationName' | 'lat' | 'lng' | 'region' | 'weatherCode' | 'isDay'>,
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
    weatherCode: wmoForCondition(overrides.condition),
    isDay: isDaytime(overrides.observedAt),
    ...overrides,
  };
}

/** The reverse of `api/openMeteo.ts`'s `conditionFromWmo`, for mock data that
 * was written as words. One representative code per kind is enough: nothing
 * reads a mock code for its exact value, only for which picture it selects. */
function wmoForCondition(condition: string): number {
  switch (classifyCondition(condition)) {
    case 'thunderstorm':
      return 95;
    case 'rain':
      return 61;
    case 'overcast':
      return 3;
    case 'cloudy':
    case 'cloudy-night':
      return 2;
    default:
      return 0;
  }
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
