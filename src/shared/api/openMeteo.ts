import type { CurrentWeather } from '../domain/currentWeather';
import type { DailyForecast, HourlyForecast, WeeklyForecast } from '../domain/forecast';
import { buildWeekSummary, describeDay } from '../utils/weatherNarrative';
import { getJson, NetworkError } from './http';

/**
 * Open-Meteo, and the one place its shape becomes this app's shape.
 *
 * Two callers reach the same data by different routes: normally through our own
 * backend at `/api/weather/bundle`, which caches it; and directly against
 * Open-Meteo when that backend cannot be reached. The mapping below runs on
 * whichever arrives, which is why it lives in the client rather than in Python
 * — one mapping, written once, instead of two to keep in step.
 *
 * Open-Meteo needs no API key. That is what makes the fallback possible at all,
 * and it is why this provider was chosen over Ambee, whose key has never been
 * configured.
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/** Kept in step with `backend/app/weather_runtime.py`. If you add a field
 * there, add it here, or the direct-fallback path silently returns less than
 * the proxied one. */
const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m';
const DAILY_FIELDS =
  'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max';
const HOURLY_FIELDS =
  'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,uv_index,cape';

const FORECAST_DAYS = 7;

export type OpenMeteoBundle = {
  current?: Record<string, number | string>;
  daily?: Record<string, (number | string | null)[]>;
  hourly?: Record<string, (number | string | null)[]>;
};

/**
 * WMO weather codes, mapped onto the app's own five-word vocabulary.
 *
 * The vocabulary is not free. `classifyCondition` matches on substrings, and
 * `dayDetail.test.ts` restates this same five-word set, ordered by severity,
 * and asserts against it. A sixth string would not crash anything; it would
 * make that ordering assertion quietly stop meaning anything. So everything
 * folds into these five.
 *
 * Codes: 0 clear, 1-3 cloud cover, 45/48 fog, 51-57 drizzle, 61-67 rain,
 * 71-77 snow (never in Ghana, mapped for completeness), 80-82 rain showers,
 * 85-86 snow showers, 95-99 thunderstorm.
 */
export function conditionFromWmo(code: number): string {
  if (code >= 95) return 'Thunderstorms likely';
  if (code >= 80) return 'Scattered showers';
  if (code >= 71 && code <= 77) return 'Scattered showers';
  if (code >= 61) return 'Scattered showers';
  if (code >= 51) return 'Scattered showers';
  if (code === 45 || code === 48) return 'Overcast';
  if (code === 3) return 'Overcast';
  if (code === 1 || code === 2) return 'Partly cloudy';
  return 'Sunny';
}

/** The after-dark reading. Only the clear and lightly-clouded kinds have
 * one, because rain, storms and overcast look the same at night. */
function afterDark(condition: string): string {
  if (condition === 'Sunny') return 'Clear night';
  if (condition === 'Partly cloudy') return 'Partly cloudy night';
  return condition;
}

/** Ghana spans 5°N-11°N, so day length barely shifts and a fixed window is
 * accurate. */
function isNightHour(hour: number): boolean {
  return hour < 6 || hour >= 18;
}

/**
 * Open-Meteo returns `"2026-08-22T06:00"` — no zone suffix, local to the
 * `timezone` requested. `new Date()` reads that as *device* local, but this app
 * reads hours with `getUTCHours()` throughout and `dayDetail` requires the
 * hour string to start with the date. Ghana is UTC+0 with no DST, so stamping
 * the zone on explicitly is both correct and what keeps a phone set to another
 * timezone from shifting every chart by its offset.
 */
