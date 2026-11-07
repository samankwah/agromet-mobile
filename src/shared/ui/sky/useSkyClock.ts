import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * A value that runs from 0 to 1 every `durationMs`, forever, on the UI thread.
 *
 * Every moving part of the sky reads one of these and works out its own
 * position from it, so a whole layer costs one animation rather than one per
 * drop or cloud.
 *
 * Pausing keeps the place reached. Restarting a repeat from 0 would make every
 * cloud jump back to where it started each time the reader came back to the
 * tab, so the progress so far is folded into `offset` instead.
 */
export function useSkyClock(durationMs: number, active: boolean): SharedValue<number> {
  const run = useSharedValue(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!active) return undefined;
    run.value = 0;
    run.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(run);
      offset.value = (offset.value + run.value) % 1;
      run.value = 0;
    };
  }, [active, durationMs, run, offset]);

  return useDerivedValue(() => (run.value + offset.value) % 1);
}

/** The same pseudo-random numbers on every render, so drops and stars do not
 * reshuffle when the screen re-renders. mulberry32. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
