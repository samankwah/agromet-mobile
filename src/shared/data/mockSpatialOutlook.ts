import type {
  SpatialForecastView,
  SpatialGeography,
  SpatialGridCell,
  SpatialOutlookVariable,
  SpatialPeriod,
} from '../domain/spatialOutlook';
import { GHANA_BOUNDARIES } from './ghanaBoundaries';

/**
 * The agro-characteristics a seasonal forecast is published against —
 * the decisions a farmer actually plans around (when do the rains start,
 * how long is the growing window, how likely is a damaging dry spell),
 * not just raw meteorological variables.
 *
 * `periodKind` splits them by what they're scoped to: season-defining
 * characteristics are selected by Season (Ghana's north is unimodal, its
 * south bimodal), while accumulations and averages are reported over
 * standard trimesters and selected by Sub-season.
 */
export const SPATIAL_VARIABLES: SpatialOutlookVariable[] = [
  // Season-scoped — meaningless without knowing which rainy season.
  { id: 'onset', label: 'Onset Date', unit: 'week of month', valueFormat: 'day-of-year', periodKind: 'season' },
  { id: 'cessation', label: 'Cessation Date', unit: 'week of month', valueFormat: 'day-of-year', periodKind: 'season' },
  { id: 'early-dry-spell', label: 'Early Dry Spell', unit: 'days', valueFormat: 'number', periodKind: 'season' },
  { id: 'late-dry-spell', label: 'Late Dry Spell', unit: 'days', valueFormat: 'number', periodKind: 'season' },
  // Length of season is literally cessation minus onset, so it is scoped
  // the same way even though it reads as a duration.
  { id: 'season-length', label: 'Length of Growing Season', unit: 'days', valueFormat: 'number', periodKind: 'season' },
  // Sub-season-scoped — accumulations/averages over a trimester.
  { id: 'rainfall-total', label: 'Rainfall Total (mm)', unit: 'mm', valueFormat: 'number', periodKind: 'sub-season' },
  { id: 'rain-days', label: 'Number of Rain Days', unit: 'days', valueFormat: 'number', periodKind: 'sub-season' },
  { id: 'temperature-mean', label: 'Mean Temperature (°C)', unit: '°C', valueFormat: 'number', periodKind: 'sub-season' },
];

/**
 * Ghana's rainfall regimes. The north gets a single rainy season; the
 * south gets two, separated by a short dry break in August. Onset and
 * cessation land in genuinely different parts of the year for each, which
 * is exactly why they can't share one selector.
 */
export const SPATIAL_SEASONS: SpatialPeriod[] = [
  { id: 'northern', label: 'Northern (single season)' },
  { id: 'southern-major', label: 'Southern — Major Season' },
  { id: 'southern-minor', label: 'Southern — Minor Season' },
];

/** Standard meteorological trimester codes, matching the reference
 * screenshots' "MJJ (mm)" label. */
export const SPATIAL_SUB_SEASONS: SpatialPeriod[] = [
  { id: 'mjj', label: 'MJJ (May–Jul)' },
  { id: 'jas', label: 'JAS (Jul–Sep)' },
  { id: 'aso', label: 'ASO (Aug–Oct)' },
];

/** The option list a variable draws its period from. */
export function periodOptionsFor(variable: SpatialOutlookVariable): SpatialPeriod[] {
  return variable.periodKind === 'season' ? SPATIAL_SEASONS : SPATIAL_SUB_SEASONS;
}

/**
 * Onset/cessation ranges differ per season — northern rains arrive around
 * May and end in October; the southern major season runs March–July and
 * the minor season September–November. Values are day-of-year, rendered
 * as a week of month for the reader.
 */
