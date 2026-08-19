import {
  buildMockSpatialCells,
  periodOptionsFor,
  SPATIAL_SEASONS,
  SPATIAL_SUB_SEASONS,
  SPATIAL_VARIABLES,
} from '../data/mockSpatialOutlook';
import type { SpatialForecastView, SpatialGeography, SpatialOutlookDataset } from '../domain/spatialOutlook';
import { mockDelay, ServiceError } from './mockDelay';

export { SPATIAL_VARIABLES, SPATIAL_SUB_SEASONS, SPATIAL_SEASONS, periodOptionsFor };

export type SpatialOutlookQuery = {
  variableId: string;
  /** A season id or a sub-season id — which vocabulary it belongs to
   * follows from the variable's `periodKind`. */
  periodId: string;
  forecastView: SpatialForecastView;
  geography: SpatialGeography;
};

/**
 * The Seasonal Outlook's spatial map — sole swap point for real gridded
 * data. The grid geometry (cell lat/lng, region/district tags) is already
 * real (see shared/data/ghanaBoundaries.ts); only `value` per cell is
 * mock. A real integration replaces `buildMockSpatialCells` with a lookup
 * against the supplied dataset, keyed the same way — every cell already
 * carries the region/district name a real dataset would be indexed by.
 */
export async function getSpatialOutlookGrid(query: SpatialOutlookQuery): Promise<SpatialOutlookDataset> {
  const variable = SPATIAL_VARIABLES.find((entry) => entry.id === query.variableId);
  if (!variable) throw new ServiceError(`Unknown spatial outlook variable "${query.variableId}"`);

  // The period must come from the vocabulary this variable is scoped by —
  // asking for onset over a trimester (or rainfall total over a season)
  // is a category error, so it fails loudly rather than rendering
  // something meaningless.
  const period = periodOptionsFor(variable).find((entry) => entry.id === query.periodId);
  if (!period) {
    throw new ServiceError(`"${query.periodId}" is not a valid ${variable.periodKind} for variable "${query.variableId}"`);
  }

  const cells = buildMockSpatialCells(query.variableId, query.periodId, query.forecastView, query.geography);
  const values = cells.map((cell) => cell.value);
  const isTercile = query.forecastView === 'probability';

  const dataset: SpatialOutlookDataset = {
    variable,
    period,
    forecastView: query.forecastView,
    geography: query.geography,
    cells,
    // In probability mode the values are tercile indices (0-2), so the
    // legend describes categories rather than the variable's own units —
    // labelling a tercile map "mm" would be actively wrong.
    legend: isTercile
      ? { min: 0, max: 2, unit: `${variable.label} — likelihood` }
      : { min: Math.min(...values), max: Math.max(...values), unit: variable.unit },
    generatedAt: new Date().toISOString(),
  };

  return mockDelay(dataset, 300);
}
