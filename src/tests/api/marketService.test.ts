import { listCommodities, listMarketCenters, listTrends } from '../../shared/api/marketService';
import { MOCK_COMMODITIES } from '../../shared/data/mockMarket';

/**
 * The market service's job is to turn three slug-keyed maps into arrays the
 * screens can read. These cover the two ways that went wrong in practice.
 */

function respondWith(body: unknown) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response),
  ) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

describe('listCommodities', () => {
  /* The regression that put "Price unavailable" on every card on device: the
     running backend keyed each commodity by slug but did not repeat the slug
     inside the entry, so reading dto.slug produced undefined and nothing
     matched the catalogue. The map key is the identifier. */
  it('identifies a commodity by its map key when the entry omits the slug', async () => {
    respondWith({
      success: true,
      data: {
        'yellow-maize': {
          price: 299.99,
          unit: 'per bag',
          trend: 'stable',
          demand: 'high',
          name: 'Yellow Maize',
          category: 'Maize',
        },
      },
    });

    const entry = (await listCommodities()).data.find((item) => item.slug === 'yellow-maize');

    expect(entry).toBeDefined();
    expect(entry!.price).toBe(299.99);
  });

  it('prefers the entry slug when the backend does send one', async () => {
    respondWith({
      success: true,
      data: {
        'yellow-maize': {
          slug: 'yellow-maize',
          price: 299.99,
          unit: 'per bag',
          trend: 'stable',
          demand: 'high',
          name: 'Yellow Maize',
          category: 'Maize',
        },
      },
    });

    expect((await listCommodities()).data.some((entry) => entry.slug === 'yellow-maize')).toBe(true);
  });

  /* A deployment whose SQLite seed never survived a read-only filesystem
     answers 200 with an empty map. That is not "no prices exist". */
  it('serves the seeded copy when the server answers with nothing', async () => {
    respondWith({ success: true, data: {} });

    const result = await listCommodities();

    expect(result.fallback).toBe('empty');
    expect(result.data).toHaveLength(MOCK_COMMODITIES.length);
  });

  it('serves the seeded copy when the server cannot be reached', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Network request failed')),
    ) as unknown as typeof fetch;

    const result = await listCommodities();

    expect(result.fallback).toBe('offline');
    expect(result.data).toHaveLength(MOCK_COMMODITIES.length);
  });

  /* A backend one deploy behind knows fourteen commodities but not poultry.
     Dropping the ones it has not caught up with would blank both chicken
     cards; live entries still win wherever the server does have one. */
  it('tops up commodities the server has not published, without overriding live prices', async () => {
    respondWith({
      success: true,
      data: {
        'yellow-maize': { price: 310, unit: 'per bag', trend: 'rising', demand: 'high', name: 'Yellow Maize', category: 'Maize' },
      },
    });

    const result = await listCommodities();

    expect(result.fallback).toBe('partial');
    expect(result.data).toHaveLength(MOCK_COMMODITIES.length);
    expect(result.data.find((entry) => entry.slug === 'yellow-maize')!.price).toBe(310);
    expect(result.data.find((entry) => entry.slug === 'poultry')!.price).toBe(45);
  });
});

describe('a complete response', () => {
  it('reports no fallback when the server publishes the whole catalogue', async () => {
    respondWith({
      success: true,
      data: Object.fromEntries(
        MOCK_COMMODITIES.map((entry) => [
          entry.slug,
          {
            price: entry.price,
            unit: entry.unit,
            trend: entry.trend,
            demand: entry.demand,
            name: entry.name,
            category: entry.category,
          },
        ]),
      ),
    });

    const result = await listCommodities();

    expect(result.fallback).toBeNull();
    expect(result.data).toHaveLength(MOCK_COMMODITIES.length);
  });
});

describe('listTrends', () => {
  it('camel-cases the payload and reads the "6months" series', async () => {
    respondWith({
      success: true,
      data: {
        'yellow-maize': {
          '6months': [280, 285, 290, 295, 298, 299.99],
          seasonal_pattern: 'Low during harvest',
          peak_months: [3, 4, 5],
          low_months: [7, 8, 9],
        },
      },
    });

    const trend = (await listTrends()).data['yellow-maize'];

    expect(trend.commoditySlug).toBe('yellow-maize');
    expect(trend.monthPrices).toHaveLength(6);
    expect(trend.seasonalPattern).toBe('Low during harvest');
    expect(trend.peakMonths).toEqual([3, 4, 5]);
    expect(trend.lowMonths).toEqual([7, 8, 9]);
  });
});

describe('listMarketCenters', () => {
  it('takes the region from the map key and camel-cases the rest', async () => {
    respondWith({
      success: true,
      data: {
        Ashanti: {
          major_markets: ['Kumasi Central Market', 'Kejetia Market'],
          transport_access: 'good',
          price_premium: 1.05,
        },
      },
    });

    const center = (await listMarketCenters()).data.find((entry) => entry.region === 'Ashanti');

    expect(center).toBeDefined();
    expect(center!.majorMarkets).toHaveLength(2);
    expect(center!.transportAccess).toBe('good');
    expect(center!.pricePremium).toBe(1.05);
  });
});
