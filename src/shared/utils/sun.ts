/**
 * Sunrise and sunset for a place and day, from NOAA's solar position
 * equations (the short form, good to about a minute in the tropics).
 *
 * Used to switch the rain map between its daytime and night-time look at the
 * real sunrise and sunset rather than at fixed clock hours. Ghana's day length
 * barely changes, but sunrise still moves by about half an hour through the
 * year, and a map that went dark at six on a bright evening would look wrong.
 */

const RAD = Math.PI / 180;

/** Sunrise and sunset in epoch milliseconds for the UTC day containing `date`.
 * Null for a place where the sun does not rise or set that day (polar), which
 * never happens in Ghana but keeps the function honest. */
export function sunTimes(date: Date, lat: number, lng: number): { sunrise: number; sunset: number } | null {
  const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((dayStart - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);

  // Fractional year, in radians, at local solar noon.
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const equationOfTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // 90.833 degrees allows for refraction and the sun's own size.
  const cosHourAngle = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(declination)) - Math.tan(lat * RAD) * Math.tan(declination);
  if (cosHourAngle < -1 || cosHourAngle > 1) return null;
  const hourAngle = Math.acos(cosHourAngle) / RAD;

  // Minutes after UTC midnight.
  const sunriseMin = 720 - 4 * (lng + hourAngle) - equationOfTime;
  const sunsetMin = 720 - 4 * (lng - hourAngle) - equationOfTime;
  return { sunrise: dayStart + sunriseMin * 60_000, sunset: dayStart + sunsetMin * 60_000 };
}

/** Whether the sun is up at `at` for this place. Falls back to 06:00 to 18:00
 * local clock time where the equations give no answer. */
export function isDaylight(at: Date, lat: number, lng: number): boolean {
  const times = sunTimes(at, lat, lng);
  if (!times) {
    const hour = at.getHours();
    return hour >= 6 && hour < 18;
  }
  const now = at.getTime();
  return now >= times.sunrise && now < times.sunset;
}
