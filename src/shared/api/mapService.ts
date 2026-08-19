import { MOCK_MAP_LAYERS } from '../data/mockMapLayers';
import type { MapLayer } from '../domain/forecastMap';
import { mockDelay } from './mockDelay';

/** Tier B — signature only (future "Maps and Notifications" milestone). */
export async function listMapLayers(): Promise<MapLayer[]> {
  return mockDelay(MOCK_MAP_LAYERS);
}