const SEASON_DATE_RANGES: Record<string, Record<string, { min: number; max: number }>> = {
  // Dry-spell lengths are season-scoped too: a break within the long
  // northern season is a different risk from one inside the short
  // southern minor season, where the same number of dry days consumes a
  // far larger share of the growing window.
  northern: {
    onset: { min: 115, max: 152 },
    cessation: { min: 274, max: 310 },
    'season-length': { min: 130, max: 190 },
    'early-dry-spell': { min: 5, max: 21 },
    'late-dry-spell': { min: 6, max: 24 },
  },
  'southern-major': {
    onset: { min: 60, max: 95 },
    cessation: { min: 175, max: 205 },
    'season-length': { min: 95, max: 140 },
    'early-dry-spell': { min: 4, max: 16 },
    'late-dry-spell': { min: 5, max: 18 },
  },
  'southern-minor': {
    onset: { min: 240, max: 270 },
    cessation: { min: 300, max: 335 },
    'season-length': { min: 45, max: 90 },
    'early-dry-spell': { min: 3, max: 12 },
    'late-dry-spell': { min: 4, max: 14 },
  },
};

/** Ranges for sub-season-scoped variables, which don't vary by period. */
const VARIABLE_RANGES: Record<string, { min: number; max: number }> = {
  'rainfall-total': { min: 349, max: 906 },
  'rain-days': { min: 35, max: 110 },
  'temperature-mean': { min: 24, max: 32 },
};

function rangeFor(variableId: string, periodId: string): { min: number; max: number } {
  return SEASON_DATE_RANGES[periodId]?.[variableId] ?? VARIABLE_RANGES[variableId] ?? VARIABLE_RANGES['rainfall-total'];
}

/** Characteristics where a *higher* number is worse for farming (a later
 * onset, a longer dry spell). The choropleth inverts these so the colour
 * scale always reads the same way — brighter = more favourable — instead
 * of silently flipping meaning between variables. */
const INVERTED_VARIABLES = new Set(['onset', 'early-dry-spell', 'late-dry-spell']);

/** A small deterministic hash so the same filter combination always
 * produces the same-looking mock grid (not a fresh random pattern on
 * every re-render), without pulling in a PRNG library. */
function hashSeed(...parts: (string | number)[]): number {
  const input = parts.join('|');
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generates a plausible-looking (not real) grid over the baked Ghana grid
 * cells — biased higher in the south/south-west the way Ghana's actual
 * rainfall pattern runs, so the shell doesn't look arbitrary while real
 * gridded data isn't available yet. `deterministic` view is smoother;
 * `probability` view returns tercile indices instead of a quantity.
 */
export function buildMockSpatialCells(
  variableId: string,
  periodId: string,
  forecastView: SpatialForecastView,
  geography: SpatialGeography,
): SpatialGridCell[] {
  const range = rangeFor(variableId, periodId);
  const { minLat, maxLat, minLng, maxLng } = GHANA_BOUNDARIES.bounds;
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;
  const jitterScale = forecastView === 'probability' ? 0.18 : 0.06;

  return GHANA_BOUNDARIES.grid.map((cell) => {
    // South (low lat) and west (low lng) run higher — a plausible rainfall
    // gradient shape, not a claim of real accuracy.
    const southBias = 1 - (cell.lat - minLat) / latSpan;
    const westBias = 1 - (cell.lng - minLng) / lngSpan;
    const base = southBias * 0.65 + westBias * 0.35;

    const jitter = (pseudoRandom(hashSeed(cell.id, variableId, periodId, forecastView)) - 0.5) * jitterScale;
    let normalized = Math.min(Math.max(base + jitter, 0), 1);
    if (INVERTED_VARIABLES.has(variableId)) normalized = 1 - normalized;

    // Probability view is categorical: a seasonal probabilistic forecast
    // is expressed as terciles (below/normal/above), not as a number. The
    // value becomes the tercile index that TERCILE_CATEGORIES is keyed by.
    const value =
      forecastView === 'probability'
        ? Math.min(2, Math.floor(normalized * 3))
        : Math.round(range.min + normalized * (range.max - range.min));

    return {
      id: cell.id,
      lat: cell.lat,
      lng: cell.lng,
      regionName: cell.regionName,
      districtName: cell.districtName,
      value,
    };
  });
}
