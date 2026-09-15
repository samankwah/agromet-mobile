import { classifyCondition, type ConditionKind } from '../utils/classifyCondition';

/**
 * Which picture to draw for a weather reading.
 *
 * Richer than `ConditionKind`, and deliberately so. The condition *string* is
 * one of five words by the time it leaves `api/openMeteo.ts`, and the
 * classifier turns those back into seven kinds — so fog and overcast arrive
 * indistinguishable, and a drizzle looks the same as a downpour. The WMO code
 * that would separate them is fetched at every resolution and then thrown
 * away.
 *
 * So the icon reads the code where it has one, and falls back to the string
 * where it does not. That keeps the agreement `utils/classifyCondition.ts`
 * exists to guarantee: the icon and the photographic backdrop must never
 * disagree about what the weather is.
 *
 * WMO 4677, as Open-Meteo reports it:
 *   0 clear · 1 mainly clear · 2 partly cloudy · 3 overcast
 *   45,48 fog · 51-57 drizzle · 61-67 rain · 71-77 snow
 *   80-82 rain showers · 85,86 snow showers · 95-99 thunderstorm
 */
export type WeatherGlyph =
  'clear' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'heavy-rain' | 'showers' | 'thunderstorm';

/**
 * Snow has no separate glyph. Ghana does not get any, so a snowflake here
 * would be a picture no user will ever correctly receive — a mis-decoded code
 * is far likelier than real snow, and rain is the safer thing to show. Codes
 * 71-77 and 85-86 therefore land on their rain equivalents.
 */
export function glyphFromWmo(code: number): WeatherGlyph {
  if (code >= 95) return 'thunderstorm';
  if (code >= 85) return 'showers'; // snow showers, read as showers
  if (code >= 80) return 'showers';
  if (code >= 71) return 'rain'; // snow, read as rain
  if (code >= 65) return 'heavy-rain';
  if (code >= 61) return 'rain';
  if (code >= 51) return 'drizzle';
  if (code === 45 || code === 48) return 'fog';
  if (code === 3) return 'overcast';
  if (code === 2) return 'cloudy';
  if (code === 1) return 'partly-cloudy';
  return 'clear';
}

/** The seven-kind vocabulary mapped onto glyphs, for a caller that has only a
 * condition string. Lossy in the ways the docblock above describes, which is
 * exactly why `glyphFromWmo` is preferred wherever the code is in hand. */
const GLYPH_BY_KIND: Record<ConditionKind, WeatherGlyph> = {
  thunderstorm: 'thunderstorm',
  rain: 'rain',
  overcast: 'overcast',
  cloudy: 'partly-cloudy',
  clear: 'clear',
  'clear-night': 'clear',
  'cloudy-night': 'partly-cloudy',
};

export function glyphFromCondition(condition: string): WeatherGlyph {
  return GLYPH_BY_KIND[classifyCondition(condition)];
}

/**
 * Whether a glyph has a separate night form.
 *
 * Only the clear and lightly-clouded ones do, which is the same line
 * `classifyCondition` draws and for the same reason: rain, fog and storms look
 * the same after dark, and a farmer asking "is it raining at 2am" is not
 * helped by a moon behind the answer.
 */
export function hasNightForm(glyph: WeatherGlyph): boolean {
  return glyph === 'clear' || glyph === 'partly-cloudy';
}
