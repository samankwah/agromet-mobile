import { skyPhase, skyScene, type SkyReading } from '../../shared/domain/skyScene';

/** A UTC time on 7 November 2026. Ghana keeps GMT, so it is also the local
 * time. Open-Meteo gives Accra's sunrise that day as 05:47 and sunset 17:41. */
const at = (hours: number, minutes = 0) => new Date(Date.UTC(2026, 10, 7, hours, minutes));
const ACCRA = { lat: 5.6037, lng: -0.187 };

const reading = (overrides: Partial<SkyReading> = {}): SkyReading => ({
  weatherCode: 2,
  at: at(12),
  ...ACCRA,
  ...overrides,
});

const cover = (low: number, mid = 0, high = 0, total = Math.max(low, mid, high)) => ({ total, low, mid, high });

/** How blue a colour is: blue minus the mean of red and green. */
const blueness = ([r, g, b]: [number, number, number]) => b - (r + g) / 2;

const phaseAt = (hours: number, minutes = 0) => skyPhase(at(hours, minutes), ACCRA.lat, ACCRA.lng);

describe('skyPhase', () => {
  it('is dawn from half an hour before sunrise to three quarters of an hour after', () => {
    expect(phaseAt(5, 10)).toBe('night');
    expect(phaseAt(5, 20)).toBe('dawn');
    expect(phaseAt(6, 30)).toBe('dawn');
    expect(phaseAt(6, 40)).toBe('day');
  });

  it('is dusk around the real sunset, and night within half an hour of it', () => {
    expect(phaseAt(16, 50)).toBe('day');
    expect(phaseAt(17, 0)).toBe('dusk');
    expect(phaseAt(18, 5)).toBe('dusk');
    expect(phaseAt(18, 10)).toBe('night');
  });

  /* The bug this replaced: at 18:30 the sky was still a glowing dusk, because
     dusk ran on fixed clock hours to 19:00. The sun had set at 17:41. */
  it('is night at half past six in the evening in Accra', () => {
    expect(phaseAt(18, 30)).toBe('night');
  });

  it('is day at noon and night at midnight', () => {
    expect(phaseAt(12)).toBe('day');
    expect(phaseAt(0)).toBe('night');
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
    expect(skyScene(reading({ at: at(23), cloudCover: cover(5) })).sunGlow).toBe(0);
  });

  it('puts the sun glow out once the sun has set', () => {
    expect(skyScene(reading({ at: at(17, 30), cloudCover: cover(5) })).sunGlow).toBeGreaterThan(0);
    expect(skyScene(reading({ at: at(18, 0), cloudCover: cover(5) })).sunGlow).toBe(0);
  });

  it('shows stars only on a clear night', () => {
    expect(skyScene(reading({ at: at(23), cloudCover: cover(0) })).stars).toBe(1);
    expect(skyScene(reading({ at: at(23), cloudCover: cover(100) })).stars).toBe(0);
    expect(skyScene(reading({ cloudCover: cover(0) })).stars).toBe(0);
  });

  it('colours dawn and dusk differently from the day and from each other', () => {
    const day = skyScene(reading({ cloudCover: cover(5) }));
    const dawn = skyScene(reading({ at: at(6), cloudCover: cover(5) }));
    const dusk = skyScene(reading({ at: at(17, 30), cloudCover: cover(5) }));
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

describe('skyScene painting', () => {
  const kindFor = (overrides: Partial<SkyReading>) => skyScene(reading(overrides)).kind;

  it('follows the measured cover from clear to overcast', () => {
    expect(kindFor({ cloudCover: cover(5) })).toBe('clear');
    expect(kindFor({ cloudCover: cover(30) })).toBe('partly');
    expect(kindFor({ cloudCover: cover(60) })).toBe('cloudy');
    expect(kindFor({ cloudCover: cover(95) })).toBe('overcast');
  });

  it('shows rain, a storm, or haze whatever the cover says', () => {
    expect(kindFor({ weatherCode: 61, cloudCover: cover(40) })).toBe('rain');
    expect(kindFor({ weatherCode: 95, cloudCover: cover(40) })).toBe('storm');
    expect(kindFor({ weatherCode: 45 })).toBe('fog');
    expect(kindFor({ cloudCover: cover(5), visibilityM: 2_500 })).toBe('fog');
  });

  it('names the picture by kind and time of day', () => {
    expect(skyScene(reading({ at: at(23), cloudCover: cover(30) })).backdrop).toBe('partly-night');
    expect(skyScene(reading({ at: at(17, 30), cloudCover: cover(5) })).backdrop).toBe('clear-dusk');
  });
});