export function toUtcIso(localTime: string): string {
  if (localTime.endsWith('Z')) return localTime;
  const withSeconds = localTime.length === 16 ? `${localTime}:00` : localTime;
  return `${withSeconds}.000Z`;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/**
 * The bundle for one point, preferring our backend.
 *
 * Falls back to Open-Meteo directly on `NetworkError` only. A `ServiceError`
 * means our backend answered and said no — a bug to surface, not a reason to
 * route around it. Silently bypassing a 500 would hide the outage that caused
 * it.
 */
export async function fetchWeatherBundle(lat: number, lng: number): Promise<OpenMeteoBundle> {
  try {
    // `getJson` unwraps the `{ success, data }` envelope for us, so this is
    // already the bundle — not the envelope. Checking `.data` here instead
    // silently sent every request twice: the backend call, then a "fallback"
    // that was really the primary path.
    const bundle = await getJson<OpenMeteoBundle | null>('/api/weather/bundle', { lat, lng });
    // The backend reports an upstream failure as a readable 200 with a null
    // payload rather than a status the client has to interpret, so an empty
    // body is the signal to go direct.
    if (bundle?.current || bundle?.daily) return bundle;
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
  }

  return fetchDirect(lat, lng);
}

async function fetchDirect(lat: number, lng: number): Promise<OpenMeteoBundle> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current: CURRENT_FIELDS,
    daily: DAILY_FIELDS,
    hourly: HOURLY_FIELDS,
    timezone: 'Africa/Accra',
    forecast_days: String(FORECAST_DAYS),
  });

  let response: Response;
  try {
    response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
  } catch {
    throw new NetworkError('Could not reach the weather service. Check your connection and try again.');
  }

  if (!response.ok) {
    throw new NetworkError('The weather service is not answering just now. Try again shortly.');
  }
  return (await response.json()) as OpenMeteoBundle;
}

/**
 * A temperature and condition for many places, in one request.
 *
 * Open-Meteo accepts comma-separated coordinate lists and answers with an array
 * in the same order — which is what makes a thirty-two town carousel affordable.
 * Fetching them one by one meant thirty-two requests, each carrying a full
 * bundle of 7 daily and 168 hourly readings (~40 KB) so a card could show one
 * number. That is over a megabyte to render a strip of temperatures, on
 * connections where the whole point of the app is that it works badly-connected.
 *
 * This asks for `current` only, and only two fields of it: roughly 2 KB for the
 * whole country.
 *
 * **It goes direct rather than through our backend**, which is a deliberate
 * exception to the rule in `fetchWeatherBundle` above. `/api/weather/bundle`
 * takes a single point, so proxying would put the thirty-two requests back. One
 * direct call for a display-only strip is the better trade; the selected town's
 * full reading — the one the conditions card and every forecast screen use —
 * still goes through the backend and its cache.
 */
export type BriefConditions = { temperatureC: number; condition: string };

