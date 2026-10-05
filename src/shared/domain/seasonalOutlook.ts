import type { ConfidenceLevel, TercileCategory, TercileProbabilities } from './subseasonalOutlook';

/**
 * The seasonal outlook: agro-climatic indices by region.
 *
 * `/api/outlook/seasonal` works these out from each ECMWF SEAS5 member's daily
 * rain, after scaling it to the local record, and compares them with the same
 * indices over ERA5 1995-2024:
 *
 * - **Seasons** (onset, cessation, early and late dry spells): Ghana's three
 *   rainy seasons. The northern season covers the five northern regions only,
 *   the two southern seasons the other eleven, so each season's map paints only
 *   its own half of the country.
 * - **Windows** (rainfall total, rainy days, temperature): the fixed three-month
 *   blocks MAM, MJJ, JAS and SON, for every region.
 *
 * SEAS5 reaches about seven months ahead. A season that ends beyond that has
 * `available: false`: the reading carries the normal and the month the forecast
 * will be ready, and the screen says "Normal, not a forecast".
 *
 * When a published seasonal forecast is in force (`source === 'gmet'`), its
 * readings fill `seasons` and `windows` and the model's own travel beside them
 * in `modelSeasons` and `modelWindows`.
 */
export type SeasonalSource = 'seas5' | 'gmet';
export type SeasonalView = 'probability' | 'deterministic';

export type SeasonKey = 'northern' | 'southern-major' | 'southern-minor';
export type WindowKey = 'MAM' | 'MJJ' | 'JAS' | 'SON';

export type SeasonVariableId = 'onset' | 'cessation' | 'earlyDrySpell' | 'lateDrySpell';
export type WindowVariableId = 'rainfallTotal' | 'rainyDays' | 'temperature';
export type SeasonalVariableId = SeasonVariableId | WindowVariableId;

/** One region's reading for one variable. */
export type SeasonalReading = {
  /** False when the season ends beyond the model's reach: only the normal is known. */
  available: boolean;
  /** "2027-02": the first monthly run that will cover it. Only when not available. */
  availableFrom?: string;
  /** The ensemble median: day of year for dates, days, mm or degrees otherwise. */
  value?: number;
  /** How the server writes `value`, e.g. "Week 3 of March" or "12 days". */
  display?: string | null;
  members?: number;
  /** The 1995-2024 median, in the same unit as `value`. */
  normal: number | null;
  normalDisplay: string | null;
  probabilities?: TercileProbabilities;
  category?: TercileCategory;
  confidence?: ConfidenceLevel;
  noSignal?: boolean;
  /** Rainfall total only: these months are the dry season here. */
  dryWindow?: boolean;
};

export type SeasonalCell = {
  id: string;
  region: string;
  lat: number;
  lng: number;
} & Partial<Record<SeasonalVariableId, SeasonalReading>>;

export type SeasonalBlock = {
  key: string;
  label: string;
  year: number;
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
  seasons: Partial<Record<SeasonKey, SeasonalBlock>>;
  windows: Partial<Record<WindowKey, SeasonalBlock>>;
  /** The model's own reading, alongside a published forecast. Empty otherwise. */
  modelSeasons: Partial<Record<SeasonKey, SeasonalBlock>>;
  modelWindows: Partial<Record<WindowKey, SeasonalBlock>>;
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
  /** Null when the reading is only a normal: there is no forecast to rate. */
  confidenceLevel: ConfidenceLevel | null;
  /** Never optional: a probabilistic outlook is never shown without its sentence. */
  plainLanguageSummary: string;
  /** What the model alone reads, when a published forecast is in force. */
  modelSummary: string | null;
  source: SeasonalSource;
  issuedBy: string | null;
  /** Every variable at once, when the reader chose All Variables. */
  summary?: SeasonalSummary | null;
};

/** One figure in the all-variables table: a forecast, or only the normal. */
export type SummaryValue = {
  text: string | null;
  /** True when the season is beyond the model's reach and this is the normal. */
  isNormal: boolean;
  /** "earlier than usual (60%)" for a forecast with a clear lean. */
  lean: string | null;
};

/** Every variable for one region: the season's four, then the windows' three. */
export type SeasonalSummary = {
  region: string;
  seasonLabel: string;
  seasonRows: { variable: SeasonVariableId; label: string; value: SummaryValue }[];
  windowRows: { variable: WindowVariableId; label: string; values: Record<WindowKey, SummaryValue> }[];
  /** True when any figure in the table is a normal, so the screen adds the key. */
  hasNormals: boolean;
};

export const SEASON_KEYS: SeasonKey[] = ['southern-major', 'southern-minor', 'northern'];
export const WINDOW_KEYS: WindowKey[] = ['MAM', 'MJJ', 'JAS', 'SON'];

