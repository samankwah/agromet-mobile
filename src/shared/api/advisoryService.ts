import { getMockAdvisoryForDistrict } from '../data/mockAdvisory';
import type { AgroAdvisory } from '../domain/advisory';
import { mockDelay } from './mockDelay';

/**
 * Sole swap point for advisory data — today reads mock records keyed by
 * district name; a real integration points this at the backend's
 * GET /api/weekly-advisories (backend/app/main.py) with the same district
 * filter.
 */
export async function getLatestAdvisoryTeaser(districtName: string | undefined): Promise<AgroAdvisory> {
  return mockDelay(getMockAdvisoryForDistrict(districtName));
}
