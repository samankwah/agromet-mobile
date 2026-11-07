import { isDaylight, sunTimes } from '../../shared/utils/sun';

const ACCRA = { lat: 5.6037, lng: -0.187 };
const TAMALE = { lat: 9.4034, lng: -0.8424 };

const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16);

describe('sunTimes', () => {
  /* Open-Meteo's own sunrise and sunset for Accra (UTC+0, no daylight
     saving): 7 November 05:47 and 17:41, 21 June 05:49 and 18:16. Within five
     minutes is plenty for switching a map. */
  it('matches published sunrise and sunset for Accra in November', () => {
    const times = sunTimes(new Date(Date.UTC(2026, 10, 7, 12)), ACCRA.lat, ACCRA.lng)!;
    expect(Math.abs(times.sunrise - Date.UTC(2026, 10, 7, 5, 47))).toBeLessThan(5 * 60_000);
    expect(Math.abs(times.sunset - Date.UTC(2026, 10, 7, 17, 41))).toBeLessThan(5 * 60_000);
  });

  it('matches published sunrise and sunset for Accra in June', () => {
    const times = sunTimes(new Date(Date.UTC(2026, 5, 21, 12)), ACCRA.lat, ACCRA.lng)!;
    expect(Math.abs(times.sunrise - Date.UTC(2026, 5, 21, 5, 49))).toBeLessThan(5 * 60_000);
    expect(Math.abs(times.sunset - Date.UTC(2026, 5, 21, 18, 16))).toBeLessThan(5 * 60_000);
  });

  it('gives the north a longer June day than the coast', () => {
    const june = new Date(Date.UTC(2026, 5, 21, 12));
    const length = (place: typeof ACCRA) => {
      const times = sunTimes(june, place.lat, place.lng)!;
      return times.sunset - times.sunrise;
    };
    expect(length(TAMALE)).toBeGreaterThan(length(ACCRA));
    expect(clock(sunTimes(june, TAMALE.lat, TAMALE.lng)!.sunrise)).toMatch(/^05:/);
  });
});

describe('isDaylight', () => {
  it('is day at noon and night at midnight', () => {
    expect(isDaylight(new Date(Date.UTC(2026, 10, 7, 12)), ACCRA.lat, ACCRA.lng)).toBe(true);
    expect(isDaylight(new Date(Date.UTC(2026, 10, 7, 0)), ACCRA.lat, ACCRA.lng)).toBe(false);
  });

  it('turns at sunset, not at a fixed six o clock', () => {
    // Sunset in Accra on 7 November is about 17:41.
    expect(isDaylight(new Date(Date.UTC(2026, 10, 7, 17, 30)), ACCRA.lat, ACCRA.lng)).toBe(true);
    expect(isDaylight(new Date(Date.UTC(2026, 10, 7, 17, 50)), ACCRA.lat, ACCRA.lng)).toBe(false);
  });
});
