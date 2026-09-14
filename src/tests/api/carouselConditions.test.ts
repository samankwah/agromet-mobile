import { getCarouselConditions } from '../../shared/api/weatherService';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';

/**
 * The strip behind the Home carousel.
 *
 * The property worth guarding is the pairing. Open-Meteo answers a
 * comma-separated coordinate list with a bare array in request order, so a town
 * and its reading are joined by index and nothing else — and if that slipped,
 * every card would still show a plausible Ghanaian temperature for the wrong
 * place. There is no symptom to notice. Hence keying by id, and hence this.
 */
function stubBatch(entries: unknown) {
  const mock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => entries,
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

function reading(temperature: number, code = 0) {
  return { current: { time: '2026-08-23T12:00', temperature_2m: temperature, weather_code: code } };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getCarouselConditions', () => {
  it('asks once for every town, not once per town', () => {
    // The whole reason this function exists. Thirty-two separate requests, each
    // returning 7 daily and 168 hourly readings, is over a megabyte to render a
    // strip of numbers.
    const fetchMock = stubBatch(HOME_LOCATIONS.map((_, index) => reading(20 + index)));
    return getCarouselConditions().then(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain('current=temperature_2m%2Cweather_code');
      // No daily or hourly series: the carousel shows one number per card.
      expect(url).not.toContain('hourly=');
      expect(url).not.toContain('daily=');
      expect(decodeURIComponent(url).split('latitude=')[1].split('&')[0].split(',')).toHaveLength(
        HOME_LOCATIONS.length,
      );
    });
  });

  it('pairs each reading with the town that asked for it', async () => {
    const byId = await getCarouselConditions();

    // Distinct temperatures, so a shifted pairing cannot pass by coincidence.
    HOME_LOCATIONS.forEach((location, index) => {
      expect(byId[location.id]?.temperatureC).toBe(20 + index);
    });
  });

  it('leaves out a town the service could not answer for', async () => {
    // Absent, never invented — the card shows its placeholder instead of a
    // number that looks like a measurement.
    stubBatch([reading(27), null, ...HOME_LOCATIONS.slice(2).map(() => reading(30))]);
    const byId = await getCarouselConditions();

    expect(byId[HOME_LOCATIONS[0].id]?.temperatureC).toBe(27);
    expect(byId[HOME_LOCATIONS[1].id]).toBeUndefined();
    expect(byId[HOME_LOCATIONS[2].id]?.temperatureC).toBe(30);
  });

  it('reads a night code as night, so no sun is drawn after dusk', async () => {
    stubBatch(
      HOME_LOCATIONS.map(() => ({
        current: { time: '2026-08-23T21:00', temperature_2m: 24, weather_code: 0 },
      })),
    );
    const byId = await getCarouselConditions();
    expect(byId[HOME_LOCATIONS[0].id]?.condition).toBe('Clear night');
  });
});

beforeEach(() => {
  stubBatch(HOME_LOCATIONS.map((_, index) => reading(20 + index)));
});
