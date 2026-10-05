import type { SeasonKey, SeasonalReading, SeasonalVariableId, WindowKey } from './seasonalOutlook';

/**
 * What a farmer can do this season, from `/api/outlook/seasonal/advice/{region}`.
 *
 * The backend turns each reading into one condition (early, late, long and so
 * on) and picks the advice for it from one reviewed table of rules
 * (`backend/app/seasonal_advice.py`). An administrator can publish their own
 * text over a rule, and then `source` is `'published'`.
 */
export type AdviceCondition =
  | 'early'
  | 'usual'
  | 'late'
  | 'long'
  | 'short'
  | 'more'
  | 'less'
  | 'fewer'
  | 'warmer'
  | 'cooler'
  | 'no_signal'
  | 'normal_only'
  | 'dry_season';

export type SeasonalAdviceItem = {
  variable: SeasonalVariableId;
  label: string;
  condition: AdviceCondition;
  title: string;
  summary: string;
  actions: string[];
  reading: Partial<SeasonalReading>;
  /** True when an administrator's text replaced the rule. */
  published?: boolean;
};

export type SeasonalAdvice = {
  region: string;
  season: { key: SeasonKey; label: string; year: number | null };
  window: { key: WindowKey; label: string; year: number | null };
  /** The one sentence to read if nothing else is read. */
  headline: string;
  /** All seven variables, in the drawer's order. */
  conditions: SeasonalAdviceItem[];
  /** "Not an official advisory": shown beside every list of actions. */
  note: string;
  source: 'rules' | 'published';
  issuedBy: string | null;
  issuedAt: string | null;
  outlookSource: 'seas5' | 'gmet' | null;
  outlookIssuedBy: string | null;
  runDate: string | null;
  unavailable: boolean;
};

/** Short names, for rows that share their width with a value. */
export const ADVICE_LABELS: Record<SeasonalVariableId, string> = {
  onset: 'Rains start',
  earlyDrySpell: 'Early dry spell',
  lateDrySpell: 'Late dry spell',
  cessation: 'Rains end',
  rainfallTotal: 'Rainfall',
  rainyDays: 'Rainy days',
  temperature: 'Temperature',
};

/** The three month windows that fall inside each season, for passing the
 * drawer's chosen window on only when it belongs to the season. */
export const SEASON_WINDOWS: Record<SeasonKey, WindowKey[]> = {
  'southern-major': ['MAM', 'MJJ'],
  'southern-minor': ['SON'],
  northern: ['MJJ', 'JAS'],
};

/** Seasons a region has, main season first. */
export function seasonsOf(sector: 'north' | 'south'): SeasonKey[] {
  return sector === 'north' ? ['northern'] : ['southern-major', 'southern-minor'];
}
