import { skyPhase, skyScene } from '../../shared/domain/skyScene';

/** A local time on a fixed day, as the reading's `observedAt` would carry it. */
const at = (hours: number, minutes = 0) => new Date(2026, 10, 7, hours, minutes).toISOString();

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

  it("trusts Open-Meteo's day flag outside dawn and dusk", () => {
    expect(skyPhase(true, at(12))).toBe('day');
    expect(skyPhase(false, at(23))).toBe('night');
  });

  it('falls back to the day flag for an unreadable time', () => {
    expect(skyPhase(true, 'not-a-date')).toBe('day');
    expect(skyPhase(false, 'not-a-date')).toBe('night');
  });
});

describe('skyScene', () => {
  const noon = (weatherCode: number) => skyScene({ weatherCode, isDay: true, observedAt: at(12) });
  const midnight = (weatherCode: number) => skyScene({ weatherCode, isDay: false, observedAt: at(0) });

  it('shows a clear day as sun with no cloud or rain', () => {
    const scene = noon(0);
    expect(scene).toMatchObject({ phase: 'day', sun: true, stars: false, precip: 'none', lightning: false, fog: false });
    expect(scene.clouds.count).toBe(0);
  });

  it('adds cloud as the cover thickens, and hides the sun once it is overcast', () => {
    expect(noon(1).clouds.count).toBeLessThan(noon(2).clouds.count);
    expect(noon(2).sun).toBe(true);
    expect(noon(3)).toMatchObject({ sun: false, clouds: { count: 4, tone: 'grey' } });
  });

  it('tells fog from overcast', () => {
    expect(noon(45).fog).toBe(true);
    expect(noon(3).fog).toBe(false);
    expect(noon(45).gradient).not.toEqual(noon(3).gradient);
  });

  it('tells drizzle from rain from a downpour', () => {
    expect(noon(51).precip).toBe('drizzle');
    expect(noon(61).precip).toBe('rain');
    expect(noon(80).precip).toBe('rain');
    expect(noon(65).precip).toBe('heavy');
  });

  it('gives a thunderstorm dark cloud, heavy rain and lightning', () => {
    expect(noon(95)).toMatchObject({ lightning: true, precip: 'heavy', clouds: { tone: 'dark' } });
    expect(noon(61).lightning).toBe(false);
  });

  it('shows stars and no sun on a clear night, and neither through rain', () => {
    expect(midnight(0)).toMatchObject({ phase: 'night', stars: true, sun: false });
    expect(midnight(61)).toMatchObject({ stars: false, sun: false });
  });

  it('colours dawn and dusk differently from the day and from each other', () => {
    const dawn = skyScene({ weatherCode: 0, isDay: true, observedAt: at(6) });
    const dusk = skyScene({ weatherCode: 0, isDay: true, observedAt: at(18) });
    expect(dawn.phase).toBe('dawn');
    expect(dusk.phase).toBe('dusk');
    expect(dawn.gradient).not.toEqual(noon(0).gradient);
    expect(dawn.gradient).not.toEqual(dusk.gradient);
  });

  it('has a sky for every WMO code Open-Meteo reports', () => {
    for (const code of [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]) {
      const scene = noon(code);
      expect(scene.gradient).toHaveLength(3);
      scene.gradient.forEach((colour) => expect(colour).toMatch(/^#[0-9a-f]{6}$/));
    }
  });
});
