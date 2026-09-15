import type { DailyForecast, HourlyForecast } from '../domain/forecast';

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

/** At or above this, rain is worth mentioning at all. On its own it decides
 * nothing — see WETTING_RAIN_MM for why probability cannot carry a sentence
 * here. */
const WET_DAY_PROBABILITY = 50;
/** Rain that actually interrupts fieldwork, rather than a passing shower. */
const SIGNIFICANT_RAIN_MM = 5;

/**
 * Rain worth acting on, as opposed to rain that merely happens.
 *
 * Probability alone cannot carry these sentences, and assuming it could was
 * the bug that made this card look hardcoded. Open-Meteo's
 * `precipitation_probability` is the chance of *any measurable precipitation*,
 * 0.1 mm included. On the Ghanaian coast in September that sits at 96-100%
 * essentially every day of the rainy season, so a threshold on probability
 * alone is latched on from May to October and the sentence never moves.
 *
 * Checked against a real Accra week: seven days, `precipitation_probability_max`
 * of 96, 100, 99, 100, 96, 96, 100 — and daily totals of 0.8 mm to 8.1 mm. The
 * probability separates none of those days. The amount separates all of them.
 *
 * So the amount decides which sentence a farmer gets, and the probability only
 * decides whether rain is worth mentioning. Below this, a near-certain forecast
 * is a drizzle and says so, rather than telling someone to run for their drying
 * crops over a tenth of a millimetre.
 */
const WETTING_RAIN_MM = 1;
/** Exported so the day-detail screen's own impact line uses the same
 * threshold as this file — a day counted "hot" here can't read as merely
 * warm there. */
export const HOT_DAY_C = 34;

export function describeDay(day: DailyForecast): string {
  const wet = day.rainfallProbabilityPct >= WET_DAY_PROBABILITY;
  const wetting = day.rainfallMm >= WETTING_RAIN_MM;
  const heavy = day.rainfallMm >= SIGNIFICANT_RAIN_MM;
  const hot = day.tempMaxC >= HOT_DAY_C;

  if (wet && heavy) {
    return `Rain likely, about ${Math.round(day.rainfallMm)} mm. Field work will stop; cover anything you have harvested.`;
  }
  if (wet && wetting) {
    return `Showers are likely, about ${Math.round(day.rainfallMm)} mm. Keep drying crops close to cover.`;
  }
  if (hot) {
    return `Hot, up to ${Math.round(day.tempMaxC)}°C. Work early morning or late afternoon, and drink enough water.`;
  }
  // See WETTING_RAIN_MM: through the rainy season `rainfallProbabilityPct` is
  // pinned near 100 every day, so without the amount gate above this branch
  // returned the same sentence for five days running.
  if (wet) {
    return 'A little rain is likely, but not enough to stop work or spoil drying.';
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
  const wetting = day.rainfallMm >= WETTING_RAIN_MM;
  const heavy = day.rainfallMm >= SIGNIFICANT_RAIN_MM;
  const hot = day.tempMaxC >= HOT_DAY_C;

  if (wet && heavy) return 'Rain will get in the way today';
  if (wet && wetting) return 'Showers likely today';
  if (hot) return 'A hot day today';
  if (wet) return 'A little rain today';
  if (day.rainfallProbabilityPct >= 30) return 'Mostly dry today';
  return 'A good day to work';
}

// ---------------------------------------------------------------------------
// The next few hours, which is a different question from "today"
// ---------------------------------------------------------------------------

/**
 * `describeDay` reads a *calendar day*: `precipitation_probability_max` and
 * `precipitation_sum` over all 24 hours. That is the right reading for a row
 * in the week list or for the day-detail screen, and the wrong one for the
 * card a farmer opens at nine at night — it was still announcing "Showers
 * likely today. Keep drying crops close to cover." because rain had crossed
 * 50% at two in the afternoon. Nothing about it moved between breakfast and
 * bedtime, so it read as canned text sitting under a hero that said
 * "Overcast".
 *
 * These build the same impact-first reading from the hours *ahead of now* and
 * name the stretch of day the reader is actually standing in. The window is
 * the one the "Next hours" strip already shows directly above the card, so
 * the claim stays checkable against numbers on the same screen — the rule the
 * top of this file sets out.
 */
export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** Ghana is UTC+0 with no DST and every hour in this app is read with
 * `getUTCHours()`, so these boundaries are local time — and a phone set to
 * another timezone cannot shift them. */
export function partOfDay(at: Date): PartOfDay {
  const hour = at.getUTCHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 16) return 'afternoon';
  if (hour < 19) return 'evening';
  return 'night';
}

/** Rain over a six-hour window, not a whole day, so this sits below
 * SIGNIFICANT_RAIN_MM: five millimetres inside one afternoon is already past
 * the point where fieldwork stops. */
const HEAVY_WINDOW_MM = 4;

/** Rain too light to change what anyone does, by part of day. */
const LIGHT_NOTE: Record<PartOfDay, string> = {
  morning: 'Not enough to stop work, but keep an eye on anything drying.',
  afternoon: 'Not enough to stop work, but keep an eye on anything drying.',
  evening: 'Not enough to spoil anything, but bring in what is nearly dry.',
  night: 'Too little to worry about, though a cover will keep things dry.',
};

/**
 * The hour, as a farmer would say it: "3 PM".
 *
 * The locale is pinned rather than left to the device because every other
 * string on this card is written in English, and a phone set to French would
 * otherwise produce "15 h" inside an English sentence. UTC because Ghana is
 * UTC+0 and the whole app reads forecast hours that way.
 */
function clockHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'UTC' });
}

