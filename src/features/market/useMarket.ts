import { useMemo } from 'react';

import { listCommodities, listMarketCenters, listTrends, type MarketFallbackReason } from '../../shared/api/marketService';
import { useCachedQuery } from '../../shared/api/useCachedQuery';
import { COMMODITY_CATALOGUE, catalogueEntryFor } from '../../shared/data/commodityCatalogue';
import type { MarketCenter, MarketCommodity, MarketTrend } from '../../shared/domain/market';
import { resolveCommodity, type ResolvedCommodity } from '../../shared/utils/marketInsights';
import { useMarketRegionStore } from '../../shared/state/marketRegionStore';

/**
 * Market data for the list and detail screens.
 *
 * Prices, trends and market centres are fetched together as one snapshot
 * rather than as three queries. They are always read together — a price
 * without its region premium is the wrong number, and a card without its
 * series has a hole where the sparkline goes — so three independent statuses
 * would only give the screen three ways to be half-loaded.
 */

const HOUR = 60 * 60 * 1000;
const MARKET_STALE_TIME = 6 * HOUR;
const MARKET_GC_TIME = 7 * 24 * HOUR;

export type MarketSnapshot = {
  commodities: MarketCommodity[];
  trends: Record<string, MarketTrend>;
  centers: MarketCenter[];
  /** Set when any part of the snapshot came from the seeded copy. */
  fallback: MarketFallbackReason;
};

async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const [commodities, trends, centers] = await Promise.all([listCommodities(), listTrends(), listMarketCenters()]);
  return {
    commodities: commodities.data,
    trends: trends.data,
    centers: centers.data,
    fallback: commodities.fallback ?? trends.fallback ?? centers.fallback,
  };
}

export function useMarketSnapshot() {
  return useCachedQuery<MarketSnapshot>({
    queryKey: ['market', 'snapshot'],
    queryFn: fetchMarketSnapshot,
    cacheKey: 'market:snapshot',
    staleTime: MARKET_STALE_TIME,
    gcTime: MARKET_GC_TIME,
  });
}

/** The whole catalogue, priced against the selected region. */
export function useResolvedCatalogue() {
  const query = useMarketSnapshot();
  const region = useMarketRegionStore((state) => state.region);

  const resolved = useMemo<ResolvedCommodity[]>(() => {
    const snapshot = query.data;
    if (!snapshot) return [];
    return COMMODITY_CATALOGUE.map((entry) =>
      resolveCommodity(entry, snapshot.commodities, snapshot.trends, snapshot.centers, region),
    );
  }, [query.data, region]);

  return { ...query, resolved, region, centers: query.data?.centers ?? [] };
}

/** One catalogue entry, priced against the selected region. */
export function useResolvedCommodity(slug: string) {
  const query = useMarketSnapshot();
  const region = useMarketRegionStore((state) => state.region);
  const entry = catalogueEntryFor(slug);

  const resolved = useMemo<ResolvedCommodity | null>(() => {
    const snapshot = query.data;
    if (!snapshot || !entry) return null;
    return resolveCommodity(entry, snapshot.commodities, snapshot.trends, snapshot.centers, region);
  }, [query.data, entry, region]);

  return { ...query, entry, resolved, region, centers: query.data?.centers ?? [] };
}
