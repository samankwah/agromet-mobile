import { getDayDetail, getWeeklyForecast } from '../../shared/api/forecastService';
import { buildOpenMeteoFixture, stubWeatherFetch } from '../fixtures/openMeteo';

const LOCATION = 'accra';

/**
 * The closed vocabulary `openMeteo.conditionFromWmo` maps every WMO weather
 * code onto. Deliberately restated here rather than imported, so a sixth
 * string added to that mapping without a matching icon/backdrop fails this
 * suite loudly instead of silently reaching a screen that doesn't know it.
 */
const SEVERITY = ['Sunny', 'Partly cloudy', 'Overcast', 'Scattered showers', 'Thunderstorms likely'];
const NIGHT_VARIANTS = ['Clear night', 'Partly cloudy night'];

/**
 * These used to assert the shape of the *mock generator* — that every hourly
 * temperature sat inside the daily min/max, that apparent temperature was never
 * below air temperature, that the warmest hour was always 13:00-17:00. Real
 * forecasts break all of those, so asserting them meant the suite would have
 * gone red the day real data arrived, and — worse — the feels-like one would
 * have passed all through the humid season and failed in January.
 *
 * What is asserted now is what real data must satisfy: structure, units,
 * ordering, and a closed condition vocabulary. The fixture is built to violate
 * the old assumptions on purpose (see fixtures/openMeteo.ts).
 */
beforeEach(() => {
  stubWeatherFetch();
});

async function firstDate() {
  return (await getWeeklyForecast(LOCATION)).days[0].date;
}

