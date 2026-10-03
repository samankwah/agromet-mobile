import {
  buildSeasonalOutlook,
  getSeasonalOutlook,
  getSeasonalOutlookSet,
  regionCell,
  summariseRainfall,
  summariseTemperature,
} from '../../shared/api/seasonalService';
import { normaliseRegion } from '../../shared/domain/seasonalOutlook';
import { seasonalCell, seasonalPayload, seasonalReading, seasonalWindow } from '../fixtures/seasonal';

function stub(data: unknown) {
  const mock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data }) });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getSeasonalOutlookSet', () => {
  it('carries every window and its provenance', async () => {
    stub(seasonalPayload());
    const set = await getSeasonalOutlookSet();

    expect(set.source).toBe('seas5');
    expect(set.windows.map((window) => window.label)).toEqual(['Nov to Jan', 'Dec to Feb', 'Jan to Mar']);
    expect(set.model).toContain('SEAS5');
    expect(set.baseline).toBe('ERA5 1995-2024');
    expect(set.runDate).toBe('2026-10-01');
    expect(set.modelWindows).toEqual([]);
  });

  it('fills the optional published-forecast fields with null, not undefined', async () => {
    stub(seasonalPayload());
    const set = await getSeasonalOutlookSet();

    expect(set.pdfUrl).toBeNull();
    expect(set.validFrom).toBeNull();
  });
});

/* The property worth guarding is that the reader gets their own region. The south
   and the far north often lean opposite ways, so a mismatch would not look like an
   error, it would look like a forecast for somewhere else. */
describe('getSeasonalOutlook', () => {
  it("takes the reading for the town's own region", async () => {
    stub(seasonalPayload());
    const outlook = await getSeasonalOutlook('accra');

    expect(outlook.region).toBe('Greater Accra');
    expect(outlook.windowLabel).toBe('Nov to Jan');
    expect(outlook.confidenceLevel).toBe('high');
    expect(outlook.plainLanguageSummary).toBe(
      'Greater Accra: 72% chance of a drier than normal season from Nov to Jan. This is a probability, not a certainty.',
    );
    expect(outlook.temperatureSummary).toBe('70% chance of a warmer than normal season from Nov to Jan.');
  });

  it('follows the season the reader picked', async () => {
    stub(seasonalPayload());
    const outlook = await getSeasonalOutlook('accra', '2026-12');

    expect(outlook.windowLabel).toBe('Dec to Feb');
    expect(outlook.plainLanguageSummary).toBe('The forecasts for Greater Accra do not agree, so treat this season as normal.');
  });

  it('says it is the dry season rather than forecasting rain in a dry window', async () => {
    stub(seasonalPayload());
    const outlook = await getSeasonalOutlook('tamale');

    expect(outlook.plainLanguageSummary).toBe(
      'This is the dry season in Northern. Little rain falls from Nov to Jan, so there is no rainfall outlook for these months.',
    );
    // The badge follows temperature when rainfall has nothing to say.
    expect(outlook.confidenceLevel).toBe('high');
  });

  it('matches region names whatever their spelling', async () => {
    stub(
      seasonalPayload({
        windows: [seasonalWindow('2026-11', 'Nov to Jan', [seasonalCell('greater accra region')])],
      }),
    );

    expect((await getSeasonalOutlook('accra')).region).toBe('greater accra region');
  });

  it('throws rather than borrowing another region when the town has none', async () => {
    stub(seasonalPayload());

    await expect(getSeasonalOutlook('wa')).rejects.toThrow('No seasonal outlook available for Upper West.');
  });

  describe('error priority', () => {
    it('says it is being prepared while computing, even after a failed fetch', async () => {
      stub(seasonalPayload({ windows: [], unavailable: true, computing: true, fetchFailed: true }));

      await expect(getSeasonalOutlook('accra')).rejects.toThrow('being prepared');
    });

    it('says the service did not answer when the fetch failed', async () => {
      stub(seasonalPayload({ windows: [], unavailable: true, fetchFailed: true }));

      await expect(getSeasonalOutlook('accra')).rejects.toThrow('The weather service did not answer. Try again in a moment.');
    });

    it('says nothing has been computed when the store is simply empty', async () => {
      stub(seasonalPayload({ windows: [], unavailable: true }));

      await expect(getSeasonalOutlook('accra')).rejects.toThrow('No seasonal outlook has been computed yet.');
    });
  });
});

describe('a published forecast', () => {
  it('adds what the model alone reads for the same window', async () => {
    stub(
      seasonalPayload({
        source: 'gmet',
        issuedBy: 'Ghana Meteorological Agency',
        modelWindows: [
          seasonalWindow('2026-11', 'Nov to Jan', [
            seasonalCell('Greater Accra', {
              rainfall: seasonalReading({ category: 'above', probabilities: { below: 0.1, normal: 0.3, above: 0.6 } }),
              temperature: null,
            }),
          ]),
        ],
      }),
    );
    const outlook = await getSeasonalOutlook('accra');

    expect(outlook.source).toBe('gmet');
    expect(outlook.modelSummary).toBe('The model alone reads: rainfall wetter than normal (60%).');
  });

  it('says nothing about the model for a window it did not cover', () => {
    const set = {
      ...seasonalPayload({ source: 'gmet', modelWindows: [seasonalWindow('2026-12', 'Dec to Feb', [seasonalCell('Greater Accra')])] }),
    } as unknown as Parameters<typeof buildSeasonalOutlook>[0];

    expect(buildSeasonalOutlook(set, 'accra', '2026-11').modelSummary).toBeNull();
  });
});

describe('the summaries', () => {
  it('give the average when there is no long-term record to compare with', () => {
    const reading = seasonalReading({ probabilities: undefined, category: undefined, value: 212.4 });

    expect(summariseRainfall(reading, 'Volta', 'Nov to Jan')).toBe(
      'Volta should get about 212 mm of rain from Nov to Jan. There is no long-term record here yet to compare it with.',
    );
  });

  it('treat a no-signal split as normal', () => {
    expect(summariseTemperature(seasonalReading({ noSignal: true }), 'Oti', 'Nov to Jan')).toBe(
      'The temperature forecasts for Oti do not agree, so expect normal temperatures.',
    );
  });

  it('never use a dash in what the farmer reads', () => {
    const sentences = [
      summariseRainfall(seasonalReading(), 'Ashanti', 'Nov to Jan'),
      summariseRainfall(seasonalReading({ dryWindow: true }), 'Ashanti', 'Nov to Jan'),
      summariseRainfall(seasonalReading({ confidence: 'low' }), 'Ashanti', 'Nov to Jan'),
      summariseRainfall(null, 'Ashanti', 'Nov to Jan'),
      summariseTemperature(seasonalReading({ category: 'below' }), 'Ashanti', 'Nov to Jan'),
    ];

    for (const sentence of sentences) expect(sentence).not.toMatch(/[–—]/);
  });
});

describe('regionCell and normaliseRegion', () => {
  it('strip a trailing "Region" and ignore case', () => {
    expect(normaliseRegion('  Bono East Region ')).toBe('bono east');
    const window = seasonalWindow('2026-11', 'Nov to Jan', [seasonalCell('North East')]);

    expect(regionCell(window, 'north east region')?.region).toBe('North East');
    expect(regionCell(window, 'Northern')).toBeUndefined();
  });
});
