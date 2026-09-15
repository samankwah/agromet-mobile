import React from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { glyphFromCondition, glyphFromWmo, hasNightForm, type WeatherGlyph } from '../../domain/weatherGlyph';
import { useReduceMotion } from '../../a11y/useReduceMotion';
import { useTheme } from '../../theme/ThemeProvider';
import {
  BOLT,
  CLOUD,
  CLOUD_SMALL,
  DROPS_HEAVY,
  DROPS_LIGHT,
  DROPS_RAIN,
  FOG_BANDS,
  MOON,
  SUN_DISC,
  SUN_DISC_OFFSET,
  sunRays,
  type Drop,
} from './glyphPaths';

const AnimatedG = Animated.createAnimatedComponent(G);

/** How far down the moon is scaled when it shares the frame with a cloud. */
const MOON_INSET_SCALE = 0.62;

type Props = {
  /** The WMO code, where the caller has one. Preferred: it separates drizzle
   * from downpour and fog from overcast, which the condition string cannot. */
  weatherCode?: number;
  /** The condition string, used when no code is available. */
  condition?: string;
  /** False draws the night form, for the glyphs that have one. */
  isDay?: boolean;
  size?: number;
  color?: string;
  /**
   * Opt in to motion. Off by default, and deliberately: a seven-row week of
   * animating glyphs is both noisy to read and needlessly expensive on the
   * low-end Android this app targets. Turn it on for a hero, not for a list.
   */
  animated?: boolean;
};

/**
 * The weather condition icon: a thin outline glyph that can animate to match
 * what the sky is actually doing.
 *
 * Drawn here as `react-native-svg` JSX rather than taken from an icon font,
 * for two reasons. The set needs shapes no font ships (a drizzle distinct from
 * a downpour), and only real geometry can be animated part by part — a font
 * glyph is one character and can only be spun whole.
 *
 * Motion runs on Reanimated's UI thread. That matters more than it looks:
 * every comment in this codebase about animation performance names
 * JS-driven per-frame updates as the thing that stutters on a cheap phone, and
 * a rain icon is four elements moving continuously.
 *
 * **Reduced motion stops the motion, it never hides the element.** Each glyph
 * has a legible still pose, following the rule `ui/Skeleton`,
 * `chat/TypingIndicator` and `home/CityCarousel` already set.
 *
 * Hidden from screen readers, as `ui/DuotoneIcon` is: the condition is always
 * written beside the icon, so announcing it here would say the weather twice.
 */
export function LiveWeatherIcon({ weatherCode, condition, isDay = true, size = 24, color, animated = false }: Props) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();

  const glyph: WeatherGlyph = weatherCode !== undefined ? glyphFromWmo(weatherCode) : condition ? glyphFromCondition(condition) : 'clear';

  const night = !isDay && hasNightForm(glyph);
  const moving = animated && !reduceMotion;

  // Stroke width is in viewBox units, so it is already scaled by the `size`
  // the Svg is rendered at. Multiplying by `size` as well scaled it twice: at
  // 60dp the hero came out with a ~11px stroke, which closed the cloud into a
  // solid white blob. It stays near-constant instead, easing up a little at
  // small sizes so a 17dp glyph in the week strip does not turn into a
  // hairline.
  const stroke = size < 24 ? 1.9 : 1.6;
  const ink = color ?? theme.colors.text;

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Glyph glyph={glyph} night={night} moving={moving} stroke={stroke} ink={ink} accent={color ?? theme.colors.warning} />
      </Svg>
    </View>
  );
}

type GlyphProps = {
  glyph: WeatherGlyph;
  night: boolean;
  moving: boolean;
  stroke: number;
  ink: string;
  /** The warm tint for a sun or a bolt. The reference keeps weather icons
   * coloured against neutral panels, so the sun stays warm unless a caller has
   * pinned the whole icon to one colour. */
  accent: string;
};

