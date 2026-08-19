import { MOCK_COMMODITIES, MOCK_MARKET_TRENDS } from '../data/mockMarket';
import type { MarketCommodity, MarketTrend } from '../domain/market';
import { mockDelay, ServiceError } from './mockDelay';

/** Tier B — signatures only (future "Diagnosis and Market" milestone). */

export async function listCommodities(): Promise<MarketCommodity[]> {
  return mockDelay(MOCK_COMMODITIES);
}

export async function getCommodity(slug: string): Promise<MarketCommodity> {
  const commodity = MOCK_COMMODITIES.find((c) => c.slug === slug);
  if (!commodity) throw new ServiceError(`No commodity found with slug "${slug}"`);
  return mockDelay(commodity);
}

export async function getTrend(slug: string): Promise<MarketTrend | undefined> {
  return mockDelay(MOCK_MARKET_TRENDS[slug]);
}
