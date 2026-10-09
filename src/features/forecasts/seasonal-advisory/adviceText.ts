import type { AdviceCondition, SeasonalAdviceItem } from '../../../shared/domain/seasonalAdvice';

/** How a condition reads beside its figure: "Later than usual". */
const LEAN: Record<AdviceCondition, string> = {
  early: 'Earlier than usual',
  late: 'Later than usual',
  long: 'Longer than usual',
  short: 'Shorter than usual',
  more: 'More than usual',
  less: 'Less than usual',
  fewer: 'Fewer than usual',
  warmer: 'Warmer than usual',
  cooler: 'Cooler than usual',
  usual: 'About usual',
  normal_only: 'Usual figure',
  no_signal: 'No clear sign',
  dry_season: 'Dry season',
};

export function leanOf(item: Pick<SeasonalAdviceItem, 'condition'>): string {
  return LEAN[item.condition] ?? LEAN.no_signal;
}

/** The figure to show: the forecast, or the usual figure while there is none. */
export function figureOf(item: Pick<SeasonalAdviceItem, 'reading'>): string {
  return item.reading.display ?? item.reading.normalDisplay ?? 'No data';
}

/** True when the figure is a forecast rather than the usual. */
export function isForecast(item: Pick<SeasonalAdviceItem, 'reading'>): boolean {
  return Boolean(item.reading.available && item.reading.display);
}

/**
 * Actions that appear under more than one condition, pulled out to be said
 * once ("Check back from December 2026 for the forecast." seven times over is
 * noise, not advice).
 */
export function splitSharedActions(conditions: SeasonalAdviceItem[]): {
  shared: string[];
  byVariable: Map<SeasonalAdviceItem['variable'], string[]>;
} {
  const counts = new Map<string, number>();
  for (const item of conditions) {
    for (const action of new Set(item.actions)) counts.set(action, (counts.get(action) ?? 0) + 1);
  }
  const shared = [...counts].filter(([, count]) => count > 1).map(([action]) => action);
  const byVariable = new Map(conditions.map((item) => [item.variable, item.actions.filter((action) => !shared.includes(action))]));
  return { shared, byVariable };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-05" -> "5 Oct 2026", parsed by hand so no time zone can shift it. */
export function formatDay(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : null;
}
