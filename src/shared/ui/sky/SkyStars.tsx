import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { seeded } from './useSkyClock';

/** The upper part of the sky only: stars low down would sit behind the cards. */
const FIELD = 0.55;

function StarField({ width, height, count, seed }: { width: number; height: number; count: number; seed: number }) {
  const stars = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, () => ({ x: random() * width, y: random() * height * FIELD, r: 0.5 + random() * 1.1 }));
  }, [count, height, seed, width]);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {stars.map((star, index) => (
        <Circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#ffffff" />
      ))}
    </Svg>
  );
}

/**
 * Stars and a moon. The stars are two fields that fade against each other, so
 * the sky twinkles with two animated views instead of one per star.
 */
export function SkyStars({ width, height, clock }: { width: number; height: number; clock: SharedValue<number> }) {
  const first = useAnimatedStyle(() => ({ opacity: 0.55 + Math.sin(clock.value * Math.PI * 2) * 0.35 }));
  const second = useAnimatedStyle(() => ({ opacity: 0.55 - Math.sin(clock.value * Math.PI * 2) * 0.35 }));
  const moon = width * 0.5;

  return (
    <>
      <Animated.View testID="sky-stars" style={[StyleSheet.absoluteFill, first]}>
        <StarField width={width} height={height} count={36} seed={7} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, second]}>
        <StarField width={width} height={height} count={30} seed={29} />
      </Animated.View>
      <Svg width={moon} height={moon} style={{ position: 'absolute', top: height * 0.02, right: -moon * 0.1 }}>
        <Defs>
          <RadialGradient id="skyMoon" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#dfe6ff" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#dfe6ff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={moon / 2} cy={moon / 2} r={moon / 2} fill="url(#skyMoon)" />
        <Circle cx={moon / 2} cy={moon / 2} r={moon * 0.09} fill="#f3f0e4" />
      </Svg>
    </>
  );
}
