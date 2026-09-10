import { DEFAULT_LOCATION_ID, HOME_LOCATIONS } from '../data/mockWeather';
import type { CurrentWeather } from '../domain/currentWeather';
import { ServiceError } from './mockDelay';
import { fetchCurrentBatch, fetchWeatherBundle, toCurrentWeather, type BriefConditions } from './openMeteo';

export type { BriefConditions };

export { HOME_LOCATIONS, DEFAULT_LOCATION_ID };

/**
 * Current conditions, from Open-Meteo.
 *
 * This was the sole swap point for mock weather, and this is the swap: the
 * signature is unchanged, so nothing above the service layer knows it happened.
 *
 * `HOME_LOCATIONS` still comes from `data/mockWeather` — the file name is now
 * misleading, but the ten towns and their coordinates are a real catalogue, not
 * mock data, and every screen imports them from here. Renaming that module is a
 * separate change.
 *
 * The request goes through our backend, which caches it, and falls back to
 * calling Open-Meteo directly when the backend cannot be reached — see
 * `openMeteo.ts`. Weather is the app's core value and should not go down with
 * the AgroMet server.
 */
export async function getCurrentConditions(locationId: string): Promise<CurrentWeather> {
  const place = HOME_LOCATIONS.find((entry) => entry.id === locationId);
  if (!place) {
    throw new ServiceError(`No current conditions available for location "${locationId}"`);
  }

  const bundle = await fetchWeatherBundle(place.lat, place.lng);
  if (!bundle.current) {
    throw new ServiceError(`No current conditions available for location "${locationId}"`);
  }

  return toCurrentWeather(bundle, place);
}

/**
 * The temperature strip behind the Home carousel, for every town at once.
 *
 * Keyed by town id rather than returned as an array, so a caller cannot pair a
 * reading with the wrong town by getting the index wrong — the failure that
 * would be least visible and worst, since every card would still show a
 * plausible Ghanaian temperature.
 *
 * A town Open-Meteo could not answer for is simply absent from the map; the card
 * shows its placeholder rather than a number invented for it.
 */
export async function getCarouselConditions(): Promise<Record<string, BriefConditions>> {
  const readings = await fetchCurrentBatch(HOME_LOCATIONS);

  const byId: Record<string, BriefConditions> = {};
  HOME_LOCATIONS.forEach((place, index) => {
    const reading = readings[index];
    if (reading) byId[place.id] = reading;
  });
  return byId;
}
