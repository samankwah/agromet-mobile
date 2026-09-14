import { GHANA_BOUNDARIES } from '../../../shared/data/ghanaBoundaries';

export type Place = {
  /** Stable key: a district name is not unique across regions in Ghana. */
  id: string;
  name: string;
  /** The region a district sits in, or null for a region itself. */
  region: string | null;
  kind: 'district' | 'region';
  lat: number;
  lng: number;
};

/**
 * Every district and region a reader can search for, with a point inside it.
 *
 * The coordinate is the mean of the display-grid cells tagged with that place,
 * not the polygon's centroid. Ghana has plenty of concave districts and one
 * ring-shaped region boundary, and a centroid can land outside its own outline
 * -- which would fetch a neighbour's forecast, or none. A cell mean is always
 * interior because every cell it averages is.
 *
 * Built once at module load from the same pre-baked grid the map draws, so a
 * search result and a map tap on the same district resolve to the same cell.
 */
function buildIndex(): Place[] {
  const groups = new Map<string, { name: string; region: string | null; kind: Place['kind']; lat: number; lng: number; count: number }>();

  for (const cell of GHANA_BOUNDARIES.grid) {
    if (cell.regionName) {
      add(groups, `region:${cell.regionName}`, cell.regionName, null, 'region', cell.lat, cell.lng);
    }
    if (cell.districtName && cell.regionName) {
      add(groups, `district:${cell.regionName}:${cell.districtName}`, cell.districtName, cell.regionName, 'district', cell.lat, cell.lng);
    }
  }

  return [...groups.entries()]
    .map(([id, group]) => ({
      id,
      name: group.name,
      region: group.region,
      kind: group.kind,
      lat: group.lat / group.count,
      lng: group.lng / group.count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function add(
  groups: Map<string, { name: string; region: string | null; kind: Place['kind']; lat: number; lng: number; count: number }>,
  id: string,
  name: string,
  region: string | null,
  kind: Place['kind'],
  lat: number,
  lng: number,
): void {
  const existing = groups.get(id);
  if (existing) {
    existing.lat += lat;
    existing.lng += lng;
    existing.count += 1;
    return;
  }
  groups.set(id, { name, region, kind, lat, lng, count: 1 });
}

export const PLACES: Place[] = buildIndex();

/**
 * Places matching what the reader has typed so far.
 *
 * Prefix matches rank above interior ones, so typing "wa" offers Wa before
 * Sissala West: a reader typing the start of a name almost always means that
 * name, and burying it under alphabetical neighbours makes the box feel broken.
 * Districts rank above regions on an equal match, since the map's finer view is
 * the one a search is usually reaching for.
 */
export function searchPlaces(query: string, limit = 8): Place[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const scored: { place: Place; score: number }[] = [];
  for (const place of PLACES) {
    const haystack = place.name.toLowerCase();
    const at = haystack.indexOf(needle);
    if (at === -1) continue;
    scored.push({ place, score: at === 0 ? 0 : 1 });
  }

  return scored
    .sort((a, b) => a.score - b.score || (a.place.kind === b.place.kind ? 0 : a.place.kind === 'district' ? -1 : 1) || a.place.name.localeCompare(b.place.name))
    .slice(0, limit)
    .map((entry) => entry.place);
}
