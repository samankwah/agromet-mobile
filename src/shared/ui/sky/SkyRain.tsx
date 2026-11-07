import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import type { Precipitation } from '../../domain/skyScene';
import { seeded } from './useSkyClock';

type Strip = { drops: number; speed: number; opacity: number };

/** Drops per strip and how far a strip falls per clock cycle, by intensity.
 * Two strips at different speeds give depth. Drizzle gets one, sparse. */
const SETTINGS: Record<Exclude<Precipitation, 'none'>, { strips: Strip[]; length: number }> = {
  drizzle: { strips: [{ drops: 36, speed: 1, opacity: 0.35 }], length: 10 },
  rain: {
    strips: [
      { drops: 50, speed: 2, opacity: 0.32 },
      { drops: 40, speed: 3, opacity: 0.45 },
    ],
    length: 18,
  },
  heavy: {
    strips: [
      { drops: 80, speed: 3, opacity: 0.35 },
      { drops: 60, speed: 4, opacity: 0.5 },
    ],
    length: 24,
  },
};

/** How far a drop leans: rain in a tropical squall rarely falls straight. */
const SLANT = 0.18;

type StripProps = Strip & { width: number; height: number; length: number; seed: number; clock: SharedValue<number> };

/**
 * One screen of streaks, drawn twice, one copy above the other, and slid down
 * by a screen's height per loop. When it wraps, the top copy is exactly where
 * the bottom one was, so the fall looks endless with one moving view.
 */
function RainStrip({ width, height, drops, length, opacity, speed, seed, clock }: StripProps) {
  const lines = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: drops }, () => ({ x: random() * width, y: random() * height, l: length * (0.6 + random() * 0.6) }));
  }, [drops, height, length, seed, width]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ((clock.value * speed) % 1) * height - height }] }));

  const sheet = (
    <Svg width={width} height={height}>
      {lines.map((line, index) => (
        <Line
          key={index}
          x1={line.x}
          y1={line.y}
          x2={line.x - line.l * SLANT}
          y2={line.y + line.l}
          stroke="#dbe7f3"
          strokeOpacity={opacity}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width, height: height * 2 }, style]}>
      {sheet}
      <View style={{ position: 'absolute', top: height, left: 0 }}>{sheet}</View>
    </Animated.View>
  );
}

type Props = { precip: Precipitation; width: number; height: number; clock: SharedValue<number> };

export function SkyRain({ precip, width, height, clock }: Props) {
  if (precip === 'none') return null;
  const settings = SETTINGS[precip];
  return (
    <View testID="sky-rain" style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden' }}>
      {settings.strips.map((strip, index) => (
        <RainStrip key={index} {...strip} width={width} height={height} length={settings.length} seed={101 + index * 37} clock={clock} />
      ))}
    </View>
  );
}
