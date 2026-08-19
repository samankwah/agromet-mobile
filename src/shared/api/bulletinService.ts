import { MOCK_BULLETINS } from '../data/mockBulletins';
import type { Bulletin } from '../domain/bulletin';
import { mockDelay, ServiceError } from './mockDelay';

/** Tier B — signatures only, no screen consumes these yet (future
 * "Bulletin Library" milestone). */

export async function getLatestBulletinTeaser(): Promise<Bulletin> {
  return mockDelay(MOCK_BULLETINS[0]);
}

export async function listBulletins(filter?: { type?: Bulletin['bulletinType']; coverage?: string; search?: string }): Promise<Bulletin[]> {
  let results = MOCK_BULLETINS;
  if (filter?.type) results = results.filter((b) => b.bulletinType === filter.type);
  if (filter?.coverage) results = results.filter((b) => b.coverage === filter.coverage);
  if (filter?.search) results = results.filter((b) => b.title.toLowerCase().includes(filter.search!.toLowerCase()));
  return mockDelay(results);
}

export async function getBulletinById(id: string): Promise<Bulletin> {
  const bulletin = MOCK_BULLETINS.find((b) => b.id === id);
  if (!bulletin) throw new ServiceError(`No bulletin found with id "${id}"`);
  return mockDelay(bulletin);
}
