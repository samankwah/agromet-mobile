import { DEFAULT_LOCATION_ID, HOME_LOCATIONS, MOCK_CURRENT_CONDITIONS } from '../data/mockWeather';
import type { CurrentWeather } from '../domain/currentWeather';
import { mockDelay, ServiceError } from './mockDelay';

export { HOME_LOCATIONS, DEFAULT_LOCATION_ID };

/**
 * Sole swap point for current-conditions data. Today this reads mock
 * records; a real integration has two credible options this app doesn't
 * commit to yet — proxy through the FastAPI backend, or call Open-Meteo
 * directly on-device the way the web app does
 * (frontend/src/services/openMeteoService.js) — either way, only this
 * function's body changes, not any calling component.
 */
export async function getCurrentConditions(locationId: string): Promise<CurrentWeather> {
  const record = MOCK_CURRENT_CONDITIONS[locationId];
  if (!record) {
    throw new ServiceError(`No current conditions available for location "${locationId}"`);
  }
  return mockDelay(record);
}
