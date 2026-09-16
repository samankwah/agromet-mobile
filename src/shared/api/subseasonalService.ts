import { HOME_LOCATIONS } from '../data/mockWeather';
import type {
  SubseasonalCell,
  SubseasonalOutlook,
  SubseasonalOutlookSet,
  SubseasonalSeries,
  SubseasonalVariable,
} from '../domain/subseasonalOutlook';
import { leadingProbabilityPct, widenCategory } from '../domain/subseasonalOutlook';
import { getJson } from './http';
import { ServiceError } from './mockDelay';

/**
 * The weeks 2-to-4 outlook, from `/api/outlook/subseasonal`.
 *
 * The backend serves NOAA GEFS's own 0.5 degree field over Ghana rather than a
 * handful of sampled points, so this module maps a *grid* onto the app's shapes
 * and leaves admin boundaries to the map, which already ships them.
 *
 * One fetch serves both consumers. The map wants every cell; the card wants the
 * one covering the reader's town. Fetching twice would double the traffic for a
 * single payload.
 */

type ApiCell = {
  id: string;
  lat: number;
  lng: number;
  rainfall: SubseasonalVariable | null;
  temperature: SubseasonalVariable | null;
};

type ApiPayload = {
  cells: ApiCell[];
  unavailable: boolean;
  fetchFailed: boolean;
  computing: boolean;
  issuedAt: string | null;
  windowStart: string;
  windowEnd: string;
  model: string;
  baseline: string | null;
  stale: boolean;
};

export async function getSubseasonalOutlookSet(): Promise<SubseasonalOutlookSet> {
  const payload = await getJson<ApiPayload>('/api/outlook/subseasonal');

  return {
    cells: (payload.cells ?? []) as SubseasonalCell[],
    unavailable: Boolean(payload.unavailable),
    fetchFailed: Boolean(payload.fetchFailed),
    computing: Boolean(payload.computing),
    issuedAt: payload.issuedAt ?? null,
    windowStart: payload.windowStart,
    windowEnd: payload.windowEnd,
    model: payload.model,
    baseline: payload.baseline ?? null,
    stale: Boolean(payload.stale),
  };
}

/**
 * One cell's day-by-day spread, for the detail chart.
 *
 * Keyed by coordinate rather than cell id because the caller has a district's
 * centroid, not a grid key — the backend owns the snapping, so the two cannot
 * disagree about which cell covers a place.
 */
export async function getSubseasonalSeries(
  lat: number,
  lng: number,
): Promise<{ id: string; rainfall: SubseasonalSeries | null; temperature: SubseasonalSeries | null }> {
  const payload = await getJson<{
    id: string;
    rainfall: SubseasonalSeries | null;
    temperature: SubseasonalSeries | null;
  }>('/api/outlook/subseasonal/series', { lat, lng });

  return { id: payload.id, rainfall: payload.rainfall ?? null, temperature: payload.temperature ?? null };
}

/**
 * The cell covering a point.
 *
 * Squared degrees rather than a great-circle distance: over a country five
 * degrees across, on a half-degree lattice, the two never disagree about which
 * cell is nearest, and this needs no trigonometry. Mirrors `nearest_cell` in
 * `backend/app/s2s.py`.
 */
export function cellAt(cells: SubseasonalCell[], lat: number, lng: number): SubseasonalCell | undefined {
  let best: SubseasonalCell | undefined;
  let bestDistance = Infinity;

  for (const cell of cells) {
    const distance = (cell.lat - lat) ** 2 + (cell.lng - lng) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cell;
    }
  }
  return best;
}

/**
 * The reader's own outlook card, for the town they have selected.
 *
 * Resolved by coordinate rather than by region name: the card is about their
 * town, and the cell covering Tamale is a better answer for someone in Tamale
 * than an average over the whole Northern Region.
 *
 * Throws rather than falling back to a national average when nothing covers
 * them. An average across a country that is dry in the south and wet in the far
 * north would report "normal" to everybody.
 */
