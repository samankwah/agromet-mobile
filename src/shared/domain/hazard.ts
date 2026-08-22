import type { HazardBand } from './hazardBand';

/**
 * Flood and drought conditions, as published by `/api/hazards/*`.
 *
 * Unlike most domain types in this app, these mirror a real backend payload
 * rather than being designed here first — the indices are computed server-side
 * (`backend/app/hazards.py`) from ERA5 rainfall, GloFAS river discharge and a
 * thirty-year climatology, and the web app renders the same shapes. Keeping the
 * field names identical to the API means the service layer stays a pass-through
 * and there is one less place for the two clients to drift apart.
 */

export type HazardKind = 'flood' | 'drought';

/**
 * One contributing measurement behind a score.
 *
 * `gloss` is a plain-English reading of the value ("Higher than 89% of daily
 * flows on this reach since 1995"). It explains the evidence — it is not a
 * statement of expected impact, and must not be presented as one.
 */
export type HazardDriver = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  score: number;
  weight: number;
  percentile: number | null;
  gloss: string;
};

export type HazardBlock = {
  score: number;
  band: HazardBand;
  drivers: HazardDriver[];
  /** Short, action-oriented guidance. Empty when the band is normal — the
   * backend deliberately stays silent rather than always having advice. */
  advisories: string[];
  /** True when a published GMet bulletin supersedes the computed reading. */
  overridden: boolean;
  source: string;
  headline?: string | null;
  issuedBy?: string | null;
  issuedAt?: string | null;
  effectiveTo?: string | null;
  /** The computed reading the override replaced, kept so an override is never
   * silent about what the model independently said. */
  computed?: { score: number; band: HazardBand } | null;
  /** Drought only. Null when a 90-day dry-season total is too close to zero for
   * the index to mean anything. */
  spi?: number | null;
  spiClass?: string;
  precip90dMm?: number | null;
  precip90dNormalMm?: number | null;
};

/** Daily series for the charts. Only present on the single-region endpoint. */
export type HazardSeries = {
  observed: {
    source: string;
    dates: string[];
    precipitation: (number | null)[];
    normalMm: number | null;
  };
  forecast: {
    source: string;
    dates: string[];
    precipitation: (number | null)[];
    et0: (number | null)[];
  };
  soilMoisture: { dates: string[]; values: (number | null)[] };
};

export type HazardDischarge = {
  dates?: string[];
  values?: (number | null)[];
  forecastFrom?: string | null;
  median: number | null;
  p90: number | null;
  p95: number | null;
};

export type HazardRegion = {
  region: string;
  agroZone: string;
  centroid: [number, number];
  riverPoint: [number, number];
  /** False when no major monitored river reach falls in this region, so flood
   * risk is scored from rainfall alone. */
  riverine: boolean;
  flood: HazardBlock;
  drought: HazardBlock;
  dominant: HazardKind;
  series?: HazardSeries;
  discharge?: HazardDischarge;
};

export type HazardTopRegion = {
  region: string;
  score: number;
  band: HazardBand;
  overridden: boolean;
};

export type HazardNational = {
  regionCount: number;
  floodBands: Record<string, number>;
  droughtBands: Record<string, number>;
  floodElevated: number;
  droughtElevated: number;
  highestFlood: HazardTopRegion | null;
  highestDrought: HazardTopRegion | null;
  overriddenCount: number;
};

export type HazardSource = {
  id: string;
  label: string;
  detail?: string;
  url?: string;
};

export type HazardSummary = {
  regions: HazardRegion[];
  national: HazardNational | null;
  /** True when the backend has no usable reading at all. Note this arrives on a
   * 200 response, not an error — see useHazards. */
  unavailable: boolean;
  computedAt: string | null;
  stale: boolean;
  baseline: string | null;
  dischargeBaseline?: string | null;
  hasClimatology: boolean;
  sources: HazardSource[];
  error?: string | null;
};

export type HazardMethodology = {
  baseline: string;
  dischargeBaseline: string;
  bands: { band: HazardBand; minScore: number }[];
  floodWeights: Record<string, number>;
  droughtWeights: Record<string, number>;
  sources: HazardSource[];
  /** What these figures cannot tell you. Served from the backend so the caveats
   * can never drift away from the maths that needs them. */
  limits: string[];
};
