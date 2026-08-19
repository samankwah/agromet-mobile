import { MOCK_HOURLY_BY_DAY, MOCK_HOURLY_FORECASTS, MOCK_WEEKLY_FORECASTS } from '../data/mockForecast';
import type { DailyForecast, HourlyForecast, WeeklyForecast } from '../domain/forecast';
import type { ForecastMapLayer } from '../domain/forecastMap';
import type { SeasonalOutlook } from '../domain/seasonalOutlook';
import type { SubseasonalOutlook } from '../domain/subseasonalOutlook';
import { mockDelay, ServiceError } from './mockDelay';
import { MOCK_MAP_LAYERS } from '../data/mockMapLayers';

function getWeekly(locationId: string): WeeklyForecast {
  const record = MOCK_WEEKLY_FORECASTS[locationId];
  if (!record) {
    throw new ServiceError(`No forecast available for location "${locationId}"`);
  }
  return record;
}

// --- Tier A: fully mocked this increment, Home depends on these ---

export async function getDailyForecast(locationId: string): Promise<DailyForecast> {
  return mockDelay(getWeekly(locationId).days[0]);
}

export async function getWeeklyForecast(locationId: string): Promise<WeeklyForecast> {
  return mockDelay(getWeekly(locationId));
}

/** A single day from the week, with its full 24 hourly steps — what the
 * day-detail screen charts. Returns both together so the screen can't end
 * up rendering a chart for one day beside a header for another. */
export async function getDayDetail(
  locationId: string,
  date: string,
): Promise<{ day: DailyForecast; hours: HourlyForecast[]; week: WeeklyForecast }> {
  const week = getWeekly(locationId);
  const day = week.days.find((entry) => entry.date === date);
  if (!day) {
    throw new ServiceError(`No forecast for ${date} at location "${locationId}"`);
  }
  const hours = MOCK_HOURLY_BY_DAY[locationId]?.[date] ?? [];
  return mockDelay({ day, hours, week });
}

/** The Forecasts tab's "Today" section — next ~6 hours. */
export async function getHourlyForecast(locationId: string): Promise<HourlyForecast[]> {
  const hours = MOCK_HOURLY_FORECASTS[locationId];
  if (!hours) {
    throw new ServiceError(`No hourly forecast available for location "${locationId}"`);
  }
  return mockDelay(hours);
}

/**
 * Home's stable dependency — kept as a separate named export from
 * `getWeeklyForecast` even though both read the same mock record today, so
 * Home's contract doesn't shift if a future Forecast Centre needs a
 * differently-shaped "weekly" response (e.g. more days, extra fields).
 */
export async function getFeaturedWeeklyForecast(locationId: string): Promise<WeeklyForecast> {
  return mockDelay(getWeekly(locationId));
}

// --- Tier B: signature + placeholder only, no screen consumes these yet ---

const PLACEHOLDER_SUBSEASONAL: SubseasonalOutlook = {
  locationId: 'accra',
  issuedAt: new Date().toISOString(),
  weekRangeStart: new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString().slice(0, 10),
  weekRangeEnd: new Date(Date.now() + 28 * 24 * 60 * 60_000).toISOString().slice(0, 10),
  rainfallOutlook: { category: 'above-normal', probabilityPct: 55 },
  temperatureOutlook: { category: 'normal', probabilityPct: 45 },
  confidenceLevel: 'moderate',
  plainLanguageSummary:
    'Rainfall in weeks 2-4 is more likely than not to be above the long-term average, but this is a probability, not a certainty — conditions can still turn out drier than expected.',
  farmerActionCard: {
    headline: 'Plan with flexibility',
    actions: ['Keep planting windows flexible over the next month.', 'Monitor weekly bulletins rather than acting on this outlook alone.'],
  },
};

const PLACEHOLDER_SEASONAL: SeasonalOutlook = {
  regionId: 'northern',
  issuedAt: new Date().toISOString(),
  seasonLabel: '2026 Major Season',
  onset: { expectedWindowStart: '2026-04-10', expectedWindowEnd: '2026-04-25', probabilityPct: 60 },
  cessation: { expectedWindowStart: '2026-10-05', expectedWindowEnd: '2026-10-20', probabilityPct: 55 },
  rainfallProbability: { belowNormalPct: 25, normalPct: 40, aboveNormalPct: 35 },
  drySpellRisk: { category: 'moderate', description: 'A moderate chance of a dry spell during the mid-season period.' },
  temperatureOutlook: { category: 'above-normal', probabilityPct: 50 },
  confidenceLevel: 'moderate',
  plainLanguageSummary:
    'This is a probabilistic climate outlook for the whole season, not a weather forecast — treat it as a planning guide, and follow shorter-range forecasts for day-to-day decisions.',
  farmerActionCard: {
    headline: 'Plan the season with contingencies',
    actions: ['Prepare drought-tolerant seed varieties as a backup.', 'Review seasonal advisories before committing to a planting date.'],
  },
};

export async function getSubseasonalOutlook(locationId: string): Promise<SubseasonalOutlook> {
  return mockDelay({ ...PLACEHOLDER_SUBSEASONAL, locationId });
}

export async function getSeasonalOutlook(regionId: string): Promise<SeasonalOutlook> {
  return mockDelay({ ...PLACEHOLDER_SEASONAL, regionId });
}

export async function getForecastMapLayers(): Promise<ForecastMapLayer[]> {
  return mockDelay(MOCK_MAP_LAYERS);
}
