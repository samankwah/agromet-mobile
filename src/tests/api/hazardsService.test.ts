import { getHazardRegion, getHazardSummary, HAZARDS_UNAVAILABLE_MESSAGE } from '../../shared/api/hazardsService';
import { ServiceError } from '../../shared/api/mockDelay';

function respondWith(body: unknown, ok = true, status = 200) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response),
  ) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

const REGION = {
  region: 'Northern',
  agroZone: 'Guinea Savannah',
  flood: { score: 61, band: 'moderate' },
};

describe('getHazardSummary', () => {
  it('unwraps the response envelope', async () => {
    respondWith({ success: true, data: { regions: [REGION], national: null, unavailable: false } });
    const summary = await getHazardSummary();
    expect(summary.regions).toHaveLength(1);
    expect(summary.regions[0].region).toBe('Northern');
  });

  /* The backend answers 200 with `unavailable` rather than a 5xx. Left as a
     success it would be written straight over the offline cache by
     useCachedQuery, and a farmer opening the app during an outage would lose
     the readings they already had. */
  it('rejects an unavailable payload rather than letting it reach the cache', async () => {
    respondWith({ success: true, data: { regions: [], national: null, unavailable: true } });
    await expect(getHazardSummary()).rejects.toThrow(HAZARDS_UNAVAILABLE_MESSAGE);
  });

  it('rejects an empty region list even when the flag is absent', async () => {
    respondWith({ success: true, data: { regions: [], national: null } });
    await expect(getHazardSummary()).rejects.toBeInstanceOf(ServiceError);
  });
});

describe('getHazardRegion', () => {
  it('returns the region payload', async () => {
    respondWith({ success: true, data: REGION });
    await expect(getHazardRegion('Northern')).resolves.toMatchObject({ region: 'Northern' });
  });

  it('encodes a region name containing a space', async () => {
    respondWith({ success: true, data: REGION });
    await getHazardRegion('Greater Accra');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/hazards/regions/Greater%20Accra'),
      expect.anything(),
    );
  });

  /* "The server rejected the request (503)" is not something to put in front of
     a farmer, and a warming snapshot is seconds away, not an outage. */
  it('turns a cold snapshot into a readable message, keeping the status', async () => {
    respondWith({}, false, 503);
    await expect(getHazardRegion('Northern')).rejects.toThrow(/still being prepared/i);
    await expect(getHazardRegion('Northern')).rejects.toMatchObject({ status: 503 });
  });

  it('names the region when it has no readings', async () => {
    respondWith({}, false, 404);
    await expect(getHazardRegion('Atlantis')).rejects.toThrow(/No readings are published for Atlantis/);
  });
});
