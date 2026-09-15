import React from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { glyphFromCondition, glyphFromWmo, hasNightForm, type WeatherGlyph } from '../../domain/weatherGlyph';
import { useReduceMotion } from '../../a11y/useReduceMotion';
import { ClayIcon } from '../clay/ClayIcon';
import type { ClayIconName } from '../clay/clayIcons';

type Props = {
  /** The WMO code, where the caller has one. Preferred: it separates drizzle
   * from downpour and fog from overcast, which the condition string cannot. */
  weatherCode?: number;
  /** The condition string, used when no code is available. */
  condition?: string;
  /** False draws the night form, for the glyphs that have one. */
  isDay?: boolean;
  size?: number;
  /**
   * Opt in to motion. Off by default, and deliberately: a seven-row week of
   * animating icons is both noisy to read and needlessly expensive on the
   * low-end Android this app targets. Turn it on for a hero, not for a list.
   */
  animated?: boolean;
};

/**
 * The weather condition icon: one of the 3D renders in `assets/icons3d`,
 * chosen from the WMO code.
 *
 * This was hand-drawn `react-native-svg` until the design called for true 3D
 * art. The art is now a bitmap, and three things went with the change, all of
 * them deliberate and none of them recoverable without going back to vector:
 *
 *  - **No part-by-part motion.** The old glyph could drift its cloud, fall its
 *    drops on staggered delays and strike its bolt, because every piece was a
 *    separate element. A render is one image, so `animated` is now a slow float
 *    of the whole icon. Quieter, and the right call for a bitmap: nothing looks
 *    worse than a photograph of rain being slid around.
 *  - **No tinting.** The old `color` prop forced the glyph to one colour so it
 *    could sit on a photographic backdrop. These carry their own lighting and
 *    read on an image without help, so the prop is gone rather than lying about
 *    being honoured.
 *  - **Two lost distinctions.** See `iconFor` below.
 *
 * Reduced motion stops the float; the icon is fully legible still, which is the
 * rule `ui/Skeleton` and `chat/TypingIndicator` already follow.
 *
 * Decorative, via `ClayIcon`: the condition is always written beside it.
 */
export function LiveWeatherIcon({ weatherCode, condition, isDay = true, size = 24, animated = false }: Props) {
  const reduceMotion = useReduceMotion();

  const glyph: WeatherGlyph = weatherCode !== undefined ? glyphFromWmo(weatherCode) : condition ? glyphFromCondition(condition) : 'clear';
  const night = !isDay && hasNightForm(glyph);
  const moving = animated && !reduceMotion;

  return (
    <Float moving={moving} size={size}>
      <ClayIcon name={iconFor(glyph, night)} size={size} />
    </Float>
  );
}

/**
 * Which render stands for which sky.
 *
 * The three-step cloud ladder is the part worth reading carefully, because the
 * glyph names and the WMO codes pull in opposite directions: `partly-cloudy` is
 * WMO 1, *mainly clear*, so it gets the icon with the smallest cloud; `cloudy`
 * is WMO 2 and gets the middling one; `overcast` is WMO 3 and gets the bare
 * cloud with no sun behind it at all.
 *
 * **Two distinctions are knowingly lost here**, and `domain/weatherGlyph.ts`
 * exists precisely to preserve them, so this is a real cost rather than an
 * oversight:
 *
 *  - `drizzle` and `showers` both land on the light rain cloud.
 *  - `rain` and `heavy-rain` both land on the plain rain cloud.
 *
 * The set has no heavier-rain render to promote a downpour to, and inventing
 * one by compositing would not survive next to art this consistent. The code
 * that separates them is still carried on the forecast and still reaches the
 * text, so nothing downstream of the icon lost anything — a farmer reading
 * "Heavy rain" beside the label still gets it. If the set ever gains a heavier
 * render, this function is the only place that has to learn about it.
 *
 * Night has two forms only. `hasNightForm` already limits it to the two glyphs
 * where a moon helps, and of those, only clear has a true night render: there
 * is no moon-behind-cloud in the set, so a lightly clouded night falls back to
 * the bare cloud. A plain cloud after dark is at worst incomplete; a sun behind
 * a cloud at 2am would be wrong.
 */
function iconFor(glyph: WeatherGlyph, night: boolean): ClayIconName {
  if (night) return glyph === 'clear' ? 'moon' : 'cloud';

  switch (glyph) {
    case 'clear':
      return 'sun';
    case 'partly-cloudy':
      return 'sun-small-cloud';
    case 'cloudy':
      return 'sun-cloud';
    case 'overcast':
      return 'cloud';
    case 'fog':
      return 'fog';
    case 'drizzle':
    case 'showers':
      return 'sun-rain-cloud';
    case 'rain':
    case 'heavy-rain':
      return 'cloud-rain';
    case 'thunderstorm':
      return 'cloud-lightning-rain';
  }
}

/**
 * A slow rise and fall, scaled to the icon so a 60dp hero travels further than
 * a 22dp row and both read as the same gentle motion.
 *
 * An animated `style` here rather than the `animatedProps` the SVG version
 * needed: this is a real View wrapping an Image, not an SVG group, so the
 * ordinary transform path applies and runs on the UI thread as usual.
 */
function Float({ moving, size, children }: { moving: boolean; size: number; children: React.ReactNode }) {
  const lift = useSharedValue(0);

  React.useEffect(() => {
    if (!moving) {
      lift.value = 0;
      return;
    }
    lift.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [moving, lift]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value * size * 0.035 }] }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
