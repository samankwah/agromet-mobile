import { fetchPrecipField } from '../../shared/api/precipitation/openMeteoPrecipSource';

const GRID = [
  { lat: 6.0, lng: -1.0 },
  { lat: 6.25, lng: -1.0 },
];

const OPTIONS = { pastDays: 1, forecastDays: 2, stepDeg: 0.25 };

function backendField() {
  return {
    success: true,
    data: {
      grid: [
        [5.0, -2.0],
        [5.25, -2.0],
        [5.5, -2.0],
      ],
      stepDeg: 0.25,
      times: ['2026-08-27T00:00Z', '2026-08-27T01:00Z'],
      values: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      unavailable: false,
    },
  };
}

function directField() {
  return [
    { hourly: { time: ['2026-08-27T00:00', '2026-08-27T01:00'], precipitation: [0.5, null] } },
    { hourly: { time: ['2026-08-27T00:00', '2026-08-27T01:00'], precipitation: [1.5, 2.5] } },
  ];
}

const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe('fetchPrecipField', () => {
  afterEach(() => jest.restoreAllMocks());

  /* The proxy is the point, not an optimisation: Open-Meteo weights a request by
     its location count, so several hundred points from every device consumes the
     free tier in proportion to the user base. */
  it('prefers the backend, and uses the grid the backend returned', async () => {
    const fetchMock = jest.fn(async (input: string) => {
      expect(String(input)).toContain('/api/precipitation/field');
      return ok(backendField());
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const field = await fetchPrecipField(GRID, OPTIONS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Not the grid we passed in: whichever source answered owns the lattice,
    // because the grid and the values are positional.
    expect(field.grid).toHaveLength(3);
    expect(field.grid[0]).toEqual({ lat: 5.0, lng: -2.0 });
    expect(field.values[1]).toEqual([4, 5, 6]);
  });

  it('marks the backend times as UTC', async () => {
    globalThis.fetch = jest.fn(async () => ok(backendField())) as unknown as typeof fetch;

    const field = await fetchPrecipField(GRID, OPTIONS);

    expect(field.times[0]).toBe('2026-08-27T00:00:00.000Z');
  });

  /* A farmer whose backend is unreachable should still get a map, and one
     device occasionally going direct is not what breaks the budget. */
  it('falls back to Open-Meteo when the backend cannot be reached', async () => {
    const seen: string[] = [];
    globalThis.fetch = jest.fn(async (input: string) => {
      seen.push(String(input));
      if (String(input).includes('/api/precipitation/field')) throw new TypeError('Network request failed');
      return ok(directField());
    }) as unknown as typeof fetch;

    const field = await fetchPrecipField(GRID, OPTIONS);

    expect(seen[1]).toContain('api.open-meteo.com');
    expect(seen[1]).toContain('hourly=precipitation');
    expect(seen[1]).toContain('past_days=1');
    // The direct path has no grid of its own to report, so it echoes the one it
    // was asked to fetch.
    expect(field.grid).toEqual(GRID);
    // Rows are hours and columns are cells.
    expect(field.values).toEqual([
      [0.5, 1.5],
      [0, 2.5],
    ]);
  });

  /* A server error is a real answer. Routing around it would hide a broken
     deployment behind a quota the direct path is not sized for. */
  it('does not route around a backend error', async () => {
    const seen: string[] = [];
    globalThis.fetch = jest.fn(async (input: string) => {
      seen.push(String(input));
      if (String(input).includes('/api/precipitation/field')) {
        return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
      }
      return ok(directField());
    }) as unknown as typeof fetch;

    await expect(fetchPrecipField(GRID, OPTIONS)).rejects.toBeDefined();
    expect(seen.some((url) => url.includes('api.open-meteo.com'))).toBe(false);
  });

  /* An "unavailable" body means the backend's own upstream is down, which the
     device can still try to reach itself. */
  it('falls through when the backend reports the field unavailable', async () => {
    const seen: string[] = [];
    globalThis.fetch = jest.fn(async (input: string) => {
      seen.push(String(input));
      if (String(input).includes('/api/precipitation/field')) {
        return ok({ success: true, data: { grid: [], stepDeg: 0.25, times: [], values: [], unavailable: true } });
      }
      return ok(directField());
    }) as unknown as typeof fetch;

    const field = await fetchPrecipField(GRID, OPTIONS);

    expect(seen[1]).toContain('api.open-meteo.com');
    expect(field.times).toHaveLength(2);
  });
});