export async function fetchCurrentBatch(
  points: { lat: number; lng: number }[],
): Promise<(BriefConditions | null)[]> {
  if (points.length === 0) return [];

  const params = new URLSearchParams({
    latitude: points.map((point) => point.lat.toFixed(4)).join(','),
    longitude: points.map((point) => point.lng.toFixed(4)).join(','),
    current: 'temperature_2m,weather_code',
    timezone: 'Africa/Accra',
  });

  let response: Response;
  try {
    response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
  } catch {
    throw new NetworkError('Could not reach the weather service. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new NetworkError('The weather service is not answering just now. Try again shortly.');
  }

  const body = (await response.json()) as OpenMeteoBundle | OpenMeteoBundle[];
  // A single coordinate comes back as an object, several as an array. Normalise
  // rather than assume, so a one-town list cannot crash the carousel.
  const entries = Array.isArray(body) ? body : [body];

  return points.map((_, index) => {
    const current = entries[index]?.current;
    if (!current || typeof current.temperature_2m !== 'number') return null;

    const observedAt = toUtcIso(String(current.time ?? new Date().toISOString()));
    const condition = conditionFromWmo(num(current.weather_code));
    const night = isNightHour(new Date(observedAt).getUTCHours());

    return { temperatureC: round1(current.temperature_2m), condition: night ? afterDark(condition) : condition };
  });
}

// ---------------------------------------------------------------------------
// Mapping — pure, so it can be tested without a network
// ---------------------------------------------------------------------------

type Place = { id: string; name: string; lat: number; lng: number; region: string };

export function toCurrentWeather(bundle: OpenMeteoBundle, place: Place): CurrentWeather {
  const current = bundle.current ?? {};
  const daily = bundle.daily ?? {};

  const observedAt = toUtcIso(String(current.time ?? new Date().toISOString()));
  const weatherCode = num(current.weather_code);
  const condition = conditionFromWmo(weatherCode);
  const night = isNightHour(new Date(observedAt).getUTCHours());

  return {
    locationId: place.id,
    locationName: place.name,
    lat: place.lat,
    lng: place.lng,
    region: place.region,
    observedAt,
    temperatureC: round1(num(current.temperature_2m)),
    // Today's envelope, not the last 24 hours — it is what the card labels
    // "min / max" beside a live reading.
    minC: round1(num(daily.temperature_2m_min?.[0])),
    maxC: round1(num(daily.temperature_2m_max?.[0])),
    feelsLikeC: round1(num(current.apparent_temperature)),
    condition: night ? afterDark(condition) : condition,
    // The raw code alongside the words. `conditionFromWmo` collapses 28 codes
    // into five strings, which is right for a label and lossy for a picture —
    // see domain/weatherGlyph.ts.
    weatherCode,
    isDay: !night,
    rainfallMm: round1(num(current.precipitation)),
    humidityPct: Math.round(num(current.relative_humidity_2m)),
    windKph: Math.round(num(current.wind_speed_10m)),
  };
}

export function toDailyForecasts(bundle: OpenMeteoBundle, locationId: string): DailyForecast[] {
  const daily = bundle.daily ?? {};
  const dates = (daily.time ?? []) as string[];

  return dates.map((date, index) => {
    const weatherCode = num(daily.weather_code?.[index]);
    const condition = conditionFromWmo(weatherCode);
    const day: DailyForecast = {
      locationId,
      date,
      tempMinC: round1(num(daily.temperature_2m_min?.[index])),
      tempMaxC: round1(num(daily.temperature_2m_max?.[index])),
      condition,
      weatherCode,
      // Always the day form. A whole-day summary has no night reading, which
      // is why this mapper alone never calls `afterDark`.
      isDay: true,
      rainfallProbabilityPct: Math.round(num(daily.precipitation_probability_max?.[index])),
      rainfallMm: round1(num(daily.precipitation_sum?.[index])),
      windKph: Math.round(num(daily.wind_speed_10m_max?.[index])),
      // Open-Meteo has no daily humidity aggregate. Filled from the day's
      // hourly mean below rather than left at zero, which would read as a
      // measurement of very dry air rather than as a missing value.
      humidityPct: 0,
      farmerInterpretation: '',
    };
    day.humidityPct = meanHumidityForDate(bundle, date);
    day.farmerInterpretation = describeDay(day);
    return day;
  });
}

function meanHumidityForDate(bundle: OpenMeteoBundle, date: string): number {
  const hourly = bundle.hourly ?? {};
  const times = (hourly.time ?? []) as string[];
  const values: number[] = [];

  times.forEach((time, index) => {
    if (!time.startsWith(date)) return;
    const value = hourly.relative_humidity_2m?.[index];
    if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
  });

  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function toWeeklyForecast(bundle: OpenMeteoBundle, locationId: string): WeeklyForecast {
  const days = toDailyForecasts(bundle, locationId);
  const narrative = buildWeekSummary(days);

  return {
    locationId,
    generatedAt: toUtcIso(String(bundle.current?.time ?? new Date().toISOString())),
    days,
    summary: narrative.summary,
    farmerActionCard: narrative.actionCard,
    // Filled by `forecastService.getWeekly`, which has the bundle and the place.
    // Left empty here so the mapper stays a pure shape transform.
    weatherAlerts: [],
  };
}

export function toHourlyForecasts(bundle: OpenMeteoBundle, locationId: string): HourlyForecast[] {
  const hourly = bundle.hourly ?? {};
  const times = (hourly.time ?? []) as string[];

  return times.map((time, index) => {
    const hour = toUtcIso(time);
    const weatherCode = num(hourly.weather_code?.[index]);
    const condition = conditionFromWmo(weatherCode);
    const night = isNightHour(new Date(hour).getUTCHours());

    return {
      locationId,
      hour,
      tempC: round1(num(hourly.temperature_2m?.[index])),
      feelsLikeC: round1(num(hourly.apparent_temperature?.[index])),
      condition: night ? afterDark(condition) : condition,
      weatherCode,
      isDay: !night,
      rainfallProbabilityPct: Math.round(num(hourly.precipitation_probability?.[index])),
      rainfallMm: round1(num(hourly.precipitation?.[index])),
      humidityPct: Math.round(num(hourly.relative_humidity_2m?.[index])),
      windKph: Math.round(num(hourly.wind_speed_10m?.[index])),
      uvIndex: Math.round(num(hourly.uv_index?.[index])),
    };
  });
}
