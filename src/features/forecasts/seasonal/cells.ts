import { GHANA_BOUNDARIES } from '../../../shared/data/ghanaBoundaries';
import type { SpatialGridCell, SpatialValueFormat } from '../../../shared/domain/spatialOutlook';
import type { SeasonalCell, SeasonalReading, SeasonalVariableId, SeasonalView } from '../../../shared/domain/seasonalOutlook';
import { normaliseRegion } from '../../../shared/domain/seasonalOutlook';
import type { ColorStops } from '../../../shared/utils/colorScale';
import { DRY_SPELL_STOPS, RAINFALL_STOPS, TEMPERATURE_STOPS, VIRIDIS_STOPS } from '../../../shared/utils/colorScale';
import { bandFor, RAINFALL_PALETTE, TEMPERATURE_PALETTE, type TercilePalette } from '../../../shared/utils/tercilePalette';

/** The "No signal" band in every tercile palette. */
const NO_SIGNAL_BAND = 2;

/**
 * Paints the display grid from one season's or window's region readings.
 *
 * One reading per region, so every display cell inside a region takes that
 * region's reading and the map comes out as flat regional blocks. A season block
 * only holds its own sector's regions, so the other half of the country stays
 * unpainted, which is the point: the northern season does not happen in Accra.
 *
 * A reading that is only a normal (the season is beyond the model's reach) is
 * painted by its normal whatever the view, since there is no split to band.
 * The screen says so in its banner.
 *
 * A region with no reading for the variable is dropped rather than painted
 * neutral: on a tercile map, neutral is a finding ("no signal").
 */
export function buildSeasonalCells(blockCells: SeasonalCell[], variable: SeasonalVariableId, view: SeasonalView): SpatialGridCell[] {
  if (blockCells.length === 0) return [];

  const byRegion = new Map<string, SeasonalCell>();
  for (const cell of blockCells) byRegion.set(normaliseRegion(cell.region), cell);

  const cells: SpatialGridCell[] = [];
  for (const cell of GHANA_BOUNDARIES.grid) {
    if (!cell.regionName) continue;
    const reading = byRegion.get(normaliseRegion(cell.regionName))?.[variable];
    if (!reading) continue;

    const value = mapValue(reading, view);
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

function mapValue(reading: SeasonalReading, view: SeasonalView): number | null {
  if (!reading.available) return reading.normal ?? null;
  if (view === 'deterministic') return reading.value ?? null;
  if (reading.dryWindow) return NO_SIGNAL_BAND;
  // No baseline here: the deterministic view still has something to say, but
  // there is no split to colour.
  if (!reading.probabilities || !reading.category) return null;
  return bandFor({ ...reading, value: reading.value ?? 0, members: reading.members ?? 0 });
}

/** Whether any region is in its dry season, so the legend can say why it reads
 * as no signal. */
export function hasDryWindow(blockCells: SeasonalCell[], variable: SeasonalVariableId): boolean {
  return variable === 'rainfallTotal' && blockCells.some((cell) => Boolean(cell.rainfallTotal?.dryWindow));
}

/** Whether any region carries a real forecast split for the variable. */
export function hasProbabilities(blockCells: SeasonalCell[], variable: SeasonalVariableId): boolean {
  return blockCells.some((cell) => {
    const reading = cell[variable];
    return Boolean(reading?.available && reading.probabilities && reading.category && !reading.dryWindow);
  });
}

/** How the legend and the map popup write a value. */
export function valueFormatFor(variable: SeasonalVariableId): SpatialValueFormat {
  if (variable === 'onset' || variable === 'cessation') return 'day-of-year';
  if (variable === 'temperature') return 'temperature';
  return 'number';
}

/** The deterministic ramp: rain blues for amounts, warm for heat, brown for dry
 * spells, and a neutral sequence for dates, where neither end is good news. */
export function stopsFor(variable: SeasonalVariableId): ColorStops {
  if (variable === 'temperature') return TEMPERATURE_STOPS;
  if (variable === 'rainfallTotal' || variable === 'rainyDays') return RAINFALL_STOPS;
  if (variable === 'earlyDrySpell' || variable === 'lateDrySpell') return DRY_SPELL_STOPS;
  return VIRIDIS_STOPS;
}

function relabel(base: TercilePalette, labels: [string, string, string, string]): TercilePalette {
  return base.map((band, index) => {
    if (index === NO_SIGNAL_BAND) return band;
    const label = labels[index < NO_SIGNAL_BAND ? index : index - 1];
    return { ...band, label };
  });
}

/** The rainfall colours turned round, so "good" stays green-blue: an early
 * onset or a short dry spell is good news, as a wet season is. */
const REVERSED_RAINFALL = [...RAINFALL_PALETTE].reverse();

/**
 * The probability key for each variable.
 *
 * Index 0 is always "below" (earlier, shorter, less), as `bandFor` bins it. The
 * colours follow what the result means for a crop: wet colours for good news,
 * dry browns for bad.
 */
export function paletteForVariable(variable: SeasonalVariableId): TercilePalette {
  switch (variable) {
    case 'onset':
      return relabel(REVERSED_RAINFALL, ['Much earlier', 'Earlier', 'Later', 'Much later']);
    case 'cessation':
      return relabel(RAINFALL_PALETTE, ['Much earlier', 'Earlier', 'Later', 'Much later']);
    case 'earlyDrySpell':
    case 'lateDrySpell':
      return relabel(REVERSED_RAINFALL, ['Much shorter', 'Shorter', 'Longer', 'Much longer']);
    case 'rainyDays':
      return relabel(RAINFALL_PALETTE, ['Many fewer', 'Fewer', 'More', 'Many more']);
    case 'temperature':
      return TEMPERATURE_PALETTE;
    default:
      return RAINFALL_PALETTE;
  }
}

/** The three probability rows in the region card, below to above. */
export function categoryLabels(variable: SeasonalVariableId): [string, string, string] {
  switch (variable) {
    case 'onset':
      return ['Earlier start', 'Usual time', 'Later start'];
    case 'cessation':
      return ['Earlier end', 'Usual time', 'Later end'];
    case 'earlyDrySpell':
    case 'lateDrySpell':
      return ['Shorter', 'Near normal', 'Longer'];
    case 'rainyDays':
      return ['Fewer days', 'Near normal', 'More days'];
    case 'temperature':
      return ['Cooler than normal', 'Near normal', 'Warmer than normal'];
    default:
      return ['Drier than normal', 'Near normal', 'Wetter than normal'];
  }
}
