import {
  buildSeasonalOutlook,
  buildSummary,
  getSeasonalOutlookSet,
  pickBlock,
  readyFrom,
  regionCell,
  summariseReading,
} from '../../shared/api/seasonalService';
import { VARIABLE_INFO, formatYearMonth, normaliseRegion, sectorOf } from '../../shared/domain/seasonalOutlook';
import { normalOnly, seasonalPayload, seasonalReading } from '../fixtures/seasonal';

function stub(data: unknown) {
  const mock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data }) });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

async function loadSet(overrides: Record<string, unknown> = {}) {
  stub(seasonalPayload(overrides));
  return getSeasonalOutlookSet();
}

describe('getSeasonalOutlookSet', () => {
  it('carries the three seasons, the three windows and their provenance', async () => {
    const set = await loadSet();

    expect(set.source).toBe('seas5');
    expect(Object.keys(set.seasons).sort()).toEqual(['northern', 'southern-major', 'southern-minor']);
    expect(Object.keys(set.windows)).toEqual(['MAM', 'MJJ', 'JAS', 'SON']);
    expect(set.model).toContain('SEAS5');
    expect(set.baseline).toBe('ERA5 1995-2024');
    expect(set.runDate).toBe('2026-10-01');
    expect(set.modelSeasons).toEqual({});
    expect(set.pdfUrl).toBeNull();
  });

  it('treats a payload from an older server, with windows as a list, as no outlook rather than crashing', async () => {
    const set = await loadSet({ seasons: undefined, windows: [{ key: '2026-11', cells: [] }] });

    expect(set.unavailable).toBe(true);
    expect(set.windows).toEqual({});
  });
});

describe('picking a season or a window', () => {
  it('reads season variables from the season and the rest from the window', async () => {
    const set = await loadSet();

    expect(pickBlock(set, 'onset', 'northern', 'MAM')?.label).toBe('Northern Single Season');
    expect(pickBlock(set, 'rainyDays', 'northern', 'MJJ')?.label).toBe('May to July');
  });

  it('matches region names whatever their spelling', async () => {
    const set = await loadSet();

    expect(regionCell(set.seasons['southern-major'], 'GREATER ACCRA Region')?.region).toBe('Greater Accra');
    expect(normaliseRegion(' Bono  East Region ')).toBe('bono east');
  });

  it('says when the forecast will be ready only when every region is a normal', async () => {
    const set = await loadSet();

    expect(readyFrom(set.seasons['southern-minor'], 'onset')).toBe('May 2027');
    expect(readyFrom(set.seasons['southern-major'], 'onset')).toBeNull();
    expect(formatYearMonth('2027-02')).toBe('February 2027');
  });

  it('joins the two main seasons for All Seasons, each region once', async () => {
    const set = await loadSet();
    const all = pickBlock(set, 'onset', 'all', 'MAM');

    expect(all?.label).toBe('All Seasons');
    expect(all?.cells.map((cell) => cell.region).sort()).toEqual(['Ashanti', 'Greater Accra', 'Northern']);
  });

  it('gives each half of the country its own ready month when they differ', async () => {
    const set = await loadSet();
    const north = {
      key: 'northern',
      label: 'N',
      year: 2027,
      cells: [{ id: 'Northern', region: 'Northern', lat: 9, lng: -1, onset: normalOnly({ availableFrom: '2027-02' }) }],
    };
    const south = {
      key: 'southern-major',
      label: 'S',
      year: 2027,
      cells: [{ id: 'Ashanti', region: 'Ashanti', lat: 7, lng: -1, onset: normalOnly({ availableFrom: '2026-12' }) }],
    };
    const block = pickBlock({ ...set, seasons: { northern: north, 'southern-major': south } }, 'onset', 'all', 'MAM');

    expect(readyFrom(block, 'onset')).toBe('December 2026 in the south and February 2027 in the north');
  });

  it('knows which half of the country each region farms in', () => {
    expect(sectorOf('Upper East')).toBe('north');
    expect(sectorOf('Ashanti')).toBe('south');
  });
});

