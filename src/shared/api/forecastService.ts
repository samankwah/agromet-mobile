import { HOME_LOCATIONS } from '../data/mockWeather';
import type { DailyForecast, HourlyForecast, WeeklyForecast } from '../domain/forecast';
import { synthesiseWeatherAlerts } from '../domain/weatherHazards';
import { ServiceError } from './mockDelay';
import { fetchWeatherBundle, toHourlyForecasts, toWeeklyForecast } from './openMeteo';

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
 * through `/api/outlook/subseasonal`. There is no seasonal outlook yet: seasonal
 * forecasts are issued monthly by the Copernicus multi-model service, which
 * needs a CDS key and a different pipeline. The placeholder that stood in for
 * it was removed so the app never shows invented figures as an outlook.
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