function Glyph({ glyph, night, moving, stroke, ink, accent }: GlyphProps) {
  const common = { stroke: ink, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (glyph) {
    case 'clear':
      return night ? (
        <Path d={MOON} {...common} />
      ) : (
        <Sun moving={moving} stroke={stroke} ink={accent} disc={SUN_DISC} rayInner={6.2} rayOuter={9.4} />
      );

    case 'partly-cloudy':
      return (
        <>
          {night ? (
            // Scaling a stroked path thins its line with it, so the width is
            // divided back out to keep every glyph on the same weight.
            <Path
              d={MOON}
              {...common}
              strokeWidth={stroke / MOON_INSET_SCALE}
              transform={`translate(9.6 -1.2) scale(${MOON_INSET_SCALE})`}
            />
          ) : (
            <Sun moving={moving} stroke={stroke} ink={accent} disc={SUN_DISC_OFFSET} rayInner={4.9} rayOuter={7.1} />
          )}
          <Drift moving={moving}>
            <Path d={CLOUD_SMALL} {...common} />
          </Drift>
        </>
      );

    case 'cloudy':
    case 'overcast':
      return (
        <Drift moving={moving}>
          {/* Overcast gets a second cloud behind the first, which is the one
              visual difference between "some cloud" and "all cloud". Drawn
              first so the front cloud overlaps it, and faint so the pair does
              not read as a tangle of lines at 17dp. */}
          {glyph === 'overcast' ? <Path d={CLOUD_SMALL} {...common} opacity={0.45} transform="translate(2.2 -7.4)" /> : null}
          <Path d={CLOUD} {...common} />
        </Drift>
      );

    case 'fog':
      return (
        <>
          {/* Lifted clear of the bands below it, and quiet, because in fog the
              bands are the subject and the cloud is only context. */}
          <Path d={CLOUD_SMALL} {...common} opacity={0.5} transform="translate(0 -8.4)" />
          {FOG_BANDS.map((band, index) => (
            <FogBand key={band.y} band={band} index={index} moving={moving} stroke={stroke} ink={ink} />
          ))}
        </>
      );

    case 'drizzle':
    case 'rain':
    case 'heavy-rain':
    case 'showers':
      return (
        <>
          <Drift moving={moving}>
            <Path d={CLOUD} {...common} />
          </Drift>
          {dropsFor(glyph).map((drop) => (
            <Raindrop key={`${drop.x}`} drop={drop} moving={moving} stroke={stroke} ink={ink} />
          ))}
        </>
      );

    case 'thunderstorm':
      return (
        <>
          <Drift moving={moving}>
            <Path d={CLOUD} {...common} />
          </Drift>
          <Flash moving={moving}>
            <Path d={BOLT} fill={accent} stroke="none" />
          </Flash>
        </>
      );
  }
}

function dropsFor(glyph: WeatherGlyph): Drop[] {
  if (glyph === 'drizzle') return DROPS_LIGHT;
  if (glyph === 'heavy-rain') return DROPS_HEAVY;
  return DROPS_RAIN;
}

/** The sun: a still disc with its rays turning slowly around it. Only the rays
 * rotate — spinning the disc too would be invisible, since it is a circle. */
function Sun({
  moving,
  stroke,
  ink,
  disc,
  rayInner,
  rayOuter,
}: {
  moving: boolean;
  stroke: number;
  ink: string;
  disc: { cx: number; cy: number; r: number };
  rayInner: number;
  rayOuter: number;
}) {
  const spin = useSharedValue(0);

  React.useEffect(() => {
    if (!moving) {
      spin.value = 0;
      return;
    }
    // A full turn in 12 seconds. The rays sit at 45 degree steps, so one
    // eighth of that is a whole visual cycle, and anything faster reads as a
    // fan rather than as the sun.
    spin.value = withRepeat(withTiming(360, { duration: 12000, easing: Easing.linear }), -1, false);
  }, [moving, spin]);

  const rayProps = useAnimatedProps(() => ({
    originX: disc.cx,
    originY: disc.cy,
    rotation: spin.value,
  }));

  const common = { stroke: ink, strokeWidth: stroke, strokeLinecap: 'round' as const };

  return (
    <>
      <Circle cx={disc.cx} cy={disc.cy} r={disc.r} {...common} fill="none" />
      <AnimatedG animatedProps={rayProps}>
        {sunRays(disc.cx, disc.cy, rayInner, rayOuter).map((ray) => (
          <Line key={`${ray.x1}-${ray.y1}`} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} {...common} />
        ))}
      </AnimatedG>
    </>
  );
}

