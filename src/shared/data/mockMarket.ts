import type { MarketCommodity, MarketTrend } from '../domain/market';

/** Placeholder only — the "Diagnosis and Market" milestone builds real
 * price/trend UI against marketService.ts. Shape mirrors the backend's
 * seeded commodities (backend/app/main.py) for a low-friction swap. */
export const MOCK_COMMODITIES: MarketCommodity[] = [
  { slug: 'maize-yellow', name: 'Yellow Maize', category: 'Cereals', price: 280, unit: 'GH₵ per 100kg bag', trend: 'up', demand: 'high' },
  { slug: 'tomato', name: 'Tomatoes', category: 'Vegetables', price: 450, unit: 'GH₵ per crate', trend: 'stable', demand: 'moderate' },
];

export const MOCK_MARKET_TRENDS: Record<string, MarketTrend> = {
  'maize-yellow': {
    commoditySlug: 'maize-yellow',
    monthPrices: [240, 250, 260, 265, 270, 280],
    seasonalPattern: 'Prices typically rise ahead of the lean season.',
    peakMonths: [6, 7],
    lowMonths: [10, 11],
  },
};
