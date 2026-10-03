import { HOME_LOCATIONS } from '../data/mockWeather';
import type {
  SeasonChoice,
  SeasonKey,
  SeasonalBlock,
  SeasonalSummary,
  SummaryValue,
  VariableChoice,
  SeasonalCell,
  SeasonalOutlook,
  SeasonalOutlookSet,
  SeasonalReading,
  SeasonalSourceRef,
  SeasonalVariableId,
  WindowKey,
} from '../domain/seasonalOutlook';
import {
  ALL_SEASONS_LABEL,
  SEASON_LABELS,
  SEASON_VARIABLE_IDS,
  VARIABLE_INFO,
  WINDOW_KEYS,
  WINDOW_VARIABLE_IDS,
  formatYearMonth,
  isSeasonVariable,
  mainSeasonOf,
  normaliseRegion,
  sectorOf,
} from '../domain/seasonalOutlook';
import { getJson } from './http';
import { ServiceError } from './mockDelay';

/**
 * The seasonal outlook, from `/api/outlook/seasonal`.
 *
 * One fetch serves both consumers: the map wants every region in the chosen
 * season or window, the town card wants one region of it, and both are slices
 * of the same payload.
 */

type Blocks<K extends string> = Partial<Record<K, SeasonalBlock>>;

type ApiPayload = {
  source?: 'seas5' | 'gmet';
  issuedBy?: string | null;
  issuedAt?: string | null;
  runDate?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  pdfUrl?: string | null;
  seasons?: Blocks<SeasonKey> | unknown[];
  windows?: Blocks<WindowKey> | unknown[];
  modelSeasons?: Blocks<SeasonKey> | unknown[];
  modelWindows?: Blocks<WindowKey> | unknown[];
  unavailable?: boolean;
  model?: string;
  baseline?: string | null;
  stale?: boolean;
  hasClimatology?: boolean;
  sources?: SeasonalSourceRef[];
  error?: string | null;
  computing?: boolean;
  fetchFailed?: boolean;
};

/** A keyed object of blocks, or nothing. An older server sent a list here, which
 * this version cannot read, so it is treated as no outlook rather than a crash. */
function blocks<K extends string>(value: Blocks<K> | unknown[] | undefined): Blocks<K> {
  return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
}

function hasCells(entries: Blocks<string>): boolean {
  return Object.values(entries).some((block) => (block?.cells?.length ?? 0) > 0);
}

export async function getSeasonalOutlookSet(): Promise<SeasonalOutlookSet> {
  const payload = await getJson<ApiPayload>('/api/outlook/seasonal');
  const seasons = blocks<SeasonKey>(payload.seasons);
  const windows = blocks<WindowKey>(payload.windows);

  return {
    source: payload.source === 'gmet' ? 'gmet' : 'seas5',
    issuedBy: payload.issuedBy ?? null,
    issuedAt: payload.issuedAt ?? null,
    runDate: payload.runDate ?? null,
    validFrom: payload.validFrom ?? null,
    validTo: payload.validTo ?? null,
    pdfUrl: payload.pdfUrl ?? null,
    seasons,
    windows,
    modelSeasons: blocks<SeasonKey>(payload.modelSeasons),
    modelWindows: blocks<WindowKey>(payload.modelWindows),
    unavailable: Boolean(payload.unavailable) || (!hasCells(seasons) && !hasCells(windows)),
    model: payload.model ?? 'ECMWF SEAS5',
    baseline: payload.baseline ?? null,
    stale: Boolean(payload.stale),
    hasClimatology: Boolean(payload.hasClimatology),
    sources: payload.sources ?? [],
    error: payload.error ?? null,
    computing: Boolean(payload.computing),
    fetchFailed: Boolean(payload.fetchFailed),
  };
}

/**
 * The season or window a variable is read over.
 *
 * All Seasons joins the two main seasons into one block: the northern season's
 * five regions and the southern major season's eleven, so the map covers the
 * whole country without any region appearing twice.
 */
export function pickBlock(
  set: Pick<SeasonalOutlookSet, 'seasons' | 'windows'>,
  variable: SeasonalVariableId,
  season: SeasonChoice,
  windowKey: WindowKey,
): SeasonalBlock | undefined {
  if (!isSeasonVariable(variable)) return set.windows[windowKey];
  if (season !== 'all') return set.seasons[season];
  const north = set.seasons.northern;
  const south = set.seasons['southern-major'];
  if (!north && !south) return undefined;
  return {
    key: 'all',
    label: ALL_SEASONS_LABEL,
    year: Math.min(north?.year ?? Infinity, south?.year ?? Infinity),
    cells: [...(north?.cells ?? []), ...(south?.cells ?? [])],
  };
}