/** A cloud easing left and right. Small travel on purpose: at icon size a
 * couple of units already reads as drifting, and more looks like a mistake.
 *
 * Driven through `animatedProps` rather than an animated `style`. An SVG group
 * is not a View: it takes its transform as element props, so `translateX` has
 * to go there for react-native-svg to apply it natively. */
function Drift({ moving, children }: { moving: boolean; children: React.ReactNode }) {
  const shift = useSharedValue(0);

  React.useEffect(() => {
    if (!moving) {
      shift.value = 0;
      return;
    }
    shift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [moving, shift]);

  const props = useAnimatedProps(() => ({ translateX: shift.value }));

  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

/** One drop, falling and fading, then restarting after its own delay so the
 * rain never pulses in unison. */
function Raindrop({ drop, moving, stroke, ink }: { drop: Drop; moving: boolean; stroke: number; ink: string }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (!moving) {
      progress.value = 0;
      return;
    }
    progress.value = withDelay(drop.delay, withRepeat(withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }), -1, false));
  }, [moving, drop.delay, progress]);

  const props = useAnimatedProps(() => ({
    translateY: progress.value * 3.4,
    // Fades only over the last third of the fall, so the drop is solid for
    // most of its travel rather than ghosting the whole way down.
    opacity: progress.value > 0.66 ? 1 - (progress.value - 0.66) * 3 : 1,
  }));

  return (
    <AnimatedG animatedProps={props}>
      <Line x1={drop.x} y1={drop.y} x2={drop.x - 0.7} y2={drop.y + 2.4} stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
    </AnimatedG>
  );
}

/** The bolt, struck at intervals rather than blinking evenly: a long dark
 * pause then two quick flashes is what lightning actually looks like. */
function Flash({ moving, children }: { moving: boolean; children: React.ReactNode }) {
  const lit = useSharedValue(1);

  React.useEffect(() => {
    if (!moving) {
      lit.value = 1;
      return;
    }
    lit.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0.25, { duration: 120 }),
        withTiming(1, { duration: 120 }),
        withTiming(0.25, { duration: 1800 }),
      ),
      -1,
      false,
    );
  }, [moving, lit]);

  const props = useAnimatedProps(() => ({ opacity: lit.value }));

  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

/** A haze band sliding across. The three run at different speeds and start
 * from opposite sides, which is what keeps the stack from moving as one slab. */
function FogBand({
  band,
  index,
  moving,
  stroke,
  ink,
}: {
  band: { x1: number; x2: number; y: number };
  index: number;
  moving: boolean;
  stroke: number;
  ink: string;
}) {
  const shift = useSharedValue(0);
  const direction = index % 2 === 0 ? 1 : -1;

  React.useEffect(() => {
    if (!moving) {
      shift.value = 0;
      return;
    }
    shift.value = withRepeat(
      withSequence(
        withTiming(direction, { duration: 2200 + index * 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(-direction, { duration: 2200 + index * 500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [moving, direction, index, shift]);

  const props = useAnimatedProps(() => ({ translateX: shift.value * 1.6 }));

  return (
    <AnimatedG animatedProps={props}>
      <Line x1={band.x1} y1={band.y} x2={band.x2} y2={band.y} stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
    </AnimatedG>
  );
}
