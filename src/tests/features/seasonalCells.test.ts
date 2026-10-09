import {
  buildSeasonalCells,
  categoryLabels,
  hasDryWindow,
  hasProbabilities,
  paletteForVariable,
  stopsFor,
  valueFormatFor,
  wholeDayRange,
} from '../../features/forecasts/seasonal/cells';
import { GHANA_BOUNDARIES } from '../../shared/data/ghanaBoundaries';
import { DRY_SPELL_STOPS, RAINFALL_STOPS } from '../../shared/utils/colorScale';
import { normalOnly, seasonalCell, seasonalReading } from '../fixtures/seasonal';

const accraGrid = GHANA_BOUNDARIES.grid.filter((cell) => cell.regionName === 'Greater Accra');

/* One reading per region, so every display cell in a region takes that region's
   reading and the map comes out as flat regional blocks. */
describe('buildSeasonalCells', () => {
  it("paints every display cell in a region with that region's band", () => {
    const cells = buildSeasonalCells([seasonalCell('Greater Accra', { onset: seasonalReading() })], 'onset', 'probability');

    expect(cells).toHaveLength(accraGrid.length);
    expect(cells.every((cell) => cell.regionName === 'Greater Accra')).toBe(true);
    // 72% earlier is a strong lean: the first band.
    expect(new Set(cells.map((cell) => cell.value))).toEqual(new Set([0]));
  });

  it('writes the ensemble median in the deterministic view', () => {
    const cells = buildSeasonalCells([seasonalCell('Greater Accra', { onset: seasonalReading() })], 'onset', 'deterministic');

    expect(new Set(cells.map((cell) => cell.value))).toEqual(new Set([70]));
  });

  it('paints a season beyond reach by its normal, whatever the view', () => {
    const cells = buildSeasonalCells([seasonalCell('Greater Accra', { cessation: normalOnly() })], 'cessation', 'probability');

    expect(new Set(cells.map((cell) => cell.value))).toEqual(new Set([280]));
  });

  it('leaves regions outside the season unpainted', () => {
    const cells = buildSeasonalCells([seasonalCell('Northern', { onset: seasonalReading() })], 'onset', 'probability');

    expect(cells.some((cell) => cell.regionName === 'Greater Accra')).toBe(false);
    expect(cells.every((cell) => cell.regionName === 'Northern')).toBe(true);
  });

  it('drops a region with no reading rather than painting it neutral', () => {
    expect(buildSeasonalCells([seasonalCell('Greater Accra')], 'rainyDays', 'probability')).toEqual([]);
  });

  it('paints a dry window as no signal in the probability view', () => {
    const dry = seasonalCell('Greater Accra', { rainfallTotal: seasonalReading({ dryWindow: true }) });

    expect(new Set(buildSeasonalCells([dry], 'rainfallTotal', 'probability').map((cell) => cell.value))).toEqual(new Set([2]));
    expect(hasDryWindow([dry], 'rainfallTotal')).toBe(true);
    expect(hasDryWindow([dry], 'rainyDays')).toBe(false);
  });
});

describe('hasProbabilities', () => {
  it('counts only real forecast splits', () => {
    expect(hasProbabilities([seasonalCell('Ashanti', { onset: seasonalReading() })], 'onset')).toBe(true);
    expect(hasProbabilities([seasonalCell('Ashanti', { onset: normalOnly() })], 'onset')).toBe(false);
  });
});

describe('legends and keys', () => {
  it('writes dates as weeks and picks a ramp that fits each variable', () => {
    expect(valueFormatFor('onset')).toBe('day-of-year');
    expect(valueFormatFor('rainyDays')).toBe('days');
    expect(valueFormatFor('earlyDrySpell')).toBe('days');
    expect(valueFormatFor('rainfallTotal')).toBe('number');
    expect(stopsFor('lateDrySpell')).toBe(DRY_SPELL_STOPS);
    expect(stopsFor('rainfallTotal')).toBe(RAINFALL_STOPS);
  });

  it('widens a day count to whole-day legend edges, so no two labels read the same', () => {
    // 2 to 6 days over six classes would put edges on 2.7 and 3.3, both "3".
    expect(wholeDayRange({ min: 2, max: 6 })).toEqual({ min: 2, max: 8 });
    expect(wholeDayRange({ min: 1.4, max: 20.2 })).toEqual({ min: 1, max: 25 });
  });

  it('names the bands in the words of each variable', () => {
    expect(paletteForVariable('onset').map((band) => band.label)).toEqual(['Much earlier', 'Earlier', 'No signal', 'Later', 'Much later']);
    expect(paletteForVariable('earlyDrySpell')[4].label).toBe('Much longer');
    expect(categoryLabels('cessation')).toEqual(['Earlier end', 'Usual time', 'Later end']);
  });

  it('keeps good news in wet colours: an early onset looks like a wet season, a long dry spell like a dry one', () => {
    const rain = paletteForVariable('rainfallTotal');
    expect(paletteForVariable('onset')[0].color).toBe(rain[4].color);
    expect(paletteForVariable('lateDrySpell')[4].color).toBe(rain[0].color);
  });
});
