import { getDayDetail, getWeeklyForecast } from '../../shared/api/forecastService';
import { getConditionIcon } from '../../shared/utils/getConditionIcon';

const LOCATION = 'accra';

/** Mirrors CONDITION_LADDER in mockForecast.ts. Deliberately restated here
 * rather than exported from the mock, so reordering severity in one place
 * without the other fails loudly. */
const SEVERITY = ['Sunny', 'Partly cloudy', 'Overcast', 'Scattered showers', 'Thunderstorms likely'];

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

  it('hourly temperatures stay within the day high/low shown in the list', async () => {
    const detail = await getDayDetail(LOCATION, await firstDate());
    // The chart and the 7-day row must agree — an hourly curve that
    // overshoots its own headline high is the kind of inconsistency users
    // notice immediately.
    for (const hour of detail.hours) {
      expect(hour.tempC).toBeGreaterThanOrEqual(detail.day.tempMinC);
      expect(hour.tempC).toBeLessThanOrEqual(detail.day.tempMaxC);
    }
  });

  it('models a real diurnal cycle — coolest before dawn, warmest mid-afternoon', async () => {
    const detail = await getDayDetail(LOCATION, await firstDate());
    const hourOf = (iso: string) => new Date(iso).getUTCHours();
    const warmest = detail.hours.reduce((a, b) => (b.tempC > a.tempC ? b : a));
    const coolest = detail.hours.reduce((a, b) => (b.tempC < a.tempC ? b : a));

    expect(hourOf(warmest.hour)).toBeGreaterThanOrEqual(13);
    expect(hourOf(warmest.hour)).toBeLessThanOrEqual(17);
    expect(hourOf(coolest.hour)).toBeLessThanOrEqual(7);
  });

  it('rain probability never exceeds the day headline, and peaks in the convective window', async () => {
    const week = await getWeeklyForecast(LOCATION);
    const rainyDay = week.days.find((d) => d.rainfallProbabilityPct >= 70);
    if (!rainyDay) return; // nothing to assert on a dry mock week

    const detail = await getDayDetail(LOCATION, rainyDay.date);
    for (const hour of detail.hours) {
      expect(hour.rainfallProbabilityPct).toBeLessThanOrEqual(rainyDay.rainfallProbabilityPct);
    }
    const peak = detail.hours.reduce((a, b) => (b.rainfallProbabilityPct > a.rainfallProbabilityPct ? b : a));
    expect(new Date(peak.hour).getUTCHours()).toBeGreaterThanOrEqual(13);
  });

  it('feels-like is never cooler than the actual temperature in this climate', async () => {
    const detail = await getDayDetail(LOCATION, await firstDate());
    for (const hour of detail.hours) {
      expect(hour.feelsLikeC).toBeGreaterThanOrEqual(hour.tempC);
    }
  });

  it('carries sub-degree resolution, so the chart draws a curve rather than a staircase', async () => {
    const detail = await getDayDetail(LOCATION, await firstDate());

    // A day's swing is only a few degrees. Rounded to whole degrees, many
    // consecutive hours collapse onto the same value and the detail chart
    // renders flat runs joined by steps. Displays all format through
    // formatTemperature (which rounds), so the tenths are invisible on
    // screen and exist purely to give the curve its shape.
    const fractional = detail.hours.filter((h) => !Number.isInteger(h.tempC));
    expect(fractional.length).toBeGreaterThan(0);

    const distinct = new Set(detail.hours.map((h) => h.tempC));
    expect(distinct.size).toBeGreaterThan(12);
  });

  it('treats the day condition as a ceiling, never letting an hour outrank it', async () => {
    const week = await getWeeklyForecast(LOCATION);

    for (const day of week.days) {
      const peak = SEVERITY.indexOf(day.condition);
      if (peak < 0) continue;
      const detail = await getDayDetail(LOCATION, day.date);
      for (const hour of detail.hours) {
        // The daily headline describes the day's *worst* hour, so no single
        // hour may be stormier than the headline it rolls up into.
        expect(SEVERITY.indexOf(hour.condition)).toBeLessThanOrEqual(peak);
      }
    }
  });

  it('varies the hourly condition on every day, wet or dry', async () => {
    const week = await getWeeklyForecast(LOCATION);

    for (const day of week.days) {
      const detail = await getDayDetail(LOCATION, day.date);
      // Compared on the resolved icon rather than the string: distinct
      // strings that collapse to one glyph would still render a redundant
      // row. Every day must vary — a dry, cloudless day still has a night,
      // and a strip that appears on some days and not others reads as a bug.
      const icons = new Set(detail.hours.map((h) => getConditionIcon(h.condition)));
      expect(icons.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('never shows the sun before dawn or after dusk', async () => {
    const week = await getWeeklyForecast(LOCATION);

    for (const day of week.days) {
      const detail = await getDayDetail(LOCATION, day.date);
      for (const hour of detail.hours) {
        const utcHour = new Date(hour.hour).getUTCHours();
        if (utcHour >= 6 && utcHour < 18) continue;
        expect(getConditionIcon(hour.condition)).not.toBe('sunny-outline');
      }
    }
  });

  it('never shows a shower or storm on an hour with no measurable rain', async () => {
    const week = await getWeeklyForecast(LOCATION);

    for (const day of week.days) {
      const detail = await getDayDetail(LOCATION, day.date);
      for (const hour of detail.hours) {
        if (SEVERITY.indexOf(hour.condition) >= 3) {
          // A rain glyph sitting directly above a rain chart reading zero is
          // a contradiction a farmer would notice immediately.
          expect(hour.rainfallMm).toBeGreaterThan(0);
        }
      }
    }
  });
});