export async function getSubseasonalOutlook(locationId: string): Promise<SubseasonalOutlook> {
  const set = await getSubseasonalOutlookSet();
  if (set.unavailable) {
    // `computing` first: a refresh already running is the one case where the
    // reader has to do nothing at all, so it must not be described as a failure
    // even though the last attempt may well have failed.
    throw new ServiceError(
      set.computing
        ? 'The weeks 2 to 4 outlook is being prepared. It will be ready in a moment.'
        : set.fetchFailed
          ? 'The weather service did not answer. Try again in a moment.'
          : 'No subseasonal outlook has been computed yet.',
    );
  }

  const place = HOME_LOCATIONS.find((entry) => entry.id === locationId);
  if (!place) {
    throw new ServiceError(`No subseasonal outlook available for "${locationId}".`);
  }

  const cell = cellAt(set.cells, place.lat, place.lng);
  const rainfall = cell?.rainfall;
  if (!rainfall?.probabilities || !rainfall.category) {
    throw new ServiceError(`No subseasonal outlook available for "${locationId}".`);
  }

  return {
    locationId,
    region: place.region,
    issuedAt: set.issuedAt ?? new Date().toISOString(),
    weekRangeStart: set.windowStart,
    weekRangeEnd: set.windowEnd,
    rainfallOutlook: {
      category: widenCategory(rainfall.category),
      probabilityPct: leadingProbabilityPct(rainfall),
    },
    temperatureOutlook:
      cell?.temperature?.category != null
        ? {
            category: widenCategory(cell.temperature.category),
            probabilityPct: leadingProbabilityPct(cell.temperature),
          }
        : { category: 'normal', probabilityPct: 0 },
    confidenceLevel: rainfall.confidence ?? 'low',
    plainLanguageSummary: summarise(rainfall, place.region),
    farmerActionCard: actionCard(rainfall),
  };
}

/**
 * The sentence beside the numbers.
 *
 * Written from the actual split rather than picked from a fixed set, because the
 * honest sentence for 39/29/32 ("no clear signal") and for 87/13/0 ("strongly
 * favours drier") are different sentences, and the placeholder this replaced told
 * every town the same story regardless.
 */
function summarise(rainfall: SubseasonalVariable, region: string): string {
  const pct = leadingProbabilityPct(rainfall);

  if (rainfall.noSignal) {
    return `This is normally a dry period in ${region}, with too little rain in the record for the outlook to separate a wet spell from a dry one. Treat it as the dry season it usually is.`;
  }

  if (rainfall.confidence === 'low') {
    return `The ensemble is split for ${region}, close to what the last thirty years would suggest on their own. Take this as no clear signal either way rather than as a forecast of normal rainfall.`;
  }

  const direction =
    rainfall.category === 'above'
      ? 'wetter than the long-term average'
      : rainfall.category === 'below'
        ? 'drier than the long-term average'
        : 'near the long-term average';

  return `${pct}% of the ${rainfall.members} forecasts run for ${region} put the next few weeks ${direction}. This is a probability, not a certainty, and conditions can still turn out otherwise.`;
}

function actionCard(rainfall: SubseasonalVariable): SubseasonalOutlook['farmerActionCard'] {
  if (rainfall.noSignal || rainfall.confidence === 'low') {
    return {
      headline: 'Plan with flexibility',
      actions: [
        'Keep planting windows flexible over the next month.',
        'Follow the Today and 7-Day forecasts for anything you must decide this week.',
      ],
    };
  }

  if (rainfall.category === 'below') {
    return {
      headline: 'Prepare for a drier spell',
      actions: [
        'Hold back on planting that depends on steady rain over the next fortnight.',
        'Check water storage and irrigation before the window opens.',
        'Follow the weekly advisory, which is issued against shorter-range forecasts.',
      ],
    };
  }

  if (rainfall.category === 'above') {
    return {
      headline: 'Prepare for a wetter spell',
      actions: [
        'Clear drainage on low-lying plots before the window opens.',
        'Bring forward field work that needs dry ground.',
        'Watch the flood and drought monitor as the window approaches.',
      ],
    };
  }

  return {
    headline: 'Plan with flexibility',
    actions: [
      'Keep planting windows flexible over the next month.',
      'Monitor weekly bulletins rather than acting on this outlook alone.',
    ],
  };
}
