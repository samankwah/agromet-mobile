import type { CommodityCatalogueEntry, MarketCenter, MarketCommodity, MarketTrend } from '../domain/market';

/**
 * Pure derivations over the market data.
 *
 * Transcribed from frontend/src/utils/marketInsights.js so the phone and the
 * web reach the same verdict about the same commodity in the same month —
 * "sell now" on one and "hold" on the other would be worse than either screen
 * saying nothing. Nothing here touches React, the network or the clock unless
 * the caller passes the month in.
 */

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Ghana cedi, always two decimals. An em dash stands in for no figure. */
export function formatCedi(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `GH₵${value.toFixed(2)}`;
}

/** 1-indexed month numbers — the shape peakMonths/lowMonths use — to labels. */
export function formatMonths(months: number[] | undefined): string {
  if (!months || months.length === 0) return '—';
  const labels = months.map((month) => MONTH_NAMES[month - 1]).filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : '—';
}

export type PriceChange = {
  first: number;
  last: number;
  delta: number;
  pct: number;
  direction: 'up' | 'down' | 'flat';
  high: number;
  low: number;
  months: number;
};

/**
 * Movement across a price series.
 *
 * Null for a series too short to have moved, so callers can drop the change
 * indicator entirely rather than assert a confident "+GH₵0.00".
 */
export function getPriceChange(series: number[] | null | undefined): PriceChange | null {
  if (!series || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;
  return {
    first,
    last,
    delta,
    pct: first === 0 ? 0 : (delta / first) * 100,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    high: Math.max(...series),
    low: Math.min(...series),
    months: series.length,
  };
}

export type TimingTone = 'sell' | 'hold' | 'watch';

export type TimingSignal = {
  tone: TimingTone;
  title: string;
  detail: string;
};

/**
 * Where this month sits against the commodity's seasonal peaks and troughs.
 *
 * Three-valued on purpose: there is no useful fourth answer to "should I sell
 * this month?", and inventing one would only dilute the two that matter.
 */
export function getTimingSignal(trend: MarketTrend | null | undefined, month: number): TimingSignal {
  if (trend?.peakMonths?.includes(month)) {
    return {
      tone: 'sell',
      title: 'Good time to sell',
      detail: 'Peak price period. Sell now, or within 2-4 weeks, for the best return.',
    };
  }
  if (trend?.lowMonths?.includes(month)) {
    return {
      tone: 'hold',
      title: 'Hold if you can',
      detail: 'Prices are typically at their lowest. Store properly and wait for the peak.',
    };
  }
  return {
    tone: 'watch',
    title: 'Moderate timing',
    detail: 'An average price period. Watch daily prices for an opening.',
  };
}

export type RegionalPrice = {
  region: string;
  price: number;
  premiumPct: number;
  majorMarkets: string[];
  transportAccess: string;
};

/** The same commodity priced at every market centre, dearest first. */
export function getRegionalPrices(basePrice: number | null, centers: MarketCenter[]): RegionalPrice[] {
  if (typeof basePrice !== 'number') return [];
  return centers
    .map((center) => ({
      region: center.region,
      price: basePrice * center.pricePremium,
      premiumPct: (center.pricePremium - 1) * 100,
      majorMarkets: center.majorMarkets,
      transportAccess: center.transportAccess,
    }))
    .sort((a, b) => b.price - a.price);
}

/** The national price adjusted for one region, or the national price itself. */
export function applyRegionPremium(
  basePrice: number | null,
  centers: MarketCenter[],
  region: string,
): number | null {
  if (typeof basePrice !== 'number') return null;
  const center = region ? centers.find((candidate) => candidate.region === region) : undefined;
  return center ? basePrice * center.pricePremium : basePrice;
}

export type ResolvedCommodity = {
  entry: CommodityCatalogueEntry;
  market: MarketCommodity | null;
  trend: MarketTrend | null;
  series: number[] | null;
  basePrice: number | null;
  price: number | null;
  change: PriceChange | null;
  center: MarketCenter | null;
};

/**
 * Join a catalogue entry to its price and trend.
 *
 * The only place that knows a catalogue entry's price is filed under its
 * `commoditySlug` rather than its own `slug` — see domain/market.ts for why
 * those differ.
 */
export function resolveCommodity(
  entry: CommodityCatalogueEntry,
  commodities: MarketCommodity[],
  trends: Record<string, MarketTrend>,
  centers: MarketCenter[],
  region: string,
): ResolvedCommodity {
  const market = commodities.find((candidate) => candidate.slug === entry.commoditySlug) ?? null;
  const trend = trends[entry.commoditySlug] ?? null;
  const series = trend?.monthPrices?.length ? trend.monthPrices : null;
  const basePrice = market?.price ?? null;

  return {
    entry,
    market,
    trend,
    series,
    basePrice,
    price: applyRegionPremium(basePrice, centers, region),
    change: getPriceChange(series),
    center: (region ? centers.find((candidate) => candidate.region === region) : undefined) ?? null,
  };
}
