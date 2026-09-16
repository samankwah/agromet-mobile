/**
 * The weeks 2-to-4 outlook: a real ensemble forecast on the model's own grid.
 *
 * `/api/outlook/subseasonal` serves NOAA GEFS's 0.5 degree field over Ghana --
 * 165 cells, 31 members each -- with two readings per cell:
 *
 *   - **probabilistic**, the split across the thirds of what that cell normally
 *     gets at this time of year, from an ERA5 1995-2024 baseline; and
 *   - **deterministic**, the ensemble mean of the window.
 *
 * The deterministic reading needs no baseline, which is why `probabilities` is
 * optional and `value` is not: a cell whose climatology has not been baked still
 * draws on the deterministic map rather than disappearing.
 *
 * Admin boundaries are the client's business. The backend returns a field; this
 * app already ships Ghana's regions and districts and overlays them itself.
 *
 * `plainLanguageSummary` on the card below stays non-optional: this is a
 * probabilistic outlook, not a weather forecast, and the type should make it
 * impossible to render one without the uncertainty explanation farmers need in
 * order not to mistake it for a deterministic one.
 */
export type OutlookCategory = 'below-normal' | 'normal' | 'above-normal';
export type ConfidenceLevel = 'low' | 'moderate' | 'high';

/** The API's own vocabulary, before it is widened to `OutlookCategory`. */
export type TercileCategory = 'below' | 'normal' | 'above';

/** Which of the two things the map is drawing. Mirrors the Seasonal segment's
 * `SpatialForecastView`, deliberately: the two maps should feel like one idea. */
export type SubseasonalView = 'probability' | 'deterministic';
export type SubseasonalVariableId = 'rainfall' | 'temperature';

/** How the ensemble split across the three climatological thirds. Always sums to 1. */
export type TercileProbabilities = {
  below: number;
  normal: number;
  above: number;
};

/** The window day by day: the ensemble mean inside a 10th-to-90th band. */
export type SubseasonalSeries = {
  mean: number[];
  low: number[];
  high: number[];
};

export type SubseasonalVariable = {
  /** The deterministic reading: a rainfall total in mm, or a mean daily maximum
   * in degrees. Present even where the baseline is missing. */
  value: number;
  /** How many ensemble members carried a usable value. */
  members: number;
  /** The climatological average for this window, for context. */
  normal: number | null;
  /** Absent when this cell has no baked baseline. Never rendered as a flat
   * 33/33/33, which on a map is indistinguishable from a real forecast of no
   * signal. */
  probabilities?: TercileProbabilities;
  category?: TercileCategory;
  confidence?: ConfidenceLevel;
  /** True when the baseline's two boundaries coincide, which happens in a dry
   * season that is mostly zeros. The split is arithmetically valid and carries
   * no information, so the UI says "no signal" rather than "100% normal". */
  noSignal?: boolean;
};

/** One 0.5 degree cell of the model's field. */
export type SubseasonalCell = {
  id: string;
  lat: number;
  lng: number;
  rainfall: SubseasonalVariable | null;
  temperature: SubseasonalVariable | null;
};

export type SubseasonalOutlookSet = {
  cells: SubseasonalCell[];
  /** True when nothing could be computed at all. */
  unavailable: boolean;
  /**
   * True when the emptiness is a failed fetch rather than work not yet done.
   * Both arrive as `unavailable`, and they need opposite copy: one is worth
   * retrying now, the other is not.
   */
  fetchFailed: boolean;
  /**
   * True while the server is fetching the field right now. The empty response is
   * then a "not yet" that fixes itself, so the screen waits rather than offering
   * a retry for work already under way.
   */
  computing: boolean;
  issuedAt: string | null;
  windowStart: string;
  windowEnd: string;
  model: string;
  baseline: string | null;
  stale: boolean;
};

/** One place's outlook, as the card and the detail drawer consume it. */
export type SubseasonalOutlook = {
  locationId: string;
  region: string;
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

const CATEGORY_LABELS: Record<TercileCategory, OutlookCategory> = {
  below: 'below-normal',
  normal: 'normal',
  above: 'above-normal',
};

export function widenCategory(category: TercileCategory): OutlookCategory {
  return CATEGORY_LABELS[category];
}

/** The winning share, as a percentage. What the card puts beside the category. */
export function leadingProbabilityPct(variable: SubseasonalVariable): number {
  if (!variable.probabilities || !variable.category) return 0;
  return Math.round(variable.probabilities[variable.category] * 100);
}

/** The unit a deterministic reading is quoted in. */
export function unitFor(variable: SubseasonalVariableId): string {
  return variable === 'rainfall' ? 'mm' : '°C';
}
