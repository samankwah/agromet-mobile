import { HOME_LOCATIONS } from '../data/mockWeather';
import type { DailyForecast, HourlyForecast, WeeklyForecast } from '../domain/forecast';
import type { ForecastMapLayer } from '../domain/forecastMap';
import type { SeasonalOutlook } from '../domain/seasonalOutlook';
import { synthesiseWeatherAlerts } from '../domain/weatherHazards';
import { mockDelay, ServiceError } from './mockDelay';
import { fetchWeatherBundle, toHourlyForecasts, toWeeklyForecast } from './openMeteo';
import { MOCK_MAP_LAYERS } from '../data/mockMapLayers';

/**
 * Deterministic forecasts, from Open-Meteo.
 *
 * One upstream request carries current conditions, seven days and 168 hourly
 * steps, so every function below draws on the same bundle rather than issuing
 * its own call. The backend caches it for 30 minutes and the app falls back to
 * Open-Meteo directly when the backend is unreachable — see `openMeteo.ts`.
 *
 * The probabilistic end of the timescale has split. `getSubseasonalOutlook` is
 * real now and lives in `subseasonalService.ts`, backed by NOAA's GEFS ensemble
 * through `/api/outlook/subseasonal`. `getSeasonalOutlook` below is still
 * placeholder data: seasonal forecasts are issued monthly by the Copernicus
 * multi-model service, which needs a CDS key and a different pipeline.
 */

function placeFor(locationId: string) {
  const place = HOME_LOCATIONS.find((entry) => entry.id === locationId);
  if (!place) {
    throw new ServiceError(`No forecast available for location "${locationId}"`);
  }
  return place;
}

async function getWeekly(locationId: string): Promise<WeeklyForecast> {
  const place = placeFor(locationId);
  const bundle = await fetchWeatherBundle(place.lat, place.lng);
  const week = toWeeklyForecast(bundle, locationId);
  if (week.days.length === 0) {
    throw new ServiceError(`No forecast available for location "${locationId}"`);
  }
  // Derived from the same bundle, so the banner on Home and Advisories reads
  // today's severe weather at no extra request. See domain/weatherHazards.ts.
  week.weatherAlerts = synthesiseWeatherAlerts(bundle, {
    locationId,
    locationName: place.name,
    region: place.region,
  });
  return week;
}

async function getHours(locationId: string): Promise<HourlyForecast[]> {
  const place = placeFor(locationId);
  const bundle = await fetchWeatherBundle(place.lat, place.lng);
  return toHourlyForecasts(bundle, locationId);
}

// --- Deterministic forecasts, live from Open-Meteo ---

export async function getDailyForecast(locationId: string): Promise<DailyForecast> {
  return (await getWeekly(locationId)).days[0];
}

export async function getWeeklyForecast(locationId: string): Promise<WeeklyForecast> {
  return getWeekly(locationId);
}

/** Everything the day-detail screen can show for a town: the week, and every
 * hourly step in it. One download serves every day the reader taps through;
 * `pickDay` below cuts out the one they are looking at. */
export async function getForecastDetail(locationId: string): Promise<{ week: WeeklyForecast; hours: HourlyForecast[] }> {
  const place = placeFor(locationId);
  const bundle = await fetchWeatherBundle(place.lat, place.lng);
  return { week: toWeeklyForecast(bundle, locationId), hours: toHourlyForecasts(bundle, locationId) };
}

/** One day out of `getForecastDetail`, with its own 24 hours. Throws when the
 * week has no such date, the same failure `getDayDetail` reports. */
export function pickDay(
  detail: { week: WeeklyForecast; hours: HourlyForecast[] },
  locationId: string,
  date: string,
): { day: DailyForecast; hours: HourlyForecast[]; week: WeeklyForecast } {
  const day = detail.week.days.find((entry) => entry.date === date);
  if (!day) {
    throw new ServiceError(`No forecast for ${date} at location "${locationId}"`);
  }
  // The bundle carries the whole week's hours; take the requested day's.
  const hours = detail.hours.filter((hour) => hour.hour.startsWith(date));
  return { day, hours, week: detail.week };
}

/** A single day from the week, with its full 24 hourly steps — what the
 * day-detail screen charts. Returns both together so the screen can't end
 * up rendering a chart for one day beside a header for another. */
export async function getDayDetail(
  locationId: string,
  date: string,
): Promise<{ day: DailyForecast; hours: HourlyForecast[]; week: WeeklyForecast }> {
  return pickDay(await getForecastDetail(locationId), locationId, date);
}

/** The Forecasts tab's "Today" section — the next six hours.
 *
 * Sliced from the first step *after* now, not from midnight: the strip is a
 * "what happens next" reading, and an hour already past is noise. */
export async function getHourlyForecast(locationId: string): Promise<HourlyForecast[]> {
  const hours = await getHours(locationId);
  const now = Date.now();
  const upcoming = hours.filter((hour) => new Date(hour.hour).getTime() > now);

  if (upcoming.length === 0) {
    throw new ServiceError(`No hourly forecast available for location "${locationId}"`);
  }
  return upcoming.slice(0, 6);
}

// --- Tier B: signature + placeholder only, no real source yet ---

const PLACEHOLDER_SEASONAL: SeasonalOutlook = {
  regionId: 'northern',
  issuedAt: new Date().toISOString(),
  seasonLabel: '2026 Major Season',
  onset: { expectedWindowStart: '2026-04-10', expectedWindowEnd: '2026-04-25', probabilityPct: 60 },
  cessation: { expectedWindowStart: '2026-10-05', expectedWindowEnd: '2026-10-20', probabilityPct: 55 },
  rainfallProbability: { belowNormalPct: 25, normalPct: 40, aboveNormalPct: 35 },
  drySpellRisk: { category: 'moderate', description: 'A moderate chance of a dry spell during the mid-season period.' },
  temperatureOutlook: { category: 'above-normal', probabilityPct: 50 },
  confidenceLevel: 'moderate',
  plainLanguageSummary:
    'This is a probabilistic climate outlook for the whole season, not a weather forecast. Treat it as a planning guide, and follow shorter-range forecasts for day-to-day decisions.',
  farmerActionCard: {
    headline: 'Plan the season with contingencies',
    actions: ['Prepare drought-tolerant seed varieties as a backup.', 'Review seasonal advisories before committing to a planting date.'],
  },
};

export async function getSeasonalOutlook(regionId: string): Promise<SeasonalOutlook> {
  return mockDelay({ ...PLACEHOLDER_SEASONAL, regionId });
}

export async function getForecastMapLayers(): Promise<ForecastMapLayer[]> {
  return mockDelay(MOCK_MAP_LAYERS);
}
