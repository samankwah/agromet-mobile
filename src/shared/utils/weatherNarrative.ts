import type { DailyForecast } from '../domain/forecast';

/**
 * The sentences a weather API cannot give you.
 *
 * `DailyForecast.farmerInterpretation`, `WeeklyForecast.summary` and
 * `farmerActionCard` are non-optional in the domain types, and no provider
 * emits anything like them.
 *
 * These are **derived from the numbers, by rule**. That is a deliberate choice
 * over two alternatives: making the fields optional and showing nothing (which
 * empties three cards), or leaving prose that claims more than the data
 * supports. And they are written **impact-first**: "Fieldwork will be
 * interrupted on 2 days of heavier rain this week" leads with what the
 * weather does to farm work, with the mm/probability/temperature figures
 * that justify it following in the same sentence — so a farmer can check the
 * claim against the row of days directly above rather than take it on trust.
 * Nothing here asserts anything the forecast does not already say.
 *
 * What this must never become: agronomic advice. "Fieldwork will be
 * interrupted" is a reading of a rainfall figure's consequence. "Apply
 * fungicide on Tuesday" is a recommendation, and recommendations belong to
 * the GMet advisory bulletins, which are authored by people and carry a
 * district and a date. Keep the vocabulary here about *weather and its
 * impact*, and leave crops to the advisory feature.
 */

/** At or above this, the day is one a farmer should plan around. */
const WET_DAY_PROBABILITY = 50;
/** Rain that actually interrupts fieldwork, rather than a passing shower. */
const SIGNIFICANT_RAIN_MM = 5;
/** Exported so the day-detail screen's own impact line uses the same
 * threshold as this file — a day counted "hot" here can't read as merely
 * warm there. */
export const HOT_DAY_C = 34;

export function describeDay(day: DailyForecast): string {
  const wet = day.rainfallProbabilityPct >= WET_DAY_PROBABILITY;
  const heavy = day.rainfallMm >= SIGNIFICANT_RAIN_MM;
  const hot = day.tempMaxC >= HOT_DAY_C;

  if (wet && heavy) {
    return `Rain likely, about ${Math.round(day.rainfallMm)} mm. Field work will stop; cover anything you have harvested.`;
  }
  if (wet) {
    return 'Showers are likely. Keep drying crops close to cover.';
  }
  if (hot) {
    return `Hot, up to ${Math.round(day.tempMaxC)}°C. Work early morning or late afternoon, and drink enough water.`;
  }
  if (day.rainfallProbabilityPct >= 30) {
    return 'A small chance of showers, but most of the day should stay dry.';
  }
  return 'Dry weather. A good day for field work and drying.';
}

/**
 * A short heading for `describeDay`'s same reading of a single day — what
 * the Daily tab's "today" card titles itself with. Kept separate from
 * `buildWeekSummary`'s headline on purpose: that one is about the whole
 * week, this one is about today, and reusing the week's headline here used
 * to make the Daily and Weekly tabs read the same over each other's
 * shoulder.
 */
export function dayHeadline(day: DailyForecast): string {
  const wet = day.rainfallProbabilityPct >= WET_DAY_PROBABILITY;
  const heavy = day.rainfallMm >= SIGNIFICANT_RAIN_MM;
  const hot = day.tempMaxC >= HOT_DAY_C;

  if (wet && heavy) return 'Rain will get in the way today';
  if (wet) return 'Showers likely today';
  if (hot) return 'A hot day today';
  if (day.rainfallProbabilityPct >= 30) return 'Mostly dry today';
  return 'A good day to work';
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
  // Leads with the consequence for farm work, not the raw numbers — the
  // figures still follow so the sentence stays checkable against the row of
  // days above it, but "what happens to fieldwork" is the headline, in line
  // with impact-based forecasting practice. `heavyCount` grades that
  // consequence: a day that only crosses the wet-probability threshold reads
  // as a possible hold-up, one that also crosses SIGNIFICANT_RAIN_MM reads
  // as an interruption — the same wet/heavy split `describeDay` uses.
  const heavyCount = wetDays.filter((day) => day.rainfallMm >= SIGNIFICANT_RAIN_MM).length;
  const highs = `highs near ${Math.round(hottest.tempMaxC)}°C`;

  let summary: string;
  if (wetCount === 0) {
    summary = `Dry all week, good for fieldwork and drying. About ${totalRain} mm in total, with ${highs}.`;
  } else if (heavyCount > 0) {
    summary = `Rain will stop fieldwork on ${heavyCount} ${heavyCount === 1 ? 'day' : 'days'} this week. About ${totalRain} mm in total, with ${highs}.`;
  } else {
    summary = `Showers on ${wetCount} ${wetCount === 1 ? 'day' : 'days'} this week may slow down fieldwork. About ${totalRain} mm in total, with ${highs}.`;
  }

  const actions: string[] = [];

  if (wetCount >= 3) {
    actions.push('Rain most days will keep the ground wet, so do any drying or spraying earlier if you can.');
    actions.push('Heavy rain can flood blocked drains; clear them before the worst of it comes.');
  } else if (wetCount > 0) {
    actions.push(`Rain on ${weekdayOf(wetDays[0].date)} will make that day too wet to work on; plan around it.`);
  } else {
    actions.push('No real rain expected, so drying and storage stay easy all week.');
    actions.push('Young plants get no rain this week, so water them yourself.');
  }

  if (hottest.tempMaxC >= HOT_DAY_C) {
    actions.push(`${weekdayOf(hottest.date)} is hottest, near ${Math.round(hottest.tempMaxC)}°C. Work early or late, not midday.`);
  }

  if (wetCount > 0 && wetCount < days.length) {
    actions.push(`${weekdayOf(driest.date)} stays clear, your best day for work that needs dry ground.`);
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
