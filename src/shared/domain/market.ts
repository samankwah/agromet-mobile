/**
 * Tier B this increment — type + placeholder mock only (future "Diagnosis
 * and Market" milestone). Mirrors the backend's market API shape
 * (GET /api/market/commodities, /api/market/trends — backend/app/main.py)
 * 1:1 so a real integration is a rename, not a reshape.
 */
export type MarketCommodity = {
  slug: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  demand: string;
};

export type MarketTrend = {
  commoditySlug: string;
  monthPrices: number[]; // backend's "6months"
  seasonalPattern: string;
  peakMonths: number[];
  lowMonths: number[];
};
