import {
  floorToStep,
  GIBS_MAX_ZOOM,
  GIBS_STEP_MINUTES,
  observedFrames,
  resolveHorizon,
  tileUrlTemplate,
  toGibsTime,
} from '../../shared/api/precipitation/gibsSource';

describe('floorToStep', () => {
  it('floors to the previous half hour', () => {
    expect(floorToStep(new Date('2026-08-26T13:47:12.500Z')).toISOString()).toBe('2026-08-26T13:30:00.000Z');
    expect(floorToStep(new Date('2026-08-26T13:29:59.999Z')).toISOString()).toBe('2026-08-26T13:00:00.000Z');
  });

  it('leaves an exact half hour alone', () => {
    expect(floorToStep(new Date('2026-08-26T13:30:00.000Z')).toISOString()).toBe('2026-08-26T13:30:00.000Z');
  });

  /* The frames run backwards from the horizon, so the arithmetic crosses
     midnight on most evenings. Getting this wrong asks GIBS for tomorrow. */
  it('steps back across a UTC midnight', () => {
    expect(floorToStep(new Date('2026-08-27T00:14:00.000Z')).toISOString()).toBe('2026-08-27T00:00:00.000Z');
    expect(floorToStep(new Date('2026-01-01T00:05:00.000Z')).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('toGibsTime', () => {
  /* GIBS wants seconds and a Z. Sending JavaScript's milliseconds gets a 404,
     which would look exactly like an archive gap. */
  it('drops milliseconds', () => {
    expect(toGibsTime(new Date('2026-08-26T13:30:00.000Z'))).toBe('2026-08-26T13:30:00Z');
  });
});

describe('tileUrlTemplate', () => {
  const url = tileUrlTemplate('2026-08-26T13:30:00Z');

  it('substitutes the time', () => {
    expect(url).toContain('/default/2026-08-26T13:30:00Z/');
  });

  /* MapLibre fills these in itself, so they must survive. WMTS addresses tiles
     as TileMatrix/TileRow/TileCol, which is why y precedes x. */
  it('leaves the tile placeholders for MapLibre, in WMTS order', () => {
    expect(url).toContain('/{z}/{y}/{x}.png');
  });
});

describe('observedFrames', () => {
  const horizon = new Date('2026-08-26T13:30:00.000Z');

  it('ends at the horizon and reads forward in time', () => {
    const frames = observedFrames(horizon, 4);

    expect(frames).toHaveLength(4);
    expect(frames[frames.length - 1].validAt).toBe(horizon.toISOString());
    expect(frames.map((frame) => frame.validAt)).toEqual([...frames.map((frame) => frame.validAt)].sort());
  });

  it('steps at the satellite cadence', () => {
    const frames = observedFrames(horizon, 3);
    const gaps = frames.slice(1).map((frame, i) => Date.parse(frame.validAt) - Date.parse(frames[i].validAt));

    expect(gaps).toEqual([GIBS_STEP_MINUTES * 60_000, GIBS_STEP_MINUTES * 60_000]);
  });

  /* maxzoom is not cosmetic: without it MapLibre requests levels GIBS does not
     publish for this layer, and every one of them 404s. */
  it('carries the tile ceiling GIBS actually publishes', () => {
    const [frame] = observedFrames(horizon, 1);

    expect(frame.kind).toBe('observed');
    expect(frame.render).toMatchObject({ type: 'raster', maxZoom: GIBS_MAX_ZOOM });
  });
});

describe('resolveHorizon', () => {
  /* GIBS answers 404 for a time outside the archive, so a miss means "walk
     back", not "give up". This is the whole reason the probe exists rather
     than a fixed latency constant. */
  it('walks back until a timestamp exists', async () => {
    const seen: string[] = [];
    const fetchMock = jest.fn(async (url: string) => {
      seen.push(url);
      // Reject the first two candidates, accept the third.
      return { ok: seen.length >= 3 } as Response;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const now = new Date('2026-08-26T20:00:00.000Z');
    const horizon = await resolveHorizon(now);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Two 30-minute steps back from the first candidate.
    const firstCandidate = floorToStep(new Date(now.getTime() - 6.5 * 60 * 60 * 1000));
    expect(horizon.getTime()).toBe(firstCandidate.getTime() - 2 * GIBS_STEP_MINUTES * 60_000);
  });
});