/** A region's cell in a block, matched on the normalised name. */
export function regionCell(block: SeasonalBlock | undefined, region: string | null | undefined): SeasonalCell | undefined {
  if (!block || !region) return undefined;
  const wanted = normaliseRegion(region);
  return block.cells.find((cell) => normaliseRegion(cell.region) === wanted);
}

/**
 * When every region's reading is only a normal, the month the forecast will be
 * ready ("February 2027"); null when the block holds a forecast.
 *
 * All Seasons can mix two seasons that become ready in different months, so
 * then each half of the country gets its own month.
 */
export function readyFrom(block: SeasonalBlock | undefined, variable: SeasonalVariableId): string | null {
  const cells = (block?.cells ?? []).filter((cell) => Boolean(cell[variable]));
  if (cells.length === 0 || cells.some((cell) => cell[variable]!.available)) return null;

  const bySector = new Map<'north' | 'south', string>();
  for (const cell of cells) {
    const month = cell[variable]!.availableFrom;
    if (month && !bySector.has(sectorOf(cell.region))) bySector.set(sectorOf(cell.region), month);
  }
  const months = [...new Set(bySector.values())];
  if (months.length <= 1) return formatYearMonth(months[0]) ?? 'a later month';
  return `${formatYearMonth(bySector.get('south'))} in the south and ${formatYearMonth(bySector.get('north'))} in the north`;
}

/** The share of the winning third, as a whole percent. */
export function leadingPct(reading: SeasonalReading): number {
  if (!reading.probabilities || !reading.category) return 0;
  return Math.round(reading.probabilities[reading.category] * 100);
}

function noClearSignal(reading: SeasonalReading): boolean {
  return Boolean(reading.noSignal) || reading.confidence === 'low';
}

/** "Week 3 of March" for dates, "12 days" or "340 mm" otherwise. */
export function readingText(reading: SeasonalReading, which: 'value' | 'normal'): string | null {
  return which === 'value' ? (reading.display ?? null) : (reading.normalDisplay ?? null);
}

/**
 * The sentence for one region's reading, written from the actual split.
 *
 * Plain words for a farmer reading in a second language: a chance, a
 * direction, when or how much, and the reminder that it is a chance.
 */
export function summariseReading(
  reading: SeasonalReading | undefined,
  variable: SeasonalVariableId,
  region: string,
  label: string,
): string {
  const info = VARIABLE_INFO[variable];
  // "the Southern Major Season", but plain "March to May".
  const span = info.kind === 'season' ? `the ${label}` : label;
  if (!reading) return `There is no outlook for the ${info.noun} in ${region} for ${span}.`;

  const normal = readingText(reading, 'normal');
  if (!reading.available) {
    const ready = formatYearMonth(reading.availableFrom) ?? 'a later month';
    const usual = normal ? ` Normally the ${info.noun} in ${region} is ${usualPhrase(variable, normal)}.` : '';
    return `The forecast for ${span} will be ready from ${ready}.${usual}`;
  }

  if (variable === 'rainfallTotal' && reading.dryWindow) {
    return `This is the dry season in ${region}. Little rain falls in ${label}, so there is no rainfall outlook for these months.`;
  }

  const value = readingText(reading, 'value');
  if (!reading.probabilities || !reading.category) {
    return value ? `The ${info.noun} in ${region} should be ${usualPhrase(variable, value)}.` : `There is no outlook for ${region} yet.`;
  }

  if (noClearSignal(reading)) {
    return `The forecasts for ${region} do not agree, so plan for a normal ${info.noun}${normal ? `, ${usualPhrase(variable, normal)}` : ''}.`;
  }

  const around = value ? `, ${usualPhrase(variable, value)}` : '';
  return `${leadingPct(reading)}% chance the ${info.noun} in ${region} is ${info.words[reading.category]}${around}. This is a probability, not a certainty.`;
}

/** "around Week 3 of March" for dates, "about 12 days" otherwise. */
function usualPhrase(variable: SeasonalVariableId, text: string): string {
  if (variable === 'onset' || variable === 'cessation') {
    return text.startsWith('Week') ? `around ${text}` : text.charAt(0).toLowerCase() + text.slice(1);
  }
  return `about ${text}`;
}

/** A short phrase for the "the model alone reads" line. */
export function leanPhrase(reading: SeasonalReading | undefined, variable: SeasonalVariableId): string | null {
  if (!reading || !reading.available) return null;
  if (reading.dryWindow) return 'dry season';
  if (!reading.probabilities || !reading.category) return null;
  if (noClearSignal(reading)) return 'no clear signal';
  return `${VARIABLE_INFO[variable].words[reading.category]} (${leadingPct(reading)}%)`;
}

/**
 * The reader's own town card, from a set already in hand.
 *
 * Throws rather than falling back to a national figure: an average over a
 * country with two rainfall regimes would tell everybody "normal".
 */
