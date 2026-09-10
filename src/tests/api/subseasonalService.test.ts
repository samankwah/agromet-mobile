import { getSubseasonalOutlook, getSubseasonalOutlookSet } from '../../shared/api/subseasonalService';

/**
 * The mapping from `/api/outlook/subseasonal` onto the card and the map.
 *
 * The property worth guarding is that the reader gets *their own* region. The
 * live run this was written against has the far north above normal while the
 * south is below, so a mismatch would not look like an error — it would look
 * like a forecast, of somewhere else.
 */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      cells: [
        {
          id: '10.00,-2.50',
          lat: 10.0,
          lng: -2.5,
          rainfall: {
            value: 118.4,
            probabilities: { below: 0.03, normal: 0.32, above: 0.65 },
            category: 'above',
            confidence: 'high',
            members: 31,
            noSignal: false,
            normal: 68.9,
          },
          temperature: {
            value: 33.9,
            probabilities: { below: 0.1, normal: 0.2, above: 0.7 },
            category: 'above',
            confidence: 'high',
            members: 31,
            noSignal: false,
            normal: 33.1,
          },
        },
        {
          id: '5.50,0.00',
          lat: 5.5,
          lng: 0.0,
          rainfall: {
            value: 12.1,
            probabilities: { below: 0.87, normal: 0.13, above: 0.0 },
            category: 'below',
            confidence: 'high',
            members: 31,
            noSignal: false,
            normal: 27.4,
          },
          temperature: null,
        },
      ],
      unavailable: false,
      issuedAt: '2026-08-24T00:00:00Z',
      windowStart: '2026-09-07',
      windowEnd: '2026-09-21',
      model: 'NOAA GEFS 0.5 degree',
      baseline: 'ERA5 1995-2024',
      stale: false,
      ...overrides,
    },
  };
}

function stub(body: unknown) {
  const mock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getSubseasonalOutlookSet', () => {
  it('carries the whole field and its provenance', async () => {
    stub(payload());
    const set = await getSubseasonalOutlookSet();

    expect(set.cells).toHaveLength(2);
    expect(set.unavailable).toBe(false);
    expect(set.windowStart).toBe('2026-09-07');
    expect(set.model).toContain('GEFS');
    expect(set.baseline).toBe('ERA5 1995-2024');
  });

  it('reports an uncomputed outlook as unavailable', async () => {
    // Never as a flat 33/33/33, which on a map is indistinguishable from a real
    // forecast of no signal.
    stub(payload({ cells: [], unavailable: true }));
    const set = await getSubseasonalOutlookSet();

    expect(set.unavailable).toBe(true);
    expect(set.cells).toEqual([]);
  });
});

describe('getSubseasonalOutlook', () => {
  it('gives a reader the cell covering their own town', async () => {
    stub(payload());
    const outlook = await getSubseasonalOutlook('wa');

    // Wa is in Upper West, which is the above-normal one here.
    expect(outlook.region).toBe('Upper West');
    expect(outlook.rainfallOutlook.category).toBe('above-normal');
    expect(outlook.rainfallOutlook.probabilityPct).toBe(65);
    expect(outlook.confidenceLevel).toBe('high');
  });

  it('does not hand one town the answer for another', async () => {
    stub(payload());
    const accra = await getSubseasonalOutlook('accra');

    expect(accra.region).toBe('Greater Accra');
    expect(accra.rainfallOutlook.category).toBe('below-normal');
    expect(accra.rainfallOutlook.probabilityPct).toBe(87);
  });

  it('takes the cell covering the town, not an average of the country', async () => {
    // On a grid there is always a nearest cell, so the old "no region" case is
    // gone. What matters is that the nearest one wins: a national average across
    // a country dry in the south and wet in the north would report "normal" to
    // everybody.
    stub(payload());
    const kumasi = await getSubseasonalOutlook('kumasi');

    // Kumasi (6.69, -1.62) is far closer to the southern cell than the Upper
    // West one, so it must read the southern forecast.
    expect(kumasi.rainfallOutlook.category).toBe('below-normal');
  });

  it('refuses for a town it does not know', async () => {
    stub(payload());
    await expect(getSubseasonalOutlook('not-a-town')).rejects.toThrow(/not-a-town/);
  });

  it('refuses when nothing has been computed', async () => {
    stub(payload({ cells: [], unavailable: true }));
    await expect(getSubseasonalOutlook('wa')).rejects.toThrow();
  });

  it('takes its window from the response, not from the clock', async () => {
    stub(payload());
    const outlook = await getSubseasonalOutlook('wa');

    expect(outlook.weekRangeStart).toBe('2026-09-07');
    expect(outlook.weekRangeEnd).toBe('2026-09-21');
  });

  describe('the sentence beside the numbers', () => {
    it('says there is no clear signal when the ensemble is split', async () => {
      // The old placeholder told every town the same story regardless of the
      // numbers. 39/29/32 and 87/13/0 deserve different sentences.
      stub(
        payload({
          cells: [
            {
              id: '10.00,-2.50',
              lat: 10.0,
              lng: -2.5,
              rainfall: {
                value: 70.2,
                probabilities: { below: 0.39, normal: 0.29, above: 0.32 },
                category: 'below',
                confidence: 'low',
                members: 31,
                noSignal: false,
                normal: 68.9,
              },
              temperature: null,
            },
          ],
        }),
      );
      const outlook = await getSubseasonalOutlook('wa');

      expect(outlook.plainLanguageSummary).toMatch(/no clear signal/i);
      expect(outlook.farmerActionCard.headline).toBe('Plan with flexibility');
    });

    it('says so plainly when the dry season has no spread to measure', async () => {
      stub(
        payload({
          cells: [
            {
              id: '10.00,-2.50',
              lat: 10.0,
              lng: -2.5,
              rainfall: {
                value: 0,
                probabilities: { below: 0, normal: 1, above: 0 },
                category: 'normal',
                confidence: 'low',
                members: 31,
                noSignal: true,
                normal: 0,
              },
              temperature: null,
            },
          ],
        }),
      );
      const outlook = await getSubseasonalOutlook('wa');

      expect(outlook.plainLanguageSummary).toMatch(/dry period/i);
    });

    it('names the member count when there is a real signal', async () => {
      stub(payload());
      const outlook = await getSubseasonalOutlook('wa');

      expect(outlook.plainLanguageSummary).toContain('65%');
      expect(outlook.plainLanguageSummary).toContain('31');
      // Always paired with the caveat, per the domain type's own rule.
      expect(outlook.plainLanguageSummary).toMatch(/not a certainty/i);
    });
  });
});