const WHEN: Record<PartOfDay, string> = {
  morning: 'this morning',
  afternoon: 'this afternoon',
  evening: 'this evening',
  night: 'tonight',
};

// What you do about rain depends on the hour as much as on the millimetres:
// at ten in the morning it stops field work, at ten at night it is about what
// you left outside.
const RAIN_ACTION: Record<PartOfDay, string> = {
  morning: 'Field work will stop, so cover anything you have harvested.',
  afternoon: 'Field work will stop, so cover anything you have harvested.',
  evening: 'Get harvested crops under cover before it gets dark.',
  night: 'Cover what is still outside, and check that your drains are clear.',
};

const SHOWER_ACTION: Record<PartOfDay, string> = {
  morning: 'Keep drying crops close to cover.',
  afternoon: 'Keep drying crops close to cover.',
  evening: 'Bring in whatever is still drying outside.',
  night: 'Bring in anything you left out to dry.',
};

const HOT_HEADLINE: Record<PartOfDay, string> = {
  morning: 'Hot by midday',
  afternoon: 'Hot this afternoon',
  evening: 'Still hot this evening',
  night: 'A warm night',
};

const HOT_ACTION: Record<PartOfDay, string> = {
  morning: 'Do the heavy work early, and drink enough water.',
  afternoon: 'Rest in the shade when you can, and drink enough water.',
  evening: 'Drink enough water while you finish up.',
  night: 'Keep water near you, and let the store room air out.',
};

const DRY_HEADLINE: Record<PartOfDay, string> = {
  morning: 'A good morning to work',
  afternoon: 'A good afternoon to work',
  evening: 'A clear evening',
  night: 'A dry night',
};

const DRY_BODY: Record<PartOfDay, string> = {
  morning: 'Dry for the next few hours, good for field work and drying.',
  afternoon: 'Dry for the next few hours, good for field work and drying.',
  evening: 'No rain expected, so there is time to finish drying and storing.',
  night: 'No rain expected, so anything under cover will stay dry.',
};

export type NowNarrative = { headline: string; body: string };

/**
 * @param hours the upcoming hours the card sits under, in order.
 * @param day today's row, used only when there are no hours left to read.
 * @param at the moment to describe. Pass the observation time from the
 *   current conditions rather than `new Date()`, so the card and the hero
 *   above it are talking about the same instant.
 */
export function describeNextHours(hours: HourlyForecast[], day: DailyForecast, at: Date): NowNarrative {
  // Nothing ahead to read (the last hour of the forecast run). Fall back to
  // the whole-day reading rather than showing an empty card.
  if (hours.length === 0) {
    return { headline: dayHeadline(day), body: describeDay(day) };
  }

  const part = partOfDay(at);

  const totalRain = hours.reduce((total, hour) => total + hour.rainfallMm, 0);
  const peakTemp = hours.reduce((peak, hour) => Math.max(peak, hour.tempC), hours[0].tempC);
  // Naming the hour is what makes this card move on every refresh rather than
  // once a day: "around 3 PM" at eleven in the morning becomes "around 3 PM"
  // at one and then falls out of the window entirely by four. It is also the
  // part a farmer can actually plan around, which a window-wide probability
  // never was.
  const likeliest = hours.reduce((peak, hour) => (hour.rainfallProbabilityPct > peak.rainfallProbabilityPct ? hour : peak), hours[0]);
  const wettest = hours.reduce((peak, hour) => (hour.rainfallMm > peak.rainfallMm ? hour : peak), hours[0]);
  const peakProbability = likeliest.rainfallProbabilityPct;

  // Rain gets the stretch of day it *arrives* in, not the one the reader is
  // standing in, and the same for the advice that follows it — at six in the
  // morning, rain due at noon is "this afternoon", and what you do about it is
  // an afternoon job. Only the no-rain readings below key off `part`, because
  // there is no other hour for them to point at.
  const rainPart = partOfDay(new Date(likeliest.hour));
  const rainWhen = WHEN[rainPart];

  if (peakProbability >= WET_DAY_PROBABILITY && totalRain >= HEAVY_WINDOW_MM) {
    const heaviestPart = partOfDay(new Date(wettest.hour));
    return {
      headline: `Heavy rain ${WHEN[heaviestPart]}`,
      body: `About ${Math.round(totalRain)} mm, heaviest around ${clockHour(wettest.hour)}. ${RAIN_ACTION[heaviestPart]}`,
    };
  }
  if (peakProbability >= WET_DAY_PROBABILITY && totalRain >= WETTING_RAIN_MM) {
    return {
      headline: `Showers ${rainWhen}`,
      body: `Showers are likely around ${clockHour(likeliest.hour)}, about ${Math.round(totalRain)} mm. ${SHOWER_ACTION[rainPart]}`,
    };
  }
  if (peakTemp >= HOT_DAY_C) {
    return {
      headline: HOT_HEADLINE[part],
      body: `Up to ${Math.round(peakTemp)}°C in the next few hours. ${HOT_ACTION[part]}`,
    };
  }
  // Near-certain, but the amount says drizzle. Named separately so the rainy
  // season's standing 96% stops reading as a warning.
  if (peakProbability >= WET_DAY_PROBABILITY) {
    return {
      headline: `Light rain ${rainWhen}`,
      body: `A little rain is likely around ${clockHour(likeliest.hour)}. ${LIGHT_NOTE[rainPart]}`,
    };
  }
  if (peakProbability >= 30) {
    return {
      headline: `Mostly dry ${rainWhen}`,
      body: `Only a small chance of rain, highest around ${clockHour(likeliest.hour)}.`,
    };
  }
  return { headline: DRY_HEADLINE[part], body: DRY_BODY[part] };
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
