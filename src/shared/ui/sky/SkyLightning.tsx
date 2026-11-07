import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** One flash pattern: a wait, a bright strike, a dimmer echo. */
function flash(waitMs: number, peak: number) {
  return withRepeat(
    withSequence(
      withDelay(waitMs, withTiming(peak, { duration: 60 })),
      withTiming(0, { duration: 90 }),
      withDelay(120, withTiming(peak * 0.6, { duration: 60 })),
      withTiming(0, { duration: 260 }),
    ),
    -1,
    false,
  );
}

/**
 * The storm's flashes. Two overlapping patterns on different cycles (about 7
 * and 11 seconds) rarely line up the same way twice, so the strikes feel
 * irregular without a JS timer choosing random gaps.
 */
export function SkyLightning({ active }: { active: boolean }) {
  const first = useSharedValue(0);
  const second = useSharedValue(0);

  useEffect(() => {
    if (!active) return undefined;
    first.value = flash(6800, 0.42);
    second.value = flash(10900, 0.3);
    return () => {
      cancelAnimation(first);
      cancelAnimation(second);
      first.value = 0;
      second.value = 0;
    };
  }, [active, first, second]);

  const style = useAnimatedStyle(() => ({ opacity: Math.max(first.value, second.value) }));

  return (
    <Animated.View testID="sky-lightning" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#eef3ff' }, style]} />
  );
}
