import type { SpatialValueFormat } from '../domain/spatialOutlook';
import { formatDayOfYearAsWeekOfMonth } from './formatDayOfYear';

/**
 * The one place a spatial-outlook value becomes reader-facing text. The
 * legend and the map's tap-popup both go through this, so a cell can
 * never display a different string than the legend block it belongs to.
 *
 * `range` only affects plain numbers: wide ranges round to whole units,
 * narrow ones keep a decimal so adjacent legend breaks don't collapse
 * into identical labels.
 *
 * Temperature opts out of that rule. Its spread across Ghana is only a few
 * degrees, so the range heuristic would always keep a decimal -- but a tenth of
 * a degree is well inside the ensemble's own spread, so the extra digit implies
 * a precision the forecast does not have, and reads as clutter to a farmer who
 * thinks in whole degrees.
 */
export function formatSpatialValue(value: number, format: SpatialValueFormat, range: number): string {
  if (!Number.isFinite(value)) return '—';
  if (format === 'day-of-year') return formatDayOfYearAsWeekOfMonth(value);
  if (format === 'temperature') return String(Math.round(value));
  return range >= 12 ? String(Math.round(value)) : value.toFixed(1);
}
