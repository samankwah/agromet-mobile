import type { DailyForecast, HourlyForecast, WeeklyForecast } from '../domain/forecast';
import { classifyCondition } from '../utils/classifyCondition';
import { HOME_LOCATIONS, MOCK_CURRENT_CONDITIONS } from './mockWeather';

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString().slice(0, 10);
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60_000).toISOString();
}

const CONDITION_CYCLE = ['Sunny', 'Partly cloudy', 'Overcast', 'Scattered showers', 'Thunderstorms likely', 'Partly cloudy', 'Sunny'];

/**
 * Derives a plausible 7-day WeeklyForecast from a town's current
 * conditions — small day-to-day temperature drift, a rotating condition
 * sequence, and a farmer-facing summary/action pair. This is mock data,
 * not a forecast model; it exists only so Home's FeaturedForecastCard and
 * a future Forecast Centre have something realistic-looking to render
 * against the same service contract a real forecast provider would fill.
 */
function buildWeeklyForecast(locationId: string): WeeklyForecast {
  const current = MOCK_CURRENT_CONDITIONS[locationId];
  if (!current) {
    throw new Error(`mockForecast: no current conditions for "${locationId}"`);
  }

  const days: DailyForecast[] = CONDITION_CYCLE.map((condition, index) => {
    const drift = Math.round(Math.sin(index) * 2);
    const isRainy = condition === 'Scattered showers' || condition === 'Thunderstorms likely';
    return {
      locationId,
      date: daysFromNow(index),
      tempMinC: current.minC + drift,
      tempMaxC: current.maxC + drift,
      condition,
      rainfallProbabilityPct: isRainy ? 70 : condition === 'Overcast' ? 30 : 10,
      rainfallMm: isRainy ? Math.max(current.rainfallMm, 8) : 0,
      windKph: current.windKph,
      humidityPct: current.humidityPct,
      farmerInterpretation: isRainy
        ? 'Expect rain — hold off on spraying or fertilizer application this day.'
        : 'Dry conditions expected — a good window for fieldwork.',
    };
  });

  const rainyDays = days.filter((day) => day.rainfallMm > 0).length;

  return {
    locationId,
    generatedAt: new Date().toISOString(),
    days,
    summary:
      rainyDays >= 3
        ? 'A wetter-than-usual week ahead, with rain likely on more than half the days.'
        : 'Mostly dry conditions expected this week, with isolated rain on one or two days.',
    farmerActionCard: {
      headline: rainyDays >= 3 ? 'Plan around the rain' : 'Good window for fieldwork',
      actions:
        rainyDays >= 3
          ? ['Delay fertilizer application until a dry stretch.', 'Check field drainage before the wetter days arrive.']
          : ['A good week to complete weeding or land preparation.', 'Irrigate as needed on the driest days.'],
    },
  };
}

export const MOCK_WEEKLY_FORECASTS: Record<string, WeeklyForecast> = Object.fromEntries(
  HOME_LOCATIONS.map((location) => [location.id, buildWeeklyForecast(location.id)]),
);

const HOURS_AHEAD = 6;

/**
 * The week's conditions ordered by severity. Deliberately the same five
 * strings CONDITION_CYCLE uses — the hourly derivation below steps along
 * this ladder rather than introducing a second weather vocabulary that
 * classifyCondition would then have to learn.
 */
const CONDITION_LADDER = ['Sunny', 'Partly cloudy', 'Overcast', 'Scattered showers', 'Thunderstorms likely'];

/**
 * Ghana spans roughly 5°N-11°N, so day length barely shifts across the
 * year and a fixed 06:00-18:00 window is accurate. The country is also
 * UTC+0, and these hours are UTC-anchored integers straight off the
 * generator's loop index — so this comparison needs no timezone handling
 * and can't drift on a device set to another zone.
 */
function isNightHour(hour: number): boolean {
  return hour < 6 || hour >= 18;
}

/** The after-dark reading of a condition. Only the clear and lightly-
 * clouded kinds have one: rain, storms and overcast look the same at
 * night. */
