import { HOME_LOCATIONS } from '../data/mockWeather';
import type {
  SeasonalCell,
  SeasonalOutlook,
  SeasonalOutlookSet,
  SeasonalSourceRef,
  SeasonalVariable,
  SeasonalVariableId,
  SeasonalWindow,
} from '../domain/seasonalOutlook';
import { normaliseRegion } from '../domain/seasonalOutlook';
import { leadingProbabilityPct } from '../domain/subseasonalOutlook';
import { getJson } from './http';
import { ServiceError } from './mockDelay';

/**
 * The seasonal outlook, from `/api/outlook/seasonal`.
 *
 * One fetch serves both consumers, as with the subseasonal outlook: the map
 * wants every region in every window, the town card wants one region in one
 * window, and both are slices of the same payload.
 */

type ApiPayload = {
  source?: 'seas5' | 'gmet';
  issuedBy?: string | null;
  issuedAt?: string | null;
  runDate?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  pdfUrl?: string | null;
  windows?: SeasonalWindow[];
  modelWindows?: SeasonalWindow[];
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

export async function getSeasonalOutlookSet(): Promise<SeasonalOutlookSet> {
  const payload = await getJson<ApiPayload>('/api/outlook/seasonal');

  return {
    source: payload.source === 'gmet' ? 'gmet' : 'seas5',
    issuedBy: payload.issuedBy ?? null,
    issuedAt: payload.issuedAt ?? null,
    runDate: payload.runDate ?? null,
    validFrom: payload.validFrom ?? null,
    validTo: payload.validTo ?? null,
    pdfUrl: payload.pdfUrl ?? null,
    windows: payload.windows ?? [],
    modelWindows: payload.modelWindows ?? [],
    unavailable: Boolean(payload.unavailable),
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

/** A region's cell in a window, matched on the normalised name. */
export function regionCell(window: SeasonalWindow | undefined, region: string | null | undefined): SeasonalCell | undefined {
  if (!window || !region) return undefined;
  const wanted = normaliseRegion(region);
  return window.cells.find((cell) => normaliseRegion(cell.region) === wanted);
}

/** The window the reader asked for, or the nearest one when they asked for none
 * or for one this run does not carry. */
export function pickWindow(windows: SeasonalWindow[], windowKey?: string): SeasonalWindow | undefined {
  return windows.find((window) => window.key === windowKey) ?? windows[0];
}

/**
 * The reader's own town card, from a set already in hand.
 *
 * Split from the fetch so the screen can recompute it when the reader changes
 * season, without a second request for a payload it already holds.
 *
 * Throws rather than falling back to a national figure, for the same reason the
 * subseasonal card does: an average over a country that is dry in the south and
 * wet in the north would tell everybody "normal".
 */
export function buildSeasonalOutlook(set: SeasonalOutlookSet, locationId: string, windowKey?: string): SeasonalOutlook {
  if (set.unavailable || set.windows.length === 0) {
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
  if (!place) {
    throw new ServiceError(`No seasonal outlook available for "${locationId}".`);
  }

  const window = pickWindow(set.windows, windowKey)!;
  const cell = regionCell(window, place.region);
  if (!cell || (!cell.rainfall && !cell.temperature)) {
    throw new ServiceError(`No seasonal outlook available for ${place.region}.`);
  }

  // Only a reading for the same window counts: the model's Dec to Feb is no
  // comment on a published Nov to Jan, so no fallback to the nearest window.
  const modelCell =
    set.source === 'gmet'
      ? regionCell(
          set.modelWindows.find((entry) => entry.key === window.key),
          place.region,
        )
      : undefined;

  return {
    locationId,
    townName: place.name,
    region: cell.region,
    windowKey: window.key,
    windowLabel: window.label,
    confidenceLevel: confidenceFor(cell),
    plainLanguageSummary: summariseRainfall(cell.rainfall, cell.region, window.label),
    temperatureSummary: cell.temperature ? summariseTemperature(cell.temperature, cell.region, window.label) : null,
    modelSummary: modelCell ? modelReads(modelCell) : null,
    source: set.source,
    issuedBy: set.issuedBy,
  };
}

/** The town card, fetched. `windowKey` defaults to the nearest window. */
export async function getSeasonalOutlook(locationId: string, windowKey?: string): Promise<SeasonalOutlook> {
  const set = await getSeasonalOutlookSet();
  return buildSeasonalOutlook(set, locationId, windowKey);
}

/** Rainfall decides the badge, unless rainfall has nothing to say this window. */
function confidenceFor(cell: SeasonalCell) {
  const rain = cell.rainfall;
  if (rain && !rain.dryWindow && rain.probabilities && rain.confidence) return rain.confidence;
  return cell.temperature?.confidence ?? 'low';
}

/** True when the split is too even, or too uninformative, to call a direction. */
function noClearSignal(reading: SeasonalVariable): boolean {
  return Boolean(reading.noSignal) || reading.confidence === 'low';
}

/**
 * The sentence beside the badge, written from the actual split.
 *
 * Plain words for a farmer reading in a second language: a chance, a direction,
 * the months, and the reminder that it is a chance.
 */
export function summariseRainfall(reading: SeasonalVariable | null, region: string, label: string): string {
  if (!reading) return `There is no rainfall outlook for ${region} from ${label}.`;

  if (reading.dryWindow) {
    return `This is the dry season in ${region}. Little rain falls from ${label}, so there is no rainfall outlook for these months.`;
  }

  if (!reading.probabilities || !reading.category) {
    return `${region} should get about ${Math.round(reading.value)} mm of rain from ${label}. There is no long-term record here yet to compare it with.`;
  }

  if (noClearSignal(reading)) {
    return `The forecasts for ${region} do not agree, so treat this season as normal.`;
  }

  const direction =
    reading.category === 'below'
      ? 'a drier than normal season'
      : reading.category === 'above'
        ? 'a wetter than normal season'
        : 'near normal rain';

  return `${region}: ${leadingProbabilityPct(reading)}% chance of ${direction} from ${label}. This is a probability, not a certainty.`;
}

export function summariseTemperature(reading: SeasonalVariable, region: string, label: string): string {
  if (!reading.probabilities || !reading.category) {
    return `Days in ${region} should reach about ${Math.round(reading.value)}°C from ${label}.`;
  }

  if (noClearSignal(reading)) {
    return `The temperature forecasts for ${region} do not agree, so expect normal temperatures.`;
  }

  const direction =
    reading.category === 'below'
      ? 'a cooler than normal season'
      : reading.category === 'above'
        ? 'a warmer than normal season'
        : 'near normal temperatures';

  return `${leadingProbabilityPct(reading)}% chance of ${direction} from ${label}.`;
}

/** A short phrase for one reading, for the "the model alone reads" line. */
export function leanPhrase(reading: SeasonalVariable | null, variable: SeasonalVariableId): string | null {
  if (!reading) return null;
  if (reading.dryWindow) return 'dry season';
  if (!reading.probabilities || !reading.category) return null;
  if (noClearSignal(reading)) return 'no clear signal';

  const words =
    variable === 'rainfall'
      ? { below: 'drier than normal', normal: 'near normal', above: 'wetter than normal' }
      : { below: 'cooler than normal', normal: 'near normal', above: 'warmer than normal' };

  return `${words[reading.category]} (${leadingProbabilityPct(reading)}%)`;
}

function modelReads(cell: SeasonalCell): string | null {
  const rain = leanPhrase(cell.rainfall, 'rainfall');
  const heat = leanPhrase(cell.temperature, 'temperature');
  const parts = [rain ? `rainfall ${rain}` : null, heat ? `temperature ${heat}` : null].filter(Boolean);
  return parts.length > 0 ? `The model alone reads: ${parts.join(', ')}.` : null;
}
