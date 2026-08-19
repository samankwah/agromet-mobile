import {
  getSpatialOutlookGrid,
  periodOptionsFor,
  SPATIAL_SEASONS,
  SPATIAL_SUB_SEASONS,
  SPATIAL_VARIABLES,
} from '../../shared/api/spatialOutlookService';

const RAINFALL = 'rainfall-total';
const FIRST_SUB_SEASON = SPATIAL_SUB_SEASONS[0].id;
const NORTHERN = 'northern';

function query(overrides: Partial<Parameters<typeof getSpatialOutlookGrid>[0]> = {}) {
  return getSpatialOutlookGrid({
    variableId: RAINFALL,
    periodId: FIRST_SUB_SEASON,
    forecastView: 'deterministic',
    geography: 'region',
    ...overrides,
  });
}

describe('spatial outlook variables', () => {
  it('offers the agro-characteristics a seasonal forecast is planned around', () => {
    const ids = SPATIAL_VARIABLES.map((v) => v.id);
    for (const expected of [
      'onset',
      'cessation',
      'early-dry-spell',
      'late-dry-spell',
      'season-length',
      RAINFALL,
      'rain-days',
      'temperature-mean',
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it('scopes season-defining characteristics by Season, not by trimester', () => {
    // Ghana's north is unimodal and its south bimodal, so onset/cessation/
    // dry spells only mean something relative to a specific season.
    for (const id of ['onset', 'cessation', 'early-dry-spell', 'late-dry-spell', 'season-length']) {
      const variable = SPATIAL_VARIABLES.find((v) => v.id === id)!;
      expect(variable.periodKind).toBe('season');
      expect(periodOptionsFor(variable)).toBe(SPATIAL_SEASONS);
    }
  });

  it('scopes accumulations and averages by Sub-season', () => {
    for (const id of [RAINFALL, 'rain-days', 'temperature-mean']) {
      const variable = SPATIAL_VARIABLES.find((v) => v.id === id)!;
      expect(variable.periodKind).toBe('sub-season');
      expect(periodOptionsFor(variable)).toBe(SPATIAL_SUB_SEASONS);
    }
  });

  it('covers both Ghanaian rainfall regimes, with the south split into major and minor', () => {
    const ids = SPATIAL_SEASONS.map((s) => s.id);
    expect(ids).toEqual(['northern', 'southern-major', 'southern-minor']);
  });

  it('flags onset and cessation for week-of-month rendering', () => {
    for (const id of ['onset', 'cessation']) {
      expect(SPATIAL_VARIABLES.find((v) => v.id === id)?.valueFormat).toBe('day-of-year');
    }
    expect(SPATIAL_VARIABLES.find((v) => v.id === RAINFALL)?.valueFormat).toBe('number');
  });
});

describe('getSpatialOutlookGrid', () => {
  it('returns a non-empty grid backed by the real Ghana boundary/grid data', async () => {
    const dataset = await query();
    expect(dataset.cells.length).toBeGreaterThan(0);
  });

  it('every cell is tagged with a region name (the grid is pre-baked against real boundaries)', async () => {
    const dataset = await query();
    expect(dataset.cells.every((cell) => cell.regionName !== null)).toBe(true);
  });

  it('the legend min/max match the actual range of cell values', async () => {
    const dataset = await query();
    const values = dataset.cells.map((cell) => cell.value);
    expect(dataset.legend.min).toBe(Math.min(...values));
    expect(dataset.legend.max).toBe(Math.max(...values));
  });

  it('rejects a period drawn from the wrong vocabulary', async () => {
    // Onset over a trimester is a category error, not a fallback case.
    await expect(query({ variableId: 'onset', periodId: FIRST_SUB_SEASON })).rejects.toThrow();
    await expect(query({ variableId: RAINFALL, periodId: NORTHERN })).rejects.toThrow();
  });

  it('rejects an unknown variable id', async () => {
    await expect(query({ variableId: 'not-a-real-variable' })).rejects.toThrow();
  });

  it('produces the same grid for the same filters (deterministic mock, not random per call)', async () => {
    const [first, second] = [await query(), await query()];
    expect(first.cells.map((c) => c.value)).toEqual(second.cells.map((c) => c.value));
  });

  it('onset values differ per season — southern major rains arrive well before northern ones', async () => {
    const southern = await query({ variableId: 'onset', periodId: 'southern-major' });
    const northern = await query({ variableId: 'onset', periodId: 'northern' });
    // Day-of-year: the southern major season starts around March, the
    // northern season around May.
    expect(southern.legend.max).toBeLessThan(northern.legend.min);
  });

  it('dry spells are season-scoped too, with the short minor season carrying shorter spells', async () => {
    const minor = await query({ variableId: 'early-dry-spell', periodId: 'southern-minor' });
    const north = await query({ variableId: 'early-dry-spell', periodId: 'northern' });
    expect(minor.legend.max).toBeLessThan(north.legend.max);
  });

  it('probability view returns tercile categories, not continuous values', async () => {
    const dataset = await query({ forecastView: 'probability' });
    for (const cell of dataset.cells) {
      expect([0, 1, 2]).toContain(cell.value);
    }
    expect(dataset.legend.min).toBe(0);
    expect(dataset.legend.max).toBe(2);
    expect(dataset.legend.unit).not.toBe('mm');
  });

  it('deterministic view keeps the variable real units', async () => {
    const dataset = await query();
    expect(dataset.legend.unit).toBe('mm');
    expect(dataset.legend.max).toBeGreaterThan(2);
  });
});
