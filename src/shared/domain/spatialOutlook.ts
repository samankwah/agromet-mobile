/**
 * The Seasonal Outlook's spatial (gridded map) view — a district/region-
 * level breakdown of a seasonal variable, distinct from the single-number
 * `SeasonalOutlook` summary card (seasonalOutlook.ts). The grid geometry
 * itself comes from `shared/data/ghanaBoundaries.json` (real, simplified
 * Ghana district/region boundaries — see scripts/build-ghana-boundaries.mjs);
 * only the per-cell `value`/`legend` here is mock — the user's own real
 * gridded dataset will be supplied later and slots into this same shape.
 */
export type SpatialForecastView = 'probability' | 'deterministic';
export type SpatialGeography = 'region' | 'district';

/** How a variable's raw numeric value should be rendered to a reader.
 * Carried on the variable itself so the legend, map popups and any future
 * consumer format consistently, instead of each branching on variable id. */
export type SpatialValueFormat = 'number' | 'day-of-year';

/**
 * Which period vocabulary a variable is scoped by.
 *
 * Ghana has two rainfall regimes: the north is unimodal (one rainy
 * season), the south is bimodal (a major and a minor season). Season-
 * defining characteristics — onset, cessation, the dry spells within a
 * season, and the season's length — are only meaningful *relative to one
 * of those seasons*, so they're selected by Season.
 *
 * Accumulation/average quantities (total rainfall, rain days, mean
 * temperature) are reported over standard meteorological trimesters
 * instead, so they're selected by Sub-season (MJJ / JAS / ASO).
 */
export type SpatialPeriodKind = 'season' | 'sub-season';

export type SpatialOutlookVariable = {
  id: string;
  label: string;
  unit: string;
  valueFormat: SpatialValueFormat;
  periodKind: SpatialPeriodKind;
};

/** One selectable period — either a season (Northern / Southern Major /
 * Southern Minor) or a sub-season trimester, depending on the variable. */
export type SpatialPeriod = {
  id: string;
  label: string;
};

export type SpatialGridCell = {
  id: number;
  lat: number;
  lng: number;
  regionName: string | null;
  districtName: string | null;
  value: number;
};

export type SpatialOutlookDataset = {
  variable: SpatialOutlookVariable;
  /** The season or sub-season the values are scoped to — which of the two
   * it is follows from `variable.periodKind`. */
  period: SpatialPeriod;
  forecastView: SpatialForecastView;
  geography: SpatialGeography;
  cells: SpatialGridCell[];
  legend: { min: number; max: number; unit: string };
  generatedAt: string;
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
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  gridResolutionDeg: number;
  country: GeoFeature<{ name: string }>;
  regions: GeoFeature<{ name: string }>[];
  districts: GeoFeature<{ name: string; region: string }>[];
  grid: { id: number; lat: number; lng: number; regionName: string | null; districtName: string | null }[];
};
