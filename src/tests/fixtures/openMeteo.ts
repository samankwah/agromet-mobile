/**
 * A realistic Open-Meteo payload, and a `fetch` stub that serves it.
 *
 * Deliberately *not* idealised. The old mock generator produced a smooth sine
 * curve where every hour sat inside the daily min/max, apparent temperature was
 * always above air temperature, and the warmest hour was always mid-afternoon —
 * and the day-detail tests asserted all of that as if it were physics. Real
 * forecasts break every one of those, so this fixture breaks them too:
 *
 *   - hour 03 runs half a degree below the day's `temperature_2m_min`, because
 *     the daily aggregate and the hourly series come from different upstream
 *     reductions;
 *   - the Harmattan day has `apparent_temperature` *below* air temperature, as
 *     dry wind does in January;
 *   - one day is uniformly overcast, with a single condition all day;
 *   - one hour carries a shower code with zero measurable rain.
 *
 * A test that passes against this will pass against Open-Meteo in August and in
 * January. One that only passes against a smooth curve was testing the
 * generator.
 */

const HOURS_PER_DAY = 24;

export type FixtureOptions = {
  /** Day index (0-6) to make uniformly overcast. */
  overcastDay?: number;
  /** Day index to give sub-air apparent temperatures, as in Harmattan. */
  harmattanDay?: number;
};

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/** Open-Meteo's own format when `timezone=Africa/Accra` is asked for: local
 * time, no zone suffix. The adapter has to stamp the zone on itself. */
function localStamp(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, '0')}:00`;
}

export function buildOpenMeteoFixture(options: FixtureOptions = {}): Record<string, unknown> {
  const { overcastDay = 4, harmattanDay = 5 } = options;

  const dates = Array.from({ length: 7 }, (_, index) => isoDate(index));

  const dailyCodes = [0, 2, 3, 61, 3, 1, 95];
  const dailyMax = [31.2, 30.4, 29.8, 28.1, 29.0, 34.6, 27.5];
  const dailyMin = [24.1, 23.8, 23.4, 22.9, 23.1, 21.4, 22.6];
  const dailyRainMm = [0, 0.2, 1.4, 12.6, 0.4, 0, 18.2];
  const dailyPop = [5, 20, 45, 85, 30, 5, 95];
  const dailyWind = [14, 16, 13, 21, 12, 26, 24];

  const hourlyTime: string[] = [];
  const temperature: number[] = [];
  const apparent: number[] = [];
  const humidity: number[] = [];
  const precipitation: number[] = [];
  const pop: number[] = [];
  const codes: number[] = [];
  const wind: number[] = [];
  const uv: number[] = [];

  dates.forEach((date, dayIndex) => {
    const min = dailyMin[dayIndex];
    const max = dailyMax[dayIndex];
    const dry = dayIndex === harmattanDay;

    for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
      hourlyTime.push(localStamp(date, hour));

      // A plausible diurnal shape, then deliberately spoiled at 03:00 so the
      // hourly series escapes the daily envelope the way real data does.
      const phase = Math.cos(((hour - 15) / HOURS_PER_DAY) * 2 * Math.PI);
      let temp = min + ((max - min) * (phase + 1)) / 2;
      if (hour === 3) temp = min - 0.5;
      temperature.push(Math.round(temp * 10) / 10);

      // Dry Harmattan wind makes it feel cooler than the thermometer says.
      apparent.push(Math.round((dry ? temp - 2.1 : temp + 3.2) * 10) / 10);

      humidity.push(dry ? 28 : Math.max(45, Math.min(96, Math.round(88 - 18 * phase))));
      wind.push(Math.round((dailyWind[dayIndex] * (0.6 + 0.4 * Math.max(0, phase))) * 10) / 10);
      uv.push(hour >= 6 && hour < 18 ? Math.round(Math.max(0, 10 * Math.sin(((hour - 6) / 12) * Math.PI)) * 10) / 10 : 0);

      const wet = dailyRainMm[dayIndex] > 1 && hour >= 14 && hour <= 18;
      precipitation.push(wet ? Math.round((dailyRainMm[dayIndex] / 5) * 10) / 10 : 0);
      pop.push(wet ? dailyPop[dayIndex] : Math.round(dailyPop[dayIndex] * 0.4));

      if (dayIndex === overcastDay) {
        codes.push(3); // A genuinely uniform day: one condition, all 24 hours.
      } else if (wet) {
        codes.push(dailyCodes[dayIndex] >= 95 ? 95 : 61);
      } else if (hour === 11 && dayIndex === 2) {
        // Thunder glyph on an hour with no measurable rain — normal upstream,
        // and the exact case the old suite forbade.
        codes.push(95);
      } else {
        codes.push(dailyCodes[dayIndex] === 0 ? 0 : 2);
      }
    }
  });

  return {
    latitude: 5.6,
    longitude: -0.1875,
    timezone: 'Africa/Accra',
    current: {
      time: localStamp(dates[0], 12),
      temperature_2m: 29.4,
      relative_humidity_2m: 71,
      apparent_temperature: 33.1,
      precipitation: 0,
      weather_code: 2,
      wind_speed_10m: 15.4,
    },
    daily: {
      time: dates,
      weather_code: dailyCodes,
      temperature_2m_max: dailyMax,
      temperature_2m_min: dailyMin,
      precipitation_sum: dailyRainMm,
      precipitation_probability_max: dailyPop,
      sunrise: dates.map((date) => localStamp(date, 6)),
      sunset: dates.map((date) => localStamp(date, 18)),
      wind_speed_10m_max: dailyWind,
    },
    hourly: {
      time: hourlyTime,
      temperature_2m: temperature,
      apparent_temperature: apparent,
      relative_humidity_2m: humidity,
      precipitation,
      precipitation_probability: pop,
      weather_code: codes,
      wind_speed_10m: wind,
      uv_index: uv,
    },
  };
}

/**
 * Installs a `fetch` stub serving the fixture, for both routes the adapter can
 * take — our backend's envelope and Open-Meteo's raw response. Returns the mock
 * so a test can assert which one was used.
 */
export function stubWeatherFetch(fixture: Record<string, unknown> = buildOpenMeteoFixture()) {
  const mockFetch = jest.fn(async (url: string) => {
    const body = String(url).includes('/api/weather/bundle')
      ? { success: true, data: fixture, unavailable: false }
      : fixture;
    return { ok: true, status: 200, json: async () => body } as Response;
  });

  globalThis.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}