/**
 * What the reader picks in the drawer. "All" is the default for both.
 *
 * All Seasons is each zone's main season on one map, the way national onset
 * maps are drawn: the Northern Single Season in the five northern regions and
 * the Southern Major Season in the other eleven. The minor season stays its own
 * choice, because the north has no second season to pair it with.
 *
 * All Variables maps Rainfall Total (a map can colour only one thing) and lists
 * every variable together in the region and town cards.
 */
export type SeasonChoice = 'all' | SeasonKey;
export type VariableChoice = 'all' | SeasonalVariableId;

export const ALL_SEASONS_LABEL = 'All Seasons';
export const ALL_VARIABLES_LABEL = 'All Variables';

/** The season a region's main rains fall in: what All Seasons shows there. */
export function mainSeasonOf(region: string): SeasonKey {
  return sectorOf(region) === 'north' ? 'northern' : 'southern-major';
}

export const SEASON_LABELS: Record<SeasonKey, string> = {
  northern: 'Northern Single Season',
  'southern-major': 'Southern Major Season',
  'southern-minor': 'Southern Minor Season',
};

export const WINDOW_LABELS: Record<WindowKey, string> = {
  MAM: 'March to May',
  MJJ: 'May to July',
  JAS: 'July to September',
  SON: 'September to November',
};

export const NORTHERN_REGIONS = ['Northern', 'Savannah', 'North East', 'Upper East', 'Upper West'];

type VariableInfo = {
  /** Exactly as the drawer lists it. */
  label: string;
  /** Lower case, for sentences: "the onset date". */
  noun: string;
  kind: 'season' | 'window';
  unit: string;
  /** What below / normal / above mean for this variable, in sentence words. */
  words: Record<TercileCategory, string>;
};

/** The seven variables, in the order the drawer lists them. */
export const SEASONAL_VARIABLES: SeasonalVariableId[] = [
  'onset',
  'earlyDrySpell',
  'lateDrySpell',
  'cessation',
  'rainfallTotal',
  'rainyDays',
  'temperature',
];

export const VARIABLE_INFO: Record<SeasonalVariableId, VariableInfo> = {
  onset: {
    label: 'Onset Date',
    noun: 'start of the rains',
    kind: 'season',
    unit: '',
    words: { below: 'earlier than usual', normal: 'around the usual time', above: 'later than usual' },
  },
  earlyDrySpell: {
    label: 'Early-Season Dry Spell',
    noun: 'longest dry spell early in the season',
    kind: 'season',
    unit: 'days',
    words: { below: 'shorter than usual', normal: 'about as long as usual', above: 'longer than usual' },
  },
  lateDrySpell: {
    label: 'Late-Season Dry Spell',
    noun: 'longest dry spell late in the season',
    kind: 'season',
    unit: 'days',
    words: { below: 'shorter than usual', normal: 'about as long as usual', above: 'longer than usual' },
  },
  cessation: {
    label: 'Cessation Date',
    noun: 'end of the rains',
    kind: 'season',
    unit: '',
    words: { below: 'earlier than usual', normal: 'around the usual time', above: 'later than usual' },
  },
  rainfallTotal: {
    label: 'Rainfall Total (mm)',
    noun: 'rainfall',
    kind: 'window',
    unit: 'mm',
    words: { below: 'less than usual', normal: 'about the usual amount', above: 'more than usual' },
  },
  rainyDays: {
    label: 'Number of Rainy Days (days)',
    noun: 'number of rainy days',
    kind: 'window',
    unit: 'days',
    words: { below: 'fewer than usual', normal: 'about the usual number', above: 'more than usual' },
  },
  temperature: {
    label: 'Temperature (°C)',
    noun: 'daytime temperature',
    kind: 'window',
    unit: '°C',
    words: { below: 'cooler than usual', normal: 'about usual', above: 'warmer than usual' },
  },
};

export const SEASON_VARIABLE_IDS: SeasonVariableId[] = ['onset', 'earlyDrySpell', 'lateDrySpell', 'cessation'];
export const WINDOW_VARIABLE_IDS: WindowVariableId[] = ['rainfallTotal', 'rainyDays', 'temperature'];

export function isSeasonVariable(variable: SeasonalVariableId): variable is SeasonVariableId {
  return VARIABLE_INFO[variable].kind === 'season';
}

export function sectorOf(region: string): 'north' | 'south' {
  const wanted = normaliseRegion(region);
  return NORTHERN_REGIONS.some((name) => normaliseRegion(name) === wanted) ? 'north' : 'south';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2027-02" -> "February 2027". */
export function formatYearMonth(value: string | undefined | null): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const month = MONTH_NAMES[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : null;
}

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
