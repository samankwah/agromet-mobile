import { GHANA_BOUNDARIES } from '../data/ghanaBoundaries';

export type DistrictHit = { id: string; name: string; region: string };

/**
 * How far off the mapped land a fix may be and still count, in degrees
 * (about 11 km). Covers a phone on the beach or a lagoon that the simplified
 * coastline leaves just outside, and a fix a few hundred metres over a border
 * the simplification moved. Further than that is somewhere AgroMet does not
 * serve.
 */
const NEAREST_LIMIT_DEG = 0.1;

type Ring = number[][];
type Indexed = DistrictHit & { polygons: Ring[][]; bbox: [number, number, number, number] };

let index: Indexed[] | null = null;

function buildIndex(): Indexed[] {
  return GHANA_BOUNDARIES.districts.map((feature) => {
    const { geometry, properties } = feature;
    const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as Ring[][];
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const polygon of polygons) {
      for (const [lng, lat] of polygon[0]) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
    return {
      id: properties.id,
      name: properties.name,
      region: properties.region,
      polygons,
      bbox: [minLng, minLat, maxLng, maxLat],
    };
  });
}

/** Even-odd ray cast. A point exactly on an edge may go either way, which is
 * fine: it is equally in both districts. */
function inRing(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(polygon: Ring[], lng: number, lat: number): boolean {
  if (!inRing(polygon[0], lng, lat)) return false;
  for (let hole = 1; hole < polygon.length; hole += 1) {
    if (inRing(polygon[hole], lng, lat)) return false;
  }
  return true;
}

/**
 * The district a coordinate falls in, from the district polygons the map draws.
 *
 * When no polygon contains it (just offshore, or across a border the
 * simplification nudged), the district with a border vertex nearest to it,
 * within NEAREST_LIMIT_DEG. Null for anywhere further, a phone abroad or an emulator
 * on its default coordinates.
 */
export function districtAt(latitude: number, longitude: number): DistrictHit | null {
  index ??= buildIndex();

  for (const district of index) {
    const [minLng, minLat, maxLng, maxLat] = district.bbox;
    if (longitude < minLng || longitude > maxLng || latitude < minLat || latitude > maxLat) continue;
    if (district.polygons.some((polygon) => inPolygon(polygon, longitude, latitude))) {
      return { id: district.id, name: district.name, region: district.region };
    }
  }

  let nearest: Indexed | null = null;
  let nearestDistance = NEAREST_LIMIT_DEG ** 2;
  for (const district of index) {
    for (const polygon of district.polygons) {
      for (const [lng, lat] of polygon[0]) {
        const distance = (lng - longitude) ** 2 + (lat - latitude) ** 2;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = district;
        }
      }
    }
  }
  return nearest ? { id: nearest.id, name: nearest.name, region: nearest.region } : null;
}
