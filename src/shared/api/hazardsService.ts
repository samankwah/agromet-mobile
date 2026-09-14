import type { HazardMethodology, HazardRegion, HazardSummary } from '../domain/hazard';
import { getJson } from './http';
import { ServiceError } from './mockDelay';

/**
 * Flood and drought readings from the AgroMet backend.
 *
 * Thin on purpose — `http.ts` already unwraps the `{ success, data }` envelope
 * and separates NetworkError (unreachable) from ServiceError (the server
 * answered and said no). What is left here is the one thing the transport
 * cannot know: which successful responses are not actually answers.
 */

export const HAZARDS_UNAVAILABLE_MESSAGE =
  'Flood and drought readings are not available right now. The weather and river services could not be reached, so nothing is shown here rather than a guess.';

/**
 * The national summary.
 *
 * The backend answers 200 with `unavailable: true` and an empty region list
 * when it has no usable reading, rather than a 5xx — deliberate on its side, so
 * a monitoring page can render a clear "no reading" state instead of an error.
 *
 * That is turned back into a rejection here, for a reason worth stating:
 * `useCachedQuery` writes every success straight to the offline cache. Letting
 * an empty payload through as a success would overwrite a perfectly good cached
 * snapshot with nothing, and a farmer who opened the app during an outage would
 * lose the readings they already had. Rejecting keeps the cache intact and
 * gives the screen a single status to branch on.
 */
export async function getHazardSummary(): Promise<HazardSummary> {
  const summary = await getJson<HazardSummary>('/api/hazards/summary');

  if (summary.unavailable || !summary.regions?.length) {
    throw new ServiceError(HAZARDS_UNAVAILABLE_MESSAGE);
  }

  return summary;
}

/** Full detail for one region, including the daily series the charts need. */
export async function getHazardRegion(region: string): Promise<HazardRegion> {
  try {
    return await getJson<HazardRegion>(`/api/hazards/regions/${encodeURIComponent(region)}`);
  } catch (error) {
    if (error instanceof ServiceError && error.status === 503) {
      // The snapshot is still warming — seconds, not an outage. Say so, rather
      // than showing the transport's "the server rejected the request (503)".
      throw new ServiceError('Readings for this region are still being prepared. Try again in a moment.', 503);
    }
    if (error instanceof ServiceError && error.status === 404) {
      throw new ServiceError(`No readings are published for ${region}.`, 404);
    }
    throw error;
  }
}

export function getHazardMethodology(): Promise<HazardMethodology> {
  return getJson<HazardMethodology>('/api/hazards/methodology');
}
