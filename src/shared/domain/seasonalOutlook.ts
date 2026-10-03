import type { ConfidenceLevel, SubseasonalVariable, SubseasonalVariableId } from './subseasonalOutlook';

/**
 * The seasonal outlook: three overlapping three-month windows, by region.
 *
 * `/api/outlook/seasonal` serves ECMWF SEAS5 (51 members) reduced to one reading
 * per region per window, adjusted to local climate against an ERA5 1995-2024
 * baseline. Region is the honest resolution: a seasonal model run at roughly a
 * degree has nothing to say about one district that it does not say about the
 * next, so the payload carries no district geography at all.
 *
 * When a published seasonal forecast is in force (`source === 'gmet'`), its
 * readings fill `windows` and the model's own reading travels beside it in
 * `modelWindows`, so the app can say what the model alone reads without ever
 * passing the published figures off as its own.
 *
 * Same rule as the subseasonal card: the town outlook below carries a
 * non-optional `plainLanguageSummary`, because a probabilistic outlook must
 * never be rendered without the sentence that says it is one.
 */
export type SeasonalSource = 'seas5' | 'gmet';
export type SeasonalVariableId = SubseasonalVariableId;
export type SeasonalView = 'probability' | 'average';

/**
 * One region's reading for one variable over one window.
 *
 * The subseasonal shape plus two flags, so `bandFor` and the palettes apply
 * unchanged. `value` is a window rainfall total in mm, or the mean daily maximum
 * in degrees.
 */
export type SeasonalVariable = SubseasonalVariable & {
  /** True when `value` has been adjusted against the local record. */
  biasCorrected?: boolean;
  /** Rainfall only: the window falls in this region's dry season, so a tercile
   * split of near-zero totals would be noise. The map draws it as no signal and
   * the card says it is the dry season, never that rain is forecast. */
  dryWindow?: boolean;
};

export type SeasonalCell = {
  id: string;
  region: string;
  lat: number;
  lng: number;
  rainfall: SeasonalVariable | null;
  temperature: SeasonalVariable | null;
};

/** One three-month window, e.g. "Nov to Jan". */
export type SeasonalWindow = {
  key: string;
  startMonth: number;
  label: string;
  start: string;
  end: string;
  cells: SeasonalCell[];
};

export type SeasonalSourceRef = {
  id: string;
  label: string;
  detail: string;
  url: string;
};

export type SeasonalOutlookSet = {
  source: SeasonalSource;
  /** Who published the forecast in force, when it is not the model. */
  issuedBy: string | null;
  issuedAt: string | null;
  runDate: string | null;
  validFrom: string | null;
  validTo: string | null;
  pdfUrl: string | null;
  windows: SeasonalWindow[];
  /** The model's own reading, alongside a published forecast. Empty otherwise. */
  modelWindows: SeasonalWindow[];
  unavailable: boolean;
  model: string;
  baseline: string | null;
  stale: boolean;
  hasClimatology: boolean;
  sources: SeasonalSourceRef[];
  error: string | null;
  /** The server is building the outlook right now; the screen waits and polls. */
  computing: boolean;
  /** The emptiness is a failed upstream fetch, which is worth retrying now. */
  fetchFailed: boolean;
};

/** The reader's own town, as the card in the drawer shows it. */
export type SeasonalOutlook = {
  locationId: string;
  townName: string;
  region: string;
  windowKey: string;
  windowLabel: string;
  confidenceLevel: ConfidenceLevel;
  /** The rainfall sentence. Never optional, see the note at the top. */
  plainLanguageSummary: string;
  temperatureSummary: string | null;
  /** What the model alone reads, when a published forecast is in force. */
  modelSummary: string | null;
  source: SeasonalSource;
  issuedBy: string | null;
};

/**
 * One spelling for a region name, whatever wrote it.
 *
 * The backend, the boundary build and the town list all say "Bono East" today,
 * but one of them saying "Bono East Region" or "bono east" tomorrow would
 * silently leave a region unpainted, which on a map looks like a finding.
 */
export function normaliseRegion(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+region$/, '')
    .replace(/\s+/g, ' ');
}
