/**
 * Commodity prices, trends and market centres.
 *
 * Mirrors the backend's market API (GET /api/market/commodities, /trends,
 * /regions — backend/app/main.py) field for field, camel-cased. The backend
 * serializes these collections as maps keyed by slug or region, so the
 * service reshapes them into arrays; every entry carries its own key as a
 * field, which is why `slug` and `region` appear below.
 */

/**
 * How the price is moving.
 *
 * These are the backend's own words, not a generic up/down/flat. `volatile`
 * and `seasonal` say something 'up' cannot — that the direction is unstable,
 * or that it is following a calendar rather than a market — and the timing
 * advice on the commodity screen depends on the difference.
 */
export type MarketTrendDirection = 'rising' | 'falling' | 'stable' | 'volatile' | 'seasonal';

/** Demand pressure, as published. */
export type MarketDemand = 'very-high' | 'high' | 'moderate' | 'low' | 'growing' | 'export';

export type MarketCommodity = {
  slug: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  trend: MarketTrendDirection;
  demand: MarketDemand;
};

export type MarketTrend = {
  commoditySlug: string;
  /** Six monthly prices, oldest first; the last is the current price. */
  monthPrices: number[];
  seasonalPattern: string | null;
  /** 1-indexed month numbers when the price is typically highest. */
  peakMonths: number[];
  /** 1-indexed month numbers when the price is typically lowest. */
  lowMonths: number[];
};

export type MarketCenter = {
  region: string;
  majorMarkets: string[];
  transportAccess: string;
  /** Multiplier on the national price — 1.1 means 10% dearer than national. */
  pricePremium: number;
};

/**
 * A catalogue entry: what the app sells, as distinct from what the backend
 * prices.
 *
 * `slug` is unique and is the route identity (/commodity/<slug>).
 * `commoditySlug` is the key its price and trend are filed under. They differ
 * wherever several varieties share one traded commodity — the three peppers
 * all price off `pepper` — which is why a variety cannot simply be keyed by
 * its price slug. This mirrors frontend/src/data/commodityCatalog.js.
 */
export type CommodityCatalogueEntry = {
  slug: string;
  commoditySlug: string;
  name: string;
  category: string;
  description: string;
  about: string;
};