describe('the plain sentences', () => {
  it('names the chance, the direction and the week for an onset', () => {
    expect(summariseReading(seasonalReading(), 'onset', 'Ashanti', 'Southern Major Season')).toBe(
      '72% chance the start of the rains in Ashanti is earlier than usual, around Week 2 of March. This is a probability, not a certainty.',
    );
  });

  it('says a season out of reach is the normal and when the forecast comes', () => {
    expect(summariseReading(normalOnly(), 'cessation', 'Volta', 'Southern Minor Season')).toBe(
      'The forecast for the Southern Minor Season will be ready from May 2027. Normally the end of the rains in Volta is around Week 1 of October.',
    );
  });

  it('says plainly when most years have no clear start', () => {
    const reading = normalOnly({ normalDisplay: 'No clear start in most years' });

    expect(summariseReading(reading, 'onset', 'Greater Accra', 'Southern Minor Season')).toMatch(/is no clear start in most years\.$/);
  });

  it('does not call a direction when the runs disagree', () => {
    const reading = seasonalReading({
      category: 'normal',
      probabilities: { below: 0.3, normal: 0.4, above: 0.3 },
      confidence: 'low',
      display: '9 days',
      normalDisplay: '8 days',
    });

    expect(summariseReading(reading, 'lateDrySpell', 'Bono', 'Southern Major Season')).toBe(
      'The forecasts for Bono do not agree, so plan for a normal longest dry spell late in the season, about 8 days.',
    );
  });

  it('says the dry season is the dry season, never that rain is forecast', () => {
    const reading = seasonalReading({ dryWindow: true });

    expect(summariseReading(reading, 'rainfallTotal', 'Northern', 'March to May')).toMatch(/^This is the dry season in Northern/);
  });

  it('uses no dashes in any variable label', () => {
    for (const info of Object.values(VARIABLE_INFO)) {
      expect(info.label).not.toMatch(/[–—]/);
    }
  });
});

describe("the reader's own town card", () => {
  it('reads the chosen variable in the chosen season for the town', async () => {
    const set = await loadSet();
    const outlook = buildSeasonalOutlook(set, 'accra', 'onset', 'southern-major', 'MAM');

    expect(outlook.region).toBe('Greater Accra');
    expect(outlook.confidenceLevel).toBe('high');
    expect(outlook.plainLanguageSummary).toMatch(/^72% chance the start of the rains in Greater Accra is earlier than usual/);
  });

  it('under All Variables and All Seasons, reads the town in its own main season and lists everything', async () => {
    const set = await loadSet();
    const outlook = buildSeasonalOutlook(set, 'tamale', 'all', 'all', 'MAM');

    expect(outlook.plainLanguageSummary).toMatch(/dry season in Northern/);
    expect(outlook.summary?.seasonLabel).toBe('Northern Single Season');
    expect(outlook.summary?.windowRows.map((row) => row.label)).toEqual([
      'Rainfall Total (mm)',
      'Number of Rainy Days (days)',
      'Temperature (°C)',
    ]);
  });

  it('marks normals in the summary so they are never read as forecasts', async () => {
    const set = await loadSet();
    const summary = buildSummary(set, 'Greater Accra', 'southern-major');

    expect(summary.windowRows[0].values.MAM).toEqual({ text: '420 mm', isNormal: false, lean: 'more than usual (60%)' });
    expect(summary.windowRows[0].values.JAS.isNormal).toBe(true);
    expect(summary.hasNormals).toBe(true);
  });

  it('points a southern town away from the northern season', async () => {
    const set = await loadSet();
    const outlook = buildSeasonalOutlook(set, 'accra', 'onset', 'northern', 'MAM');

    expect(outlook.plainLanguageSummary).toBe(
      'Greater Accra does not have the Northern Single Season. Choose a southern season to see Accra.',
    );
    expect(outlook.confidenceLevel).toBeNull();
  });

  it('gives no badge to a normal', async () => {
    const set = await loadSet();
    const outlook = buildSeasonalOutlook(set, 'accra', 'temperature', 'southern-major', 'JAS');

    expect(outlook.confidenceLevel).toBeNull();
    expect(outlook.plainLanguageSummary).toMatch(/^The forecast for July to September will be ready from May 2027/);
  });

  it('adds what the model alone reads beside a published forecast', async () => {
    const payload = seasonalPayload();
    const set = await loadSet({ source: 'gmet', issuedBy: 'Ghana Meteorological Agency', modelSeasons: payload.seasons });
    const outlook = buildSeasonalOutlook(set, 'accra', 'onset', 'southern-major', 'MAM');

    expect(outlook.modelSummary).toBe('The model alone reads: earlier than usual (72%).');
  });

  it('says the outlook is being prepared while the server builds it', async () => {
    const set = await loadSet({ seasons: {}, windows: {}, unavailable: true, computing: true });

    expect(() => buildSeasonalOutlook(set, 'accra', 'onset', 'southern-major', 'MAM')).toThrow(/being prepared/);
  });
});
