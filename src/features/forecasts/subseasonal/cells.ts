import { GHANA_BOUNDARIES } from '../../../shared/data/ghanaBoundaries';
import type { SpatialGeography, SpatialGridCell } from '../../../shared/domain/spatialOutlook';
import type {
  SubseasonalCell,
  SubseasonalVariable,
  SubseasonalVariableId,
  SubseasonalView,
} from '../../../shared/domain/subseasonalOutlook';
import { cellAt } from '../../../shared/api/subseasonalService';
import { bandFor } from '../../../shared/utils/tercilePalette';

export type { SubseasonalVariableId };

/**
 * Paints the display grid from the model's field.
 *
 * Two grids are in play and conflating them is the trap. `GHANA_BOUNDARIES.grid`
 * is 865 cells at 0.15 degrees: it is what gets *drawn*, and every cell already
 * knows its region and district. The forecast is 165 cells at 0.5 degrees: it is
 * what is *known*. Each display cell takes the value of the model cell covering
 * it, so the map fills without inventing anything — several display cells inside
 * one model cell come out identical, which is exactly what a 55 km field should
 * look like when drawn at 17 km.
 *
 * `geography` decides which admin unit a cell must belong to before it is drawn,
 * matching the Seasonal segment's Region/District toggle. It does **not** change
 * the resolution of the data, and the drawer says so: district outlines over a
 * half-degree field look more precise than they are.
 *
 * A display cell whose model cell has no reading for the chosen variable and
 * view is dropped rather than coloured. Painting it neutral would be
 * indistinguishable from a real finding of no signal.
 */
export function buildSubseasonalCells(
  modelCells: SubseasonalCell[],
  variable: SubseasonalVariableId,
  view: SubseasonalView,
  geography: SpatialGeography,
): SpatialGridCell[] {
  if (modelCells.length === 0) return [];

  const covering = coveringCells(modelCells);
  const cells: SpatialGridCell[] = [];
  GHANA_BOUNDARIES.grid.forEach((cell, index) => {
    // Region view still requires a region; district view additionally requires a
    // district, so a cell the boundary build could not place is never drawn.
    if (!cell.regionName) return;
    if (geography === 'district' && !cell.districtName) return;

    const reading = readingFor(covering[index], variable);
    if (!reading) return;

    const value = view === 'probability' ? probabilityValue(reading) : reading.value;
    if (value === null) return;

    cells.push({
      id: cell.id,
      lat: cell.lat,
      lng: cell.lng,
      regionName: cell.regionName,
      districtName: cell.districtName,
      value,
    });
  });
  return cells;
}

const coveringByField = new WeakMap<SubseasonalCell[], (SubseasonalCell | undefined)[]>();

/**
 * The model cell covering each display cell, in `GHANA_BOUNDARIES.grid` order.
 *
 * The nearest-cell search is 865 display cells against 165 model cells, about
 * 143,000 distance checks, and it used to run again on every variable, view or
 * geography toggle. None of those change which model cell covers which display
 * cell; only a new field does. So it is worked out once per field, keyed by the
 * array itself, and forgotten with it.
 */
function coveringCells(modelCells: SubseasonalCell[]): (SubseasonalCell | undefined)[] {
  let covering = coveringByField.get(modelCells);
  if (!covering) {
    covering = GHANA_BOUNDARIES.grid.map((cell) => cellAt(modelCells, cell.lat, cell.lng));
    coveringByField.set(modelCells, covering);
  }
  return covering;
}

function readingFor(cell: SubseasonalCell | undefined, variable: SubseasonalVariableId) {
  if (!cell) return undefined;
  return variable === 'rainfall' ? cell.rainfall : cell.temperature;
}

/** Probability mode writes a band index; deterministic mode writes the value
 * itself, which `buildColorClasses` and the viridis ramp already handle. */
function probabilityValue(reading: SubseasonalVariable): number | null {
  // No baseline for this cell: the deterministic view still works, but there is
  // no split to colour, so the cell stays unpainted rather than guessing.
  if (!reading.probabilities || !reading.category) return null;
  return bandFor(reading);
}

/** The value range across the drawn cells, for the continuous legend. Probability
 * mode has a fixed 0-4 band domain and does not use this. */
export function deterministicRange(cells: SpatialGridCell[]): { min: number; max: number } {
  if (cells.length === 0) return { min: 0, max: 1 };
  const values = cells.map((cell) => cell.value);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * What to call the area the reader tapped.
 *
 * The map draws one outline or the other, and the panel has to agree with it.
 * Naming a district while the map is drawing regions claims a resolution the
 * drawing does not have, and a reader who tapped Ashanti has no way to tell
 * whether "Ejura-Sekyedumase" is the area they selected or a place inside it.
 * Falls back to the other name rather than to nothing: an unlabelled panel is
 * worse than a coarser label.
 */
export function selectionPlaceName(selection: { region: string | null; district: string | null }, geography: SpatialGeography): string {
  const [preferred, fallback] = geography === 'district' ? [selection.district, selection.region] : [selection.region, selection.district];

  return preferred ?? fallback ?? 'Selected area';
}