export function buildSeasonalOutlook(
  set: SeasonalOutlookSet,
  locationId: string,
  variableChoice: VariableChoice,
  seasonChoice: SeasonChoice,
  windowKey: WindowKey,
): SeasonalOutlook {
  if (set.unavailable) {
    // `computing` first: a refresh already running is the one case where the
    // reader has nothing to do, so it must not read as a failure even when the
    // attempt before it failed. "being prepared" is also what the poll keys on.
    throw new ServiceError(
      set.computing
        ? 'The seasonal outlook is being prepared. It will be ready in a moment.'
        : set.fetchFailed
          ? 'The weather service did not answer. Try again in a moment.'
          : 'No seasonal outlook has been computed yet.',
    );
  }

  const place = HOME_LOCATIONS.find((entry) => entry.id === locationId);
  if (!place) throw new ServiceError(`No seasonal outlook available for "${locationId}".`);

  // All Variables leads with the rainfall total. All Seasons means the town's own main
  // season, so the sentence names a real season ("the Southern Major Season").
  const variable: SeasonalVariableId = variableChoice === 'all' ? 'rainfallTotal' : variableChoice;
  const seasonKey: SeasonKey = seasonChoice === 'all' ? mainSeasonOf(place.region) : seasonChoice;
  const summary = variableChoice === 'all' ? buildSummary(set, place.region, seasonKey) : null;

  const block = pickBlock(set, variable, seasonKey, windowKey);
  const label = block?.label ?? (isSeasonVariable(variable) ? SEASON_LABELS[seasonKey] : windowKey);

  if (isSeasonVariable(variable) && (seasonKey === 'northern') !== (sectorOf(place.region) === 'north')) {
    const other = sectorOf(place.region) === 'north' ? 'the Northern Single Season' : 'a southern season';
    return {
      locationId,
      townName: place.name,
      region: place.region,
      confidenceLevel: null,
      plainLanguageSummary: `${place.region} does not have the ${label}. Choose ${other} to see ${place.name}.`,
      modelSummary: null,
      source: set.source,
      issuedBy: set.issuedBy,
      summary: null,
    };
  }

  const cell = regionCell(block, place.region);
  const reading = cell?.[variable];
  if (!cell || !reading) throw new ServiceError(`No seasonal outlook available for ${place.region}.`);

  // Only the same season or window counts: no fallback to the nearest one.
  const modelBlock =
    set.source === 'gmet' ? pickBlock({ seasons: set.modelSeasons, windows: set.modelWindows }, variable, seasonKey, windowKey) : undefined;
  const modelLean = leanPhrase(regionCell(modelBlock, place.region)?.[variable], variable);

  return {
    locationId,
    townName: place.name,
    region: cell.region,
    confidenceLevel: reading.available && reading.probabilities && !reading.dryWindow ? (reading.confidence ?? 'low') : null,
    plainLanguageSummary: summariseReading(reading, variable, cell.region, label),
    modelSummary: modelLean ? `The model alone reads: ${modelLean}.` : null,
    source: set.source,
    issuedBy: set.issuedBy,
    summary,
  };
}

function summaryValue(reading: SeasonalReading | undefined, variable: SeasonalVariableId): SummaryValue {
  if (!reading) return { text: null, isNormal: false, lean: null };
  if (!reading.available) return { text: reading.normalDisplay ?? null, isNormal: true, lean: null };
  return { text: reading.display ?? null, isNormal: false, lean: leanPhrase(reading, variable) };
}

/**
 * Every variable for one region, for the All Variables view: the season's four
 * indices for `seasonKey`, then rainfall total, rainy days and temperature for
 * each of MAM, MJJ, JAS and SON.
 */
export function buildSummary(set: Pick<SeasonalOutlookSet, 'seasons' | 'windows'>, region: string, seasonKey: SeasonKey): SeasonalSummary {
  const seasonCell = regionCell(set.seasons[seasonKey], region);
  const seasonRows = SEASON_VARIABLE_IDS.map((variable) => ({
    variable,
    label: VARIABLE_INFO[variable].label,
    value: summaryValue(seasonCell?.[variable], variable),
  }));
  const windowRows = WINDOW_VARIABLE_IDS.map((variable) => ({
    variable,
    label: VARIABLE_INFO[variable].label,
    values: Object.fromEntries(
      WINDOW_KEYS.map((key) => [key, summaryValue(regionCell(set.windows[key], region)?.[variable], variable)]),
    ) as Record<WindowKey, SummaryValue>,
  }));
  const hasNormals =
    seasonRows.some((row) => row.value.isNormal) || windowRows.some((row) => Object.values(row.values).some((value) => value.isNormal));
  return { region, seasonLabel: SEASON_LABELS[seasonKey], seasonRows, windowRows, hasNormals };
}
