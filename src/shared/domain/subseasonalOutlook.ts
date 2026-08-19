/**
 * Tier B this increment — type + placeholder mock only, no screen built yet
 * (future "Forecast Centre" milestone). Weeks 2-4 probabilistic outlook.
 *
 * `plainLanguageSummary` is deliberately non-optional: this is a
 * probabilistic climate outlook, not a weather forecast, and the type
 * itself should make it impossible to render one without also carrying the
 * plain-language uncertainty explanation farmers need to not mistake it for
 * a deterministic forecast (see WeeklyForecast for the deterministic kind).
 */
export type OutlookCategory = 'below-normal' | 'normal' | 'above-normal';
export type ConfidenceLevel = 'low' | 'moderate' | 'high';

export type SubseasonalOutlook = {
  locationId: string;
  issuedAt: string; // ISO 8601
  weekRangeStart: string; // ISO 8601 date
  weekRangeEnd: string; // ISO 8601 date
  rainfallOutlook: { category: OutlookCategory; probabilityPct: number };
  temperatureOutlook: { category: OutlookCategory; probabilityPct: number };
  confidenceLevel: ConfidenceLevel;
  plainLanguageSummary: string;
  farmerActionCard: {
    headline: string;
    actions: string[];
  };
};
