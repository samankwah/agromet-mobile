/**
 * Shared shapes for the gridded outlook maps (Subseasonal and Seasonal).
 *
 * The grid geometry comes from `shared/data/ghanaBoundaries.json` (real,
 * simplified Ghana district/region boundaries, see
 * scripts/build-ghana-boundaries.mjs). Each outlook's own service paints a
 * value onto those cells; the renderers only ever see `SpatialGridCell`.
 */
export type SpatialGeography = 'region' | 'district';

/** How a variable's raw numeric value should be rendered to a reader, so the
 * legend and the map popups format it the same way. */
export type SpatialValueFormat = 'number' | 'day-of-year' | 'temperature';

export type SpatialGridCell = {
  id: number;
  lat: number;
  lng: number;
  regionName: string | null;
  districtName: string | null;
  value: number;
};

// --- Minimal GeoJSON-ish types for shared/data/ghanaBoundaries.json ---
// Intentionally narrow (Polygon/MultiPolygon only, the only geometry types
// the build script emits) rather than pulling in a full @types/geojson
// dependency for this one file.

export type GeoPolygonGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};

export type GeoFeature<Properties> = {
  type: 'Feature';
  geometry: GeoPolygonGeometry;
  properties: Properties;
};

export type GhanaBoundaries = {
  generatedAt: string;
  source: string;
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  gridResolutionDeg: number;
  country: GeoFeature<{ name: string }>;
  regions: GeoFeature<{ name: string }>[];
  /** `id` matches `DISTRICTS` in shared/data/districts.ts; `label` is a
   * [lng, lat] point guaranteed to be inside the district. */
  districts: GeoFeature<{ id: string; name: string; region: string; label: [number, number] }>[];
  grid: { id: number; lat: number; lng: number; regionName: string | null; districtName: string | null }[];
};
