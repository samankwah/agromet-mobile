import { skyPhase, skyScene, type SkyReading } from '../../shared/domain/skyScene';

/** A local time on a fixed day, as the reading's `observedAt` would carry it. */
const at = (hours: number, minutes = 0) => new Date(2026, 10, 7, hours, minutes).toISOString();

const reading = (overrides: Partial<SkyReading> = {}): SkyReading => ({
  weatherCode: 2,
  isDay: true,
  observedAt: at(12),
  ...overrides,
});

const cover = (low: number, mid = 0, high = 0, total = Math.max(low, mid, high)) => ({ total, low, mid, high });

/** How blue a colour is: blue minus the mean of red and green. */
const blueness = ([r, g, b]: [number, number, number]) => b - (r + g) / 2;

describe('skyPhase', () => {
  it('is dawn for the hour and a half around sunrise', () => {
    expect(skyPhase(false, at(5, 29))).toBe('night');
    expect(skyPhase(false, at(5, 30))).toBe('dawn');
    expect(skyPhase(true, at(6, 59))).toBe('dawn');
    expect(skyPhase(true, at(7, 0))).toBe('day');
  });

  it('is dusk for the hour and a half around sunset', () => {
    expect(skyPhase(true, at(17, 29))).toBe('day');
    expect(skyPhase(true, at(17, 30))).toBe('dusk');
    expect(skyPhase(false, at(18, 59))).toBe('dusk');
    expect(skyPhase(false, at(19, 0))).toBe('night');
  });

  it('falls back to the day flag for an unreadable time', () => {
    expect(skyPhase(true, 'not-a-date')).toBe('day');
    expect(skyPhase(false, 'not-a-date')).toBe('night');
  });
});

describe('skyScene cloud amount', () => {
  it('draws the measured cover at each height', () => {
    const scene = skyScene(reading({ cloudCover: cover(12, 40, 80, 85) }));
    expect(scene.measured).toBe(true);
    expect(scene.cover).toEqual({ low: 0.12, mid: 0.4, high: 0.8 });
  });

  it('estimates the cover from the weather code when the reading has none', () => {
    const clear = skyScene(reading({ weatherCode: 0 }));
    const storm = skyScene(reading({ weatherCode: 95 }));
    expect(clear.measured).toBe(false);
    expect(clear.cover.low).toBeLessThan(0.1);
    expect(storm.cover.low).toBe(1);
  });

  it('follows the measurement over the code: a "partly cloudy" code under a full deck draws the deck', () => {
    expect(skyScene(reading({ weatherCode: 2, cloudCover: cover(100) })).cover.low).toBe(1);
  });
});

describe('skyScene light', () => {
  it('is blue with a few clouds, and grey under a full deck', () => {
    const fewClouds = skyScene(reading({ cloudCover: cover(15) }));
    const overcast = skyScene(reading({ cloudCover: cover(100) }));
    expect(blueness(fewClouds.skyTop)).toBeGreaterThan(0.2);
    expect(blueness(overcast.skyTop)).toBeLessThan(0.1);
  });

  it('turns grey whenever it is raining, whatever the cover figures say', () => {
    const rain = skyScene(reading({ weatherCode: 61, cloudCover: cover(30) }));
    expect(blueness(rain.skyTop)).toBeLessThan(0.1);
    expect(rain.precip).toBe('rain');
  });

  it('is darker in a storm than under ordinary overcast', () => {
    const overcast = skyScene(reading({ weatherCode: 3, cloudCover: cover(100) }));
    const storm = skyScene(reading({ weatherCode: 95, cloudCover: cover(100) }));
    const brightness = (c: [number, number, number]) => c[0] + c[1] + c[2];
    expect(brightness(storm.skyTop)).toBeLessThan(brightness(overcast.skyTop));
    expect(storm.lightning).toBe(true);
  });

  it('dims the sun as the cloud thickens, and has none at night', () => {
    expect(skyScene(reading({ cloudCover: cover(5) })).sunGlow).toBeGreaterThan(0.8);
    expect(skyScene(reading({ cloudCover: cover(100) })).sunGlow).toBe(0);
    expect(skyScene(reading({ isDay: false, observedAt: at(23), cloudCover: cover(5) })).sunGlow).toBe(0);
  });

  it('shows stars only on a clear night', () => {
    expect(skyScene(reading({ isDay: false, observedAt: at(23), cloudCover: cover(0) })).stars).toBe(1);
    expect(skyScene(reading({ isDay: false, observedAt: at(23), cloudCover: cover(100) })).stars).toBe(0);
    expect(skyScene(reading({ cloudCover: cover(0) })).stars).toBe(0);
  });

  it('colours dawn and dusk differently from the day and from each other', () => {
    const day = skyScene(reading({ cloudCover: cover(5) }));
    const dawn = skyScene(reading({ observedAt: at(6), cloudCover: cover(5) }));
    const dusk = skyScene(reading({ observedAt: at(18), cloudCover: cover(5) }));
    expect(dawn.phase).toBe('dawn');
    expect(dusk.phase).toBe('dusk');
    expect(dawn.skyBottom).not.toEqual(day.skyBottom);
    expect(dawn.skyBottom).not.toEqual(dusk.skyBottom);
  });
});

describe('skyScene haze', () => {
  it('has none in clear air, and thickens as visibility drops', () => {
    expect(skyScene(reading({ visibilityM: 24_000 })).haze).toBe(0);
    const harmattan = skyScene(reading({ visibilityM: 3_000 })).haze;
    const thick = skyScene(reading({ visibilityM: 800 })).haze;
    expect(harmattan).toBeGreaterThan(0.3);
    expect(thick).toBeGreaterThan(harmattan);
  });

  it('is thick in fog even without a visibility figure', () => {
    expect(skyScene(reading({ weatherCode: 45 })).haze).toBeGreaterThanOrEqual(0.9);
  });
});

describe('skyScene glass', () => {
  it('gives cards a see-through colour that follows the sky', () => {
    const clear = skyScene(reading({ cloudCover: cover(5) })).glass;
    const grey = skyScene(reading({ cloudCover: cover(100) })).glass;
    expect(clear).toMatch(/^rgba\(\d+,\d+,\d+,0\.\d+\)$/);
    expect(clear).not.toBe(grey);
  });
});
