import { GHANA_BOUNDARIES } from '../../../shared/data/ghanaBoundaries';

/**
 * The model grid the forecast half is fetched on and drawn as.
 *
 * A quarter degree, roughly 28 km. Open-Meteo's best-match blend is served at
 * about that resolution, so asking for finer buys interpolation rather than
 * information, and drawing it finer would invent detail the data does not have.
 * That is the same argument `subseasonal/cells.ts` already makes about not
 * conflating the model grid with the display grid, applied here by simply not
 * having two grids: what is fetched is what is drawn.
 */
export const CELL_SIZE_DEG = 0.25;

/**
 * Built by snapping the 865 pre-tagged display cells onto a quarter-degree
 * lattice and deduplicating.
 *
 * That gives a land mask for free. Those cells already carry a region name,
 * which is to say they are already known to fall on Ghana, so the result covers
 * the country without spending a request on the several hundred lattice points
 * that fall in the sea or over a neighbour.
 */
function buildGrid(): { lat: number; lng: number }[] {
  const seen = new Set<string>();
  const cells: { lat: number; lng: number }[] = [];

  for (const cell of GHANA_BOUNDARIES.grid) {
    if (!cell.regionName) continue;
    const lat = Math.round(cell.lat / CELL_SIZE_DEG) * CELL_SIZE_DEG;
    const lng = Math.round(cell.lng / CELL_SIZE_DEG) * CELL_SIZE_DEG;
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push({ lat, lng });
  }

  return cells;
}

let cached: { lat: number; lng: number }[] | null = null;

/** Computed once, on first use rather than at import, so app start does not pay
 * for a screen most sessions never open. */
export function modelGrid(): { lat: number; lng: number }[] {
  if (!cached) cached = buildGrid();
  return cached;
}
