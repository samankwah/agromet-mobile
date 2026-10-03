import { GHANA_BOUNDARIES } from '../../../shared/data/ghanaBoundaries';
import type { SpatialGridCell } from '../../../shared/domain/spatialOutlook';
import type { SeasonalCell, SeasonalVariable, SeasonalVariableId, SeasonalView } from '../../../shared/domain/seasonalOutlook';
import { normaliseRegion } from '../../../shared/domain/seasonalOutlook';
import { bandFor } from '../../../shared/utils/tercilePalette';

/** The "No signal" band in both tercile palettes. */
const NO_SIGNAL_BAND = 2;

/**
 * Paints the display grid from one window's region readings.
 *
 * The seasonal payload is one reading per region, so every display cell inside a
 * region takes that region's reading and the map comes out as sixteen flat
 * blocks. That is the forecast's real resolution, and the drawer says so.
 *
 * A region with no reading for the chosen variable and view is dropped rather
 * than painted neutral: on a tercile map, neutral is a finding ("no signal"),
 * and a missing reading is not one.
 *
 * The one exception is rainfall in a dry window. The model does have a reading
 * there, but a split of near-zero totals carries no information, so the
 * probability view paints it as no signal on purpose. The legend note says why.
 */
export function buildSeasonalCells(windowCells: SeasonalCell[], variable: SeasonalVariableId, view: SeasonalView): SpatialGridCell[] {
  if (windowCells.length === 0) return [];

  const byRegion = new Map<string, SeasonalCell>();
  for (const cell of windowCells) byRegion.set(normaliseRegion(cell.region), cell);

  const cells: SpatialGridCell[] = [];
  for (const cell of GHANA_BOUNDARIES.grid) {
    if (!cell.regionName) continue;
    const regionCell = byRegion.get(normaliseRegion(cell.regionName));
    const reading = regionCell ? (variable === 'rainfall' ? regionCell.rainfall : regionCell.temperature) : null;
    if (!reading) continue;

    const value = view === 'probability' ? probabilityValue(reading) : reading.value;
    if (value === null) continue;

    cells.push({
      id: cell.id,
      lat: cell.lat,
      lng: cell.lng,
      regionName: cell.regionName,
      districtName: cell.districtName,
      value,
    });
  }
  return cells;
}

/** A band index in the probability view, or null when there is no split to band. */
function probabilityValue(reading: SeasonalVariable): number | null {
  if (reading.dryWindow) return NO_SIGNAL_BAND;
  // No baseline for this region: the average view still has something to say,
  // but there is no split to colour.
  if (!reading.probabilities || !reading.category) return null;
  return bandFor(reading);
}

/** Whether any region is in its dry season this window, so the legend can say
 * why those regions read as no signal. */
export function hasDryWindow(windowCells: SeasonalCell[]): boolean {
  return windowCells.some((cell) => Boolean(cell.rainfall?.dryWindow));
}

/** Whether any region carries a real tercile split. Decides which view the
 * reader lands on, as on the subseasonal map: a probability map of nothing but
 * dry-season grey is a worse first sight than the average. */
export function hasProbabilities(windowCells: SeasonalCell[]): boolean {
  const split = (reading: SeasonalVariable | null) => Boolean(reading?.probabilities && reading.category && !reading.dryWindow);
  return windowCells.some((cell) => split(cell.rainfall) || split(cell.temperature));
}
