import type { PrecipFrame } from '../../domain/precipitationTimeline';
import { fetchWithTimeout } from '../http';

/**
 * NASA GIBS IMERG: satellite-measured rain rate, the observed half of the
 * precipitation timeline.
 *
 * IMERG is a multi-satellite estimate rather than radar, which is what makes it
 * usable here at all: it is global, so it covers Ghana, where no public radar
 * network does. Free, no API key, no authentication (verified against the live
 * service).
 *
 * The layer is served as WMTS raster tiles rather than as values, so this half
 * of the map is imagery. That is also why it cannot be recoloured to match our
 * own palette, and why `colorScale.ts` carries `IMERG_STOPS` sampled from these
 * tiles instead: we match GIBS rather than fight it, so one legend describes
 * both halves.
 */

/** `{TIME}` is substituted here; `{z}`/`{y}`/`{x}` are left for MapLibre.
 *
 * The z/y/x ordering looks wrong and is not: WMTS addresses tiles as
 * TileMatrix/TileRow/TileCol, and MapLibre substitutes its placeholders by
 * name rather than by position, so writing them out of the usual order is
 * exactly right. */
const TILE_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate_30min' +
  '/default/{TIME}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png';

/** The deepest tile matrix GIBS publishes for this layer. Set as the raster
 * source's `maxzoom` so MapLibre overzooms the level-6 tiles rather than
 * requesting levels that do not exist. */
export const GIBS_MAX_ZOOM = 6;

/** IMERG's native cadence. */
export const GIBS_STEP_MINUTES = 30;
const STEP_MS = GIBS_STEP_MINUTES * 60 * 1000;

/**
 * How far behind real time the newest frame usually sits.
 *
 * Measured at about six hours against the live service. Deliberately set a
 * little beyond that so the first candidate is normally present and
 * `resolveHorizon` costs one request rather than several.
 */
const LATENCY_MS = 6.5 * 60 * 60 * 1000;

/** How far back to walk before giving up. Three hours of tolerance. */
const MAX_PROBE_STEPS = 6;

/** A low-zoom tile containing Ghana, used only to ask "does this timestamp
 * exist". Level 4, column 7, row 7 covers the country's western half. */
const PROBE_TILE = { z: 4, x: 7, y: 7 };

const HORIZON_TTL_MS = 15 * 60 * 1000;

/** A probe is one small tile. Up to six run one after another, so a probe that
 * hangs must give up quickly or the rain map waits on it. */
const PROBE_TIMEOUT_MS = 5_000;

export function tileUrlTemplate(validAt: string): string {
  return TILE_URL.replace('{TIME}', validAt);
}

/** Floors an instant to the previous 30-minute mark, in UTC. */
export function floorToStep(at: Date): Date {
  return new Date(Math.floor(at.getTime() / STEP_MS) * STEP_MS);
}

/** GIBS wants seconds and a Z, not milliseconds. */
export function toGibsTime(at: Date): string {
  return `${at.toISOString().slice(0, 19)}Z`;
}

async function timestampExists(validAt: string): Promise<boolean> {
  const url = tileUrlTemplate(validAt)
    .replace('{z}', String(PROBE_TILE.z))
    .replace('{y}', String(PROBE_TILE.y))
    .replace('{x}', String(PROBE_TILE.x));

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, PROBE_TIMEOUT_MS);
    // GIBS answers 404 for a time outside the archive and 200 for one inside
    // it, including a fully transparent tile when that half hour simply had no
    // rain. A 200 therefore means "this frame exists", not "there is rain in
    // it", which is the question being asked here.
    return response.ok;
  } catch {
    // Offline or blocked. Not an answer about the archive, so do not treat it
    // as one; the caller falls back to the arithmetic horizon.
    return false;
  }
}

let cachedHorizon: { at: number; value: Date } | null = null;

/**
 * The newest IMERG frame that actually exists.
 *
 * Derived by rounding and then probing rather than by reading the layer's
 * WMTS capabilities: that document is 5.8 MB covering every GIBS layer, there
 * is no XML parser in this app's dependency tree, and the only genuinely
 * unknown quantity is where the newest usable frame sits. One small tile
 * request answers that.
 */
export async function resolveHorizon(now: Date): Promise<Date> {
  if (cachedHorizon && now.getTime() - cachedHorizon.at < HORIZON_TTL_MS) {
    return cachedHorizon.value;
  }

  const start = floorToStep(new Date(now.getTime() - LATENCY_MS));

  for (let step = 0; step < MAX_PROBE_STEPS; step += 1) {
    const candidate = new Date(start.getTime() - step * STEP_MS);
    if (await timestampExists(toGibsTime(candidate))) {
      cachedHorizon = { at: now.getTime(), value: candidate };
      return candidate;
    }
  }

  // Every probe failed, which most likely means no connection rather than a
  // six-hour hole in the archive. Return the arithmetic guess and let the map's
  // own tile error handling drop the frame if it really is missing, rather than
  // failing the whole screen over imagery.
  return start;
}

/** Frames running back from `horizon`, newest last so the array reads forward
 * in time like every other timeline in the app. */
export function observedFrames(horizon: Date, count: number): PrecipFrame[] {
  return Array.from({ length: count }, (_, index) => {
    const validAt = new Date(horizon.getTime() - (count - 1 - index) * STEP_MS);
    return {
      validAt: validAt.toISOString(),
      stepMinutes: GIBS_STEP_MINUTES,
      kind: 'observed' as const,
      render: {
        type: 'raster' as const,
        tileUrlTemplate: tileUrlTemplate(toGibsTime(validAt)),
        maxZoom: GIBS_MAX_ZOOM,
      },
    };
  });
}

export const GIBS_ATTRIBUTION = 'Rain imagery: NASA GIBS / GPM IMERG';
