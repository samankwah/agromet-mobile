import { buildSeasonalCells, hasDryWindow, hasProbabilities } from '../../features/forecasts/seasonal/cells';
import { GHANA_BOUNDARIES } from '../../shared/data/ghanaBoundaries';
import { seasonalCell, seasonalReading } from '../fixtures/seasonal';

const accraGrid = GHANA_BOUNDARIES.grid.filter((cell) => cell.regionName === 'Greater Accra');

/* The payload is one reading per region, so every display cell in a region takes
   that region's reading and the map comes out as flat regional blocks. */
describe('buildSeasonalCells', () => {
  it("paints every display cell in a region with that region's band", () => {
    const cells = buildSeasonalCells([seasonalCell('Greater Accra')], 'rainfall', 'probability');

    expect(cells).toHaveLength(accraGrid.length);
    expect(cells.every((cell) => cell.regionName === 'Greater Accra')).toBe(true);
    // 72% drier is a strong lean: the driest band.
    expect(new Set(cells.map((cell) => cell.value))).toEqual(new Set([0]));
  });

  it('writes the ensemble value in the average view', () => {
    const cells = buildSeasonalCells([seasonalCell('Greater Accra')], 'temperature', 'average');

    expect(new Set(cells.map((cell) => cell.value))).toEqual(new Set([33.4]));
  });

  it('matches region names whatever their spelling', () => {
    const cells = buildSeasonalCells([seasonalCell('GREATER ACCRA Region')], 'rainfall', 'probability');

    expect(cells).toHaveLength(accraGrid.length);
  });

  it('drops a region with no reading rather than painting it neutral', () => {
    const cells = buildSeasonalCells([seasonalCell('Greater Accra', { rainfall: null })], 'rainfall', 'probability');

    expect(cells).toEqual([]);
  });

  it('drops a region with no split in the probability view, but keeps it in the average view', () => {
    const noRecord = seasonalCell('Greater Accra', { rainfall: seasonalReading({ probabilities: undefined, category: undefined }) });

    expect(buildSeasonalCells([noRecord], 'rainfall', 'probability')).toEqual([]);
    expect(buildSeasonalCells([noRecord], 'rainfall', 'average')).toHaveLength(accraGrid.length);
  });

  it('paints a dry-season region as no signal, never as a lean', () => {
    const dry = seasonalCell('Greater Accra', { rainfall: seasonalReading({ dryWindow: true }) });
    const cells = buildSeasonalCells([dry], 'rainfall', 'probability');

    expect(new Set(cells.map((cell) => cell.value))).toEqual(new Set([2]));
  });

  it('draws nothing for an empty window', () => {
    expect(buildSeasonalCells([], 'rainfall', 'probability')).toEqual([]);
  });

  it('covers all sixteen regions when all sixteen are present', () => {
    const regions = [...new Set(GHANA_BOUNDARIES.grid.map((cell) => cell.regionName).filter(Boolean))] as string[];
    const cells = buildSeasonalCells(
      regions.map((region) => seasonalCell(region)),
      'rainfall',
      'probability',
    );

    expect(regions).toHaveLength(16);
    expect(new Set(cells.map((cell) => cell.regionName)).size).toBe(16);
  });
});

describe('hasDryWindow and hasProbabilities', () => {
  it('spot a dry-season region', () => {
    expect(hasDryWindow([seasonalCell('Northern', { rainfall: seasonalReading({ dryWindow: true }) })])).toBe(true);
    expect(hasDryWindow([seasonalCell('Northern')])).toBe(false);
  });

  it('do not count a dry-season split as a real one', () => {
    const dryOnly = seasonalCell('Northern', { rainfall: seasonalReading({ dryWindow: true }), temperature: null });

    expect(hasProbabilities([dryOnly])).toBe(false);
    expect(hasProbabilities([seasonalCell('Northern')])).toBe(true);
  });
});
