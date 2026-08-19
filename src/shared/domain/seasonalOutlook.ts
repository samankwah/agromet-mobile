import type { ConfidenceLevel, OutlookCategory } from './subseasonalOutlook';

/**
 * Tier B this increment — type + placeholder mock only. Seasonal climate
 * outlook (onset/cessation/rainfall probability/dry-spell risk/temperature
 * outlook), region-scoped rather than town-scoped since seasonal outlooks
 * are issued at that granularity. Same non-optional `plainLanguageSummary`
 * rule as SubseasonalOutlook, for the same reason.
 */
export type SeasonalOutlook = {
  regionId: string;
  issuedAt: string; // ISO 8601
  seasonLabel: string; // e.g. "2026 Major Season"
  onset: { expectedWindowStart: string; expectedWindowEnd: string; probabilityPct: number };
  cessation: { expectedWindowStart: string; expectedWindowEnd: string; probabilityPct: number };
  /** Should sum to ~100 — enforced by a unit test on the mock data, not by
   * the type, since a hard type-level constraint isn't expressible here. */
  rainfallProbability: { belowNormalPct: number; normalPct: number; aboveNormalPct: number };
  drySpellRisk: { category: 'low' | 'moderate' | 'high'; description: string };
  temperatureOutlook: { category: OutlookCategory; probabilityPct: number };
  confidenceLevel: ConfidenceLevel;
  plainLanguageSummary: string;
  farmerActionCard: {
    headline: string;
    actions: string[];
  };
};
