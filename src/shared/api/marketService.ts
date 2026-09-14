import { MOCK_COMMODITIES, MOCK_MARKET_CENTERS, MOCK_MARKET_TRENDS } from '../data/mockMarket';
import type { MarketCenter, MarketCommodity, MarketTrend } from '../domain/market';
import { getJson, NetworkError } from './http';

/**
 * Commodity prices, trends and market centres, over real HTTP.
 *
 * Two shape changes happen here and nowhere else:
 *
 *  1. The backend returns each collection as an object keyed by slug or
 *     region rather than as a list. The key is flattened into the entry so
 *     the rest of the app sees ordinary arrays.
 *  2. The trend payload is snake_case and its price series is called
 *     "6months" — not a legal identifier to destructure, and not a name worth
 *     spreading through the UI.
 *
 * When the server cannot be reached the seeded copy is served instead, and
 * the caller is told which happened, matching calendarService's contract.
 */

/**
 * Why sample data is being shown, if it is.
 *
 *   'offline'  the server could not be reached
 *   'empty'    the server answered, and has no market data published
 *   'partial'  the server answered with a subset; the rest came from seed
 *
 * The second is not hypothetical: the deployed backend seeds SQLite on
 * import, which does not survive a read-only serverless filesystem, so a
 * live deployment can answer 200 with an empty map. Treating that as "no
 * prices" would leave every card reading "Price unavailable" while the
 * seeded copy sat unused on the phone.
 */
export type MarketFallbackReason = 'offline' | 'empty' | 'partial' | null;

export type MarketResult<T> = { data: T; fallback: MarketFallbackReason };

/**
 * The backend's per-commodity payload.
 *
 * `slug` is optional because it is: the collection is a map keyed by slug,
 * and the key — not the field — is the authoritative identifier. Older
 * deployments omit the field inside each entry entirely, so reading it
 * instead of the key leaves every commodity unidentifiable and every card
 * reading "Price unavailable". The same applies to `commodity_slug` and
 * `region` below.
 */
type CommodityDto = {
  slug?: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  trend: string;
  demand: string;
};

type TrendDto = {
  commodity_slug?: string;
  '6months': number[];
  seasonal_pattern: string | null;
  peak_months: number[];
  low_months: number[];
};

type MarketCenterDto = {
  region?: string;
  major_markets: string[];
  transport_access: string;
  price_premium: number;
};

function toCommodity(slug: string, dto: CommodityDto): MarketCommodity {
  return {
    slug: dto.slug ?? slug,
    name: dto.name,
    category: dto.category,
    price: dto.price,
    unit: dto.unit,
    trend: dto.trend as MarketCommodity['trend'],
    demand: dto.demand as MarketCommodity['demand'],
  };
}

function toTrend(slug: string, dto: TrendDto): MarketTrend {
  return {
    commoditySlug: dto.commodity_slug ?? slug,
    monthPrices: dto['6months'] ?? [],
    seasonalPattern: dto.seasonal_pattern ?? null,
    peakMonths: dto.peak_months ?? [],
    lowMonths: dto.low_months ?? [],
  };
}

function toMarketCenter(region: string, dto: MarketCenterDto): MarketCenter {
  return {
    region: dto.region ?? region,
    majorMarkets: dto.major_markets ?? [],
    transportAccess: dto.transport_access,
    pricePremium: dto.price_premium,
  };
}

/**
 * Run a request, falling back to the seeded copy when the server is
 * unreachable or has nothing to say.
 *
 * A ServiceError is deliberately *not* caught: the server answering with an
 * error is a real fault worth surfacing, whereas being off-signal in a field
 * — or talking to a deployment whose market tables never seeded — are both
 * cases where showing the seeded prices beats showing none.
 */
async function withFallback<T>(
  fetcher: () => Promise<T>,
  seeded: T,
  /** Live data wins key by key; seeded entries fill only the gaps. */
  merge: (live: T, seeded: T) => { data: T; topped: boolean },
  isEmpty: (value: T) => boolean,
): Promise<MarketResult<T>> {
  try {
    const live = await fetcher();
    if (isEmpty(live)) return { data: seeded, fallback: 'empty' };

    const { data, topped } = merge(live, seeded);
    return { data, fallback: topped ? 'partial' : null };
  } catch (error) {
    if (error instanceof NetworkError) return { data: seeded, fallback: 'offline' };
    throw error;
  }
}

/** Merge two slug-keyed lists, keeping the live entry wherever both have one. */
function mergeBySlug<T extends { slug: string }>(live: T[], seeded: T[]): { data: T[]; topped: boolean } {
  const bySlug = new Map(seeded.map((entry) => [entry.slug, entry]));
  live.forEach((entry) => bySlug.set(entry.slug, entry));
  const liveSlugs = new Set(live.map((entry) => entry.slug));
  return { data: [...bySlug.values()], topped: seeded.some((entry) => !liveSlugs.has(entry.slug)) };
}

export async function listCommodities(): Promise<MarketResult<MarketCommodity[]>> {
  return withFallback(
    async () => {
      const data = await getJson<Record<string, CommodityDto>>('/api/market/commodities');
      return Object.entries(data ?? {}).map(([slug, dto]) => toCommodity(slug, dto));
    },
    MOCK_COMMODITIES,
    mergeBySlug,
    (list) => list.length === 0,
  );
}

export async function listTrends(): Promise<MarketResult<Record<string, MarketTrend>>> {
  return withFallback(
    async () => {
      const data = await getJson<Record<string, TrendDto>>('/api/market/trends');
      return Object.fromEntries(Object.entries(data ?? {}).map(([slug, dto]) => [slug, toTrend(slug, dto)]));
    },
    MOCK_MARKET_TRENDS,
    (live, seeded) => ({
      data: { ...seeded, ...live },
      topped: Object.keys(seeded).some((slug) => !(slug in live)),
    }),
    (map) => Object.keys(map).length === 0,
  );
}

export async function listMarketCenters(): Promise<MarketResult<MarketCenter[]>> {
  return withFallback(
    async () => {
      const data = await getJson<Record<string, MarketCenterDto>>('/api/market/regions');
      return Object.entries(data ?? {}).map(([region, dto]) => toMarketCenter(region, dto));
    },
    MOCK_MARKET_CENTERS,
    (live, seeded) => {
      const byRegion = new Map(seeded.map((entry) => [entry.region, entry]));
      live.forEach((entry) => byRegion.set(entry.region, entry));
      const liveRegions = new Set(live.map((entry) => entry.region));
      return { data: [...byRegion.values()], topped: seeded.some((entry) => !liveRegions.has(entry.region)) };
    },
    (list) => list.length === 0,
  );
}
