import type { WeatherAlert } from './weatherAlert';

/**
 * Short-range forecast types — the deterministic end of the forecast
 * timescale spectrum (contrast with subseasonalOutlook.ts/seasonalOutlook.ts,
 * which are explicitly probabilistic and must never be presented this way).
 */
export type DailyForecast = {
  locationId: string;
  date: string; // ISO 8601 date
  tempMinC: number;
  tempMaxC: number;
  condition: string;
  /** The raw WMO code behind `condition`. See domain/weatherGlyph.ts for why
   * the icons read this rather than the five-word label. */
  weatherCode: number;
  /** Always true on a daily row: a whole-day summary has no night form. Kept
   * on the type so every forecast shape answers the icon the same way. */
  isDay: boolean;
  rainfallProbabilityPct: number;
  rainfallMm: number;
  windKph: number;
  humidityPct: number;
  /** Short, farmer-facing plain-language read of this single day — not the
   * same field as WeeklyForecast.summary, which covers the whole week. */
  farmerInterpretation: string;
};

export type HourlyForecast = {
  locationId: string;
  hour: string; // ISO 8601 datetime
  tempC: number;
  /** Drives the day-detail chart's Actual / Feels Like toggle. */
  feelsLikeC: number;
  condition: string;
  /** As on DailyForecast. */
  weatherCode: number;
  /** False for the hours after dark, so an icon can show the night form. */
  isDay: boolean;
  rainfallProbabilityPct: number;
  rainfallMm: number;
  /** Hour-by-hour values behind the day-detail chart's measure selector.
   * The daily forecast carries single figures for these; these are the
   * within-day curves. */
  humidityPct: number;
  windKph: number;
  /** 0-11+ on the standard UV index scale. Zero after dark. */
  uvIndex: number;
};

export type WeeklyForecast = {
  locationId: string;
  generatedAt: string; // ISO 8601
  days: DailyForecast[]; // 7 entries
  summary: string;
  farmerActionCard: {
    headline: string;
    actions: string[];
  };
  /**
   * Severe-weather alerts for this location, today and tomorrow — thunderstorm,
   * heavy rain, extreme heat, strong wind. Derived from the same Open-Meteo
   * bundle these days come from (see `shared/domain/weatherHazards.ts`), so the
   * banner on Home and Advisories costs no extra request. Empty on a calm day,
   * which is the point: the old flood-index banner was never empty.
   */
  weatherAlerts: WeatherAlert[];
};
