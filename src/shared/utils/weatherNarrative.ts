import type { DailyForecast } from '../domain/forecast';

/**
 * The sentences a weather API cannot give you.
 *
 * `DailyForecast.farmerInterpretation`, `WeeklyForecast.summary` and
 * `farmerActionCard` are non-optional in the domain types, and no provider
 * emits anything like them — the mock generator wrote them, which is part of
 * why the forecast screens read as authored advice when they were invented.
 *
 * These are **derived from the numbers, by rule**. That is a deliberate choice
 * over two alternatives: making the fields optional and showing nothing (which
 * empties three cards), or leaving prose that claims more than the data
 * supports. A farmer reading "three wet days this week" can check it against
 * the row of rain percentages directly above; nothing here asserts anything the
 * forecast does not already say.
 *
 * What this must never become: agronomic advice. "Plan spraying around the
 * rain" is a reading of a rainfall figure. "Apply fungicide on Tuesday" is a
 * recommendation, and recommendations belong to the GMet advisory bulletins,
 * which are authored by people and carry a district and a date. Keep the
 * vocabulary here about *weather*, and leave crops to the advisory feature.
 */

/** At or above this, the day is one a farmer should plan around. */
const WET_DAY_PROBABILITY = 50;
/** Rain that actually interrupts fieldwork, rather than a passing shower. */
const SIGNIFICANT_RAIN_MM = 5;
const HOT_DAY_C = 34;

export function describeDay(day: DailyForecast): string {
  const wet = day.rainfallProbabilityPct >= WET_DAY_PROBABILITY;
  const heavy = day.rainfallMm >= SIGNIFICANT_RAIN_MM;
  const hot = day.tempMaxC >= HOT_DAY_C;

  if (wet && heavy) {
    return `Rain likely, around ${Math.round(day.rainfallMm)} mm. Field work will be interrupted; leave harvested produce covered.`;
  }
  if (wet) {
    return 'Showers are likely at some point. Keep drying produce within reach of cover.';
  }
  if (hot) {
    return `Hot, up to ${Math.round(day.tempMaxC)}°C. Work the early morning and late afternoon, and keep water available.`;
  }
  if (day.rainfallProbabilityPct >= 30) {
    return 'A chance of showers, but most of the day should stay dry.';
  }
  return 'Dry weather expected, a good day for field work and drying.';
}

export type WeekNarrative = {
  summary: string;
  actionCard: { headline: string; actions: string[] };
};

export function buildWeekSummary(days: DailyForecast[]): WeekNarrative {
  if (days.length === 0) {
    return {
      summary: 'No forecast is available for this location right now.',
      actionCard: { headline: 'Forecast unavailable', actions: [] },
    };
  }

  const wetDays = days.filter((day) => day.rainfallProbabilityPct >= WET_DAY_PROBABILITY);
  const totalRain = Math.round(days.reduce((total, day) => total + day.rainfallMm, 0));
  const hottest = days.reduce((peak, day) => (day.tempMaxC > peak.tempMaxC ? day : peak), days[0]);
  const driest = days.reduce((best, day) => (day.rainfallProbabilityPct < best.rainfallProbabilityPct ? day : best), days[0]);

  const wetCount = wetDays.length;
  const summary =
    wetCount === 0
      ? `A dry week ahead, with about ${totalRain} mm in total and highs near ${Math.round(hottest.tempMaxC)}°C.`
      : `${wetCount} wet ${wetCount === 1 ? 'day' : 'days'} expected this week, around ${totalRain} mm in total. Highs near ${Math.round(hottest.tempMaxC)}°C.`;

  const actions: string[] = [];

  if (wetCount >= 3) {
    actions.push('Several wet days, so bring forward any drying or spraying you can.');
    actions.push('Check that drainage channels are clear before the heaviest day.');
  } else if (wetCount > 0) {
    actions.push(`Rain is most likely on ${weekdayOf(wetDays[0].date)}. Plan work that needs dry ground around it.`);
  } else {
    actions.push('No significant rain expected, a good week for drying and storage.');
    actions.push('Water young plants; there will be little help from the sky.');
  }

  if (hottest.tempMaxC >= HOT_DAY_C) {
    actions.push(`${weekdayOf(hottest.date)} looks hottest at about ${Math.round(hottest.tempMaxC)}°C. Avoid the middle of the day.`);
  }

  if (wetCount > 0 && wetCount < days.length) {
    actions.push(`${weekdayOf(driest.date)} looks driest if you need one clear day.`);
  }

  return {
    summary,
    // A generated headline, not a bulletin title — kept plainly descriptive so
    // it cannot be mistaken for an issued advisory.
    actionCard: { headline: wetCount > 0 ? 'Plan around the rain' : 'A dry week to work with', actions },
  };
}

function weekdayOf(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return 'that day';
  return date.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' });
}
