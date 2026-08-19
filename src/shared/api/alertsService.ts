import { getDistrictById } from '../data/districts';
import { getMockAlertsForDistricts, MOCK_ALERTS } from '../data/mockAlerts';
import type { WeatherAlert } from '../domain/weatherAlert';
import { mockDelay, ServiceError } from './mockDelay';

/**
 * Sole swap point for alert data. Takes district *ids* (from the app's
 * saved-districts selection) and resolves them to the district names the
 * mock alert records are keyed by; a real GMet/CAP feed integration would
 * most likely be queried by district id/code directly, in which case that
 * translation step moves into (or is replaced inside) this function without
 * any caller needing to change.
 */
export async function getActiveAlerts(districtIds: string[]): Promise<WeatherAlert[]> {
  const districtNames = districtIds.map((id) => getDistrictById(id)?.name).filter((name): name is string => Boolean(name));

  return mockDelay(getMockAlertsForDistricts(districtNames));
}

/** Fetches a single alert by id, for the alert-details screen. */
export async function getAlertById(id: string): Promise<WeatherAlert> {
  const alert = MOCK_ALERTS.find((item) => item.id === id);
  if (!alert) {
    throw new ServiceError(`No alert found with id "${id}"`);
  }
  return mockDelay(alert);
}