function afterDark(condition: string): string {
  if (condition === 'Sunny') return 'Clear night';
  if (condition === 'Partly cloudy') return 'Partly cloudy night';
  return condition;
}

/**
 * One hour's condition, from two signals the generator already has: the
 * share of the day's rain that lands in this hour, and whether the sun is
 * up.
 *
 * A DailyForecast's `condition` is the day's *headline* — what its worst
 * hour looks like. Stamping that onto all 24 hours (which is what this used
 * to do) makes the detail screen's icon strip 24 copies of one glyph:
 * decoration, not information. So the convective window keeps the headline,
 * the shoulder hours step one rung down the ladder, and the quiet overnight
 * hours step two — then every hour is resolved for daylight, because a
 * "Sunny" day is not sunny at 01:00.
 *
 * The daylight pass is what makes a dry, cloudless day vary at all; without
 * it a Sunny day produced 24 identical suns, including one at 1am.
 */
function hourlyCondition(dayCondition: string, hour: number, hourProbPct: number, dayProbPct: number, hourRainMm: number): string {
  const night = isNightHour(hour);
  const peak = CONDITION_LADDER.indexOf(dayCondition);
  // An unknown string (a future provider's vocabulary) passes through
  // untouched rather than being guessed at.
  if (peak < 0) return dayCondition;

  const share = dayProbPct > 0 ? hourProbPct / dayProbPct : 0;
  const steps = share >= 0.9 ? 0 : share >= 0.5 ? 1 : 2;
  const index = Math.max(0, peak - steps);

  // A shower or storm glyph on an hour with no measurable rain is a
  // contradiction the icon would sit right beside the rain chart — demote
  // it to plain cloud cover.
  const base = index >= 3 && hourRainMm <= 0 ? CONDITION_LADDER[2] : CONDITION_LADDER[index];

  return night ? afterDark(base) : base;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * UV index from solar elevation, dimmed by cloud.
 *
 * Ghana sits within 5-11°N, so the sun passes almost overhead and clear-sky
 * peak UV is genuinely extreme (11+). Modelled as a half-sine across the
 * 06:00-18:00 daylight window, which is close enough to the real elevation
 * curve at this latitude, and zero after dark rather than a small non-zero
 * floor — there is no ultraviolet at midnight.
 */
function uvIndexFor(hour: number, condition: string): number {
  if (hour < 6 || hour >= 18) return 0;

  const elevation = Math.sin(((hour - 6) / 12) * Math.PI);
  const kind = classifyCondition(condition);
  const cloudFactor = kind === 'thunderstorm' ? 0.35 : kind === 'rain' ? 0.45 : kind === 'overcast' ? 0.6 : kind === 'cloudy' ? 0.8 : 1;

  return Math.round(11 * elevation * cloudFactor);
}

/**
 * A day's 24 hourly steps, shaped like a real diurnal cycle: coolest just
 * before dawn, peaking mid-afternoon, easing overnight. Modelled as a
 * cosine between the day's own min and max so the curve the detail chart
 * draws is smooth and plausible rather than noise, and always agrees with
 * the high/low shown in the 7-day list.
 */
function buildHourlyForDay(locationId: string, day: DailyForecast): HourlyForecast[] {
  const swing = (day.tempMaxC - day.tempMinC) / 2;
  const mid = day.tempMinC + swing;

  return Array.from({ length: 24 }, (_, hour) => {
    // Minimum at 05:00, maximum at 15:00 — the usual lag behind solar noon.
    const phase = ((hour - 15) / 24) * Math.PI * 2;
    // Kept to a tenth rather than a whole degree. A day's swing here is only
    // a few degrees, so rounding to integers made consecutive hours land on
    // the same value and the detail chart drew a staircase of flat runs.
    // Every display path formats through formatTemperature, which rounds to
    // a whole degree anyway — so the tenths cost nothing on screen and buy
    // the chart a true curve.
    const tempC = Math.round((mid + swing * Math.cos(phase)) * 10) / 10;

    // Rain is likeliest in the afternoon/evening convective window, which
    // is when Ghanaian storms typically break.
    const convective = hour >= 13 && hour <= 20 ? 1 : hour >= 9 && hour < 13 ? 0.55 : 0.25;
    const rainfallProbabilityPct = Math.round(day.rainfallProbabilityPct * convective);
    const rainfallMm = Math.round(day.rainfallMm * convective * 10) / 10;

    return {
      locationId,
      hour: new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00.000Z`).toISOString(),
      tempC,
      // Humid air feels hotter than it is; the gap widens with the heat.
      // Same tenth-degree precision as tempC, so the Feels Like curve is as
      // smooth as the Actual one.
      feelsLikeC: Math.round((tempC + (day.humidityPct > 70 ? 2 : 1)) * 10) / 10,
      condition: hourlyCondition(day.condition, hour, rainfallProbabilityPct, day.rainfallProbabilityPct, rainfallMm),
      rainfallProbabilityPct,
      rainfallMm,
      // Humidity runs opposite to temperature — the air holds the same water
      // but warms, so relative humidity bottoms out mid-afternoon and peaks
      // near dawn. Same cosine, inverted, clamped to a sane range.
      humidityPct: clamp(Math.round(day.humidityPct - 12 * Math.cos(phase)), 35, 100),
      // Wind follows daytime heating: near-calm overnight, strongest in the
      // afternoon.
      windKph: Math.max(0, Math.round(day.windKph * (0.55 + 0.45 * Math.cos(phase)) * 10) / 10),
      uvIndex: uvIndexFor(hour, day.condition),
    };
  });
}

/** Every day's 24 hours, keyed by location then date — what the day-detail
 * screen charts. */
export const MOCK_HOURLY_BY_DAY: Record<string, Record<string, HourlyForecast[]>> = Object.fromEntries(
  HOME_LOCATIONS.map((location) => [
    location.id,
    Object.fromEntries((MOCK_WEEKLY_FORECASTS[location.id]?.days ?? []).map((day) => [day.date, buildHourlyForDay(location.id, day)])),
  ]),
);

/**
 * Derives the next few hours from a town's current conditions and today's
 * daily forecast — temperature drifts gently toward today's low (a rough
 * stand-in for afternoon-into-evening cooling), condition and rain
 * probability inherit from today's DailyForecast so the hourly strip stays
 * consistent with the 7-day list rather than contradicting it.
 */
function buildHourlyForecast(locationId: string): HourlyForecast[] {
  const current = MOCK_CURRENT_CONDITIONS[locationId];
  const today = MOCK_WEEKLY_FORECASTS[locationId]?.days[0];
  if (!current || !today) {
    throw new Error(`mockForecast: no current conditions/today forecast for "${locationId}"`);
  }

  return Array.from({ length: HOURS_AHEAD }, (_, index) => {
    const hoursOut = index + 1;
    const coolingStep = (current.temperatureC - today.tempMinC) / HOURS_AHEAD;
    const hour = hoursFromNow(hoursOut);
    const utcHour = new Date(hour).getUTCHours();
    const tempC = Math.round(current.temperatureC - coolingStep * hoursOut);

    return {
      locationId,
      hour,
      tempC,
      feelsLikeC: tempC + (current.humidityPct > 70 ? 2 : 1),
      // Resolved for daylight like the day-detail hours are — this strip was
      // showing a sun at 10PM, because it inherited the day's headline
      // condition unchanged for every hour.
      condition: isNightHour(utcHour) ? afterDark(today.condition) : today.condition,
      rainfallProbabilityPct: today.rainfallProbabilityPct,
      rainfallMm: today.rainfallMm,
      humidityPct: current.humidityPct,
      windKph: current.windKph,
      uvIndex: uvIndexFor(utcHour, today.condition),
    };
  });
}

export const MOCK_HOURLY_FORECASTS: Record<string, HourlyForecast[]> = Object.fromEntries(
  HOME_LOCATIONS.map((location) => [location.id, buildHourlyForecast(location.id)]),
);