describe('getDayDetail', () => {
  it('returns 24 hourly steps for a day in the week', async () => {
    const detail = await getDayDetail(LOCATION, await firstDate());
    expect(detail.hours).toHaveLength(24);
  });

  it('returns the day, its hours and the surrounding week together', async () => {
    const date = await firstDate();
    const detail = await getDayDetail(LOCATION, date);
    // Fetched as one unit so the screen can never show a chart for one day
    // beside a header for another.
    expect(detail.day.date).toBe(date);
    expect(detail.week.days).toHaveLength(7);
    expect(detail.hours.every((h) => h.hour.startsWith(date))).toBe(true);
  });

  it('rejects a date outside the forecast week', async () => {
    await expect(getDayDetail(LOCATION, '1999-01-01')).rejects.toThrow();
  });

  it('stamps every hour as UTC, so a phone in another timezone reads the same chart', async () => {
    // Open-Meteo returns "2026-08-22T06:00" with no zone. Ghana is UTC+0, and
    // the whole app reads these with getUTCHours() — so the suffix has to be
    // added explicitly or every chart shifts by the device's offset.
    const detail = await getDayDetail(LOCATION, await firstDate());
    for (const hour of detail.hours) {
      expect(hour.hour).toMatch(/T\d{2}:00:00\.000Z$/);
      expect(Number.isNaN(new Date(hour.hour).getTime())).toBe(false);
    }
  });

  it('runs the hours in order, one per hour of the day', async () => {
    const detail = await getDayDetail(LOCATION, await firstDate());
    const hours = detail.hours.map((entry) => new Date(entry.hour).getUTCHours());
    expect(hours).toEqual(Array.from({ length: 24 }, (_, index) => index));
  });

  it('keeps every reading inside its physical range', async () => {
    // The units are the contract: °C, %, mm, km/h, UV 0-11+. A provider change
    // that started sending Fahrenheit or fractional humidity would land here.
    const detail = await getDayDetail(LOCATION, await firstDate());
    for (const hour of detail.hours) {
      expect(hour.humidityPct).toBeGreaterThanOrEqual(0);
      expect(hour.humidityPct).toBeLessThanOrEqual(100);
      expect(hour.rainfallProbabilityPct).toBeGreaterThanOrEqual(0);
      expect(hour.rainfallProbabilityPct).toBeLessThanOrEqual(100);
      expect(hour.rainfallMm).toBeGreaterThanOrEqual(0);
      expect(hour.windKph).toBeGreaterThanOrEqual(0);
      expect(hour.uvIndex).toBeGreaterThanOrEqual(0);
      expect(hour.tempC).toBeGreaterThan(-10);
      expect(hour.tempC).toBeLessThan(60);
    }
  });

  it('tolerates an hourly series that steps outside the daily high and low', async () => {
    // Daily min/max and the hourly series are different upstream reductions, so
    // an hour half a degree below the stated minimum is normal, not a bug. The
    // old suite forbade it and would have failed on the first real payload.
    const detail = await getDayDetail(LOCATION, await firstDate());
    const coldest = Math.min(...detail.hours.map((hour) => hour.tempC));
    expect(coldest).toBeLessThan(detail.day.tempMinC);
    // Still close enough that the two are describing the same day.
    expect(detail.day.tempMinC - coldest).toBeLessThan(2);
  });

  it('allows feels-like to fall below air temperature, as it does in Harmattan', async () => {
    const week = await getWeeklyForecast(LOCATION);
    const detail = await getDayDetail(LOCATION, week.days[5].date);
    // Dry, windy days push apparent temperature below the thermometer. The old
    // suite asserted the opposite and would have passed all humid season, then
    // failed in January — worse than failing now.
    expect(detail.hours.some((hour) => hour.feelsLikeC < hour.tempC)).toBe(true);
  });

  it('keeps every condition inside the vocabulary the icons and backdrops know', async () => {
    // A sixth string would not crash: classifyCondition falls back to 'cloudy'
    // and the icon/backdrop lookups fall back too, quietly rendering the
    // wrong glyph rather than failing. So the vocabulary itself has to be
    // asserted directly.
    const week = await getWeeklyForecast(LOCATION);
    for (const day of week.days) {
      const detail = await getDayDetail(LOCATION, day.date);
      expect(SEVERITY).toContain(day.condition);
      for (const hour of detail.hours) {
        expect([...SEVERITY, ...NIGHT_VARIANTS]).toContain(hour.condition);
      }
    }
  });

  it('reads clear night hours as night, so the sun is never drawn after dusk', async () => {
    const detail = await getDayDetail(LOCATION, await firstDate());
    const night = detail.hours.filter((hour) => {
      const h = new Date(hour.hour).getUTCHours();
      return h < 6 || h >= 18;
    });

    expect(night.length).toBeGreaterThan(0);
    for (const hour of night) {
      expect(hour.condition).not.toBe('Sunny');
    }
  });

  it('accepts a storm code on an hour with no measurable rain', async () => {
    // Thunder with trace or zero QPF is ordinary upstream. The old suite
    // treated it as a data error.
    const week = await getWeeklyForecast(LOCATION);
    const detail = await getDayDetail(LOCATION, week.days[2].date);
    expect(detail.hours.some((hour) => hour.rainfallMm === 0 && hour.condition === 'Thunderstorms likely')).toBe(true);
  });

  it('accepts a day whose condition never changes', async () => {
    // A uniformly overcast day has one icon for 24 hours. The old suite
    // required at least two, which is a property of the generator, not weather.
    const week = await getWeeklyForecast(LOCATION);
    const detail = await getDayDetail(LOCATION, week.days[4].date);
    const distinct = new Set(detail.hours.map((hour) => hour.condition));
    expect(distinct.size).toBeGreaterThanOrEqual(1);
    expect(detail.hours).toHaveLength(24);
  });

  it('does not go to the network twice for the day and its week', async () => {
    // One upstream bundle carries current, daily and hourly. Splitting this
    // into separate calls would triple the traffic on a rural connection.
    const fetchMock = stubWeatherFetch(buildOpenMeteoFixture());
    await getDayDetail(LOCATION, await firstDate());
    // One call for the date lookup, one for the detail itself — not one per
    // section of the response.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
