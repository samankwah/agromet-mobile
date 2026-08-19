/**
 * Reduces a free-text condition string ("Thunderstorms likely", "Light
 * rain", "Hazy sunshine") to a small set of kinds.
 *
 * One classifier, several consumers — the condition icon and the weather
 * backdrop both derive from this rather than each keeping its own keyword
 * list, which is how the two would end up disagreeing about what "hazy
 * sunshine" is.
 *
 * A real provider would give a WMO code instead; that integration replaces
 * the body of this function and nothing else.
 */
export type ConditionKind = 'thunderstorm' | 'rain' | 'overcast' | 'cloudy' | 'clear' | 'clear-night' | 'cloudy-night';

export function classifyCondition(condition: string): ConditionKind {
  const value = condition.toLowerCase();

  if (value.includes('thunder') || value.includes('storm')) return 'thunderstorm';
  if (value.includes('rain') || value.includes('shower') || value.includes('drizzle')) return 'rain';
  if (value.includes('overcast')) return 'overcast';
  // Night is only distinguished for the clear and lightly-clouded kinds.
  // Rain, storms and overcast look the same after dark, and a farmer
  // reading "is it raining at 2am" is not helped by a moon behind it.
  if (value.includes('night')) {
    return value.includes('cloud') ? 'cloudy-night' : 'clear-night';
  }
  if (value.includes('cloud') || value.includes('haz') || value.includes('fog') || value.includes('mist')) return 'cloudy';
  if (value.includes('sun') || value.includes('clear') || value.includes('fair')) return 'clear';

  return 'cloudy';
}

/**
 * Ghana sits between roughly 5°N and 11°N, so day length barely varies
 * across the year — a fixed 06:00-18:00 window is an accurate daylight
 * test there, and avoids pulling in a sunrise/sunset calculation for a
 * purely cosmetic decision.
 */
export function isDaytime(isoTimestamp: string): boolean {
  const hour = new Date(isoTimestamp).getHours();
  if (Number.isNaN(hour)) return true; // unreadable timestamp: assume day
  return hour >= 6 && hour < 18;
}
