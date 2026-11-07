import type { WarningHazard } from './userSettings';
import type { WeatherAlert } from './weatherAlert';

/**
 * When a weather warning should reach the farmer as a notification, and what it
 * says. The same rules as the server's `backend/app/weather_warnings.py`
 * (`is_due`, `notification_text`), so the backup notifications scheduled on the
 * phone arrive at the same moments, worded the same, as the pushed ones.
 *
 * Ghana keeps GMT all year, so UTC hours are local hours.
 */

export const EVENING_BEFORE_HOUR = 18;
export const MORNING_HOUR = 6;
export const QUIET_FROM_HOUR = 21;
export const STORM_LEAD_MS = 2 * 60 * 60 * 1000;

const HOUR = 60 * 60 * 1000;

/** The warning type, from its id `weather:{place}:{hazard}:{date}`. */
export function hazardOf(alert: Pick<WeatherAlert, 'id'>): WarningHazard | null {
  const hazard = alert.id.split(':')[2];
  return hazard === 'thunderstorm' || hazard === 'heavy-rain' || hazard === 'extreme-heat' || hazard === 'strong-wind' ? hazard : null;
}

/** The warning's day, from its id. */
export function dateOf(alert: Pick<WeatherAlert, 'id'>): string {
  return alert.id.split(':')[3] ?? '';
}

function isQuiet(at: Date): boolean {
  const hour = at.getUTCHours();
  return hour >= QUIET_FROM_HOUR || hour < MORNING_HOUR;
}

/** The earliest moment the rules allow, before quiet hours are applied. */
function opensAt(alert: WeatherAlert): number {
  const day = Date.parse(`${dateOf(alert)}T00:00:00.000Z`);
  if (alert.onset) return Date.parse(alert.onset) - STORM_LEAD_MS;
  // Nothing goes out before the evening before; `isWarningDue` narrows it.
  return day - (24 - EVENING_BEFORE_HOUR) * HOUR;
}

/**
 * Whether the warning should go out at `now`:
 * - tomorrow's from 18:00 the evening before
 * - today's from 06:00, or as soon as it appears later in the day
 * - a thunderstorm with a known start from two hours before it
 * - never after it has expired
 * - quiet from 21:00 to 06:00, except for emergencies
 */
export function isWarningDue(alert: WeatherAlert, now: Date): boolean {
  const at = now.getTime();
  if (at >= Date.parse(alert.expiresAt)) return false;
  if (isQuiet(now) && alert.severity !== 'emergency') return false;

  const day = Date.parse(`${dateOf(alert)}T00:00:00.000Z`);
  if (alert.onset) return at >= Date.parse(alert.onset) - STORM_LEAD_MS;
  if (at < day) return at >= day - (24 - EVENING_BEFORE_HOUR) * HOUR;
  return at >= day + MORNING_HOUR * HOUR || alert.severity === 'emergency';
}

/**
 * The first moment from `now` on when the warning is due, for scheduling it on
 * the phone, or null if it never will be (expired).
 */
export function firstDueTime(alert: WeatherAlert, now: Date): Date | null {
  const expires = Date.parse(alert.expiresAt);
  let at = Math.max(now.getTime(), opensAt(alert));
  // Step through the hours until the rules say yes: never more than a day.
  for (let step = 0; step < 30 && at < expires; step += 1) {
    if (isWarningDue(alert, new Date(at))) return new Date(at);
    const next = new Date(at);
    next.setUTCMinutes(0, 0, 0);
    at = next.getTime() + HOUR;
  }
  return null;
}

/** Title and body, as the server words them. */
export function warningNotificationText(alert: WeatherAlert): { title: string; body: string } {
  const level = alert.severity === 'emergency' ? 'emergency' : 'warning';
  const place = [alert.district, alert.region].filter(Boolean).join(', ');
  return {
    title: `${alert.hazardType} ${level}`,
    body: place ? `${alert.headline}. ${place}` : alert.headline,
  };
}
