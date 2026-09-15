import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../theme/ThemeProvider';

/**
 * A conventional cold-to-hot thermal scale, not a theme colour: blue at the
 * low end, through teal and yellow, to red at the high end. This is the
 * reading a temperature bar is expected to have — unlike a single-hue tint
 * of `chartTemp`, "blue" and "red" carry the cold/hot meaning on their own,
 * before a viewer even looks at the numbers either side of the bar.
 */
const TEMPERATURE_SCALE = ['#2b6cb0', '#38b2ac', '#ecc94b', '#ed8936', '#e53e3e'] as const;

type Props = {
  minC: number;
  maxC: number;
  /** The full week's overall min/max — the bar's colored segment is
   * positioned proportionally within this range, so a glance at the whole
   * 7-day list shows which days run hotter/cooler relative to the week,
   * matching the reference screenshots' min-max bar. */
  weekMinC: number;
  weekMaxC: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Pure position math, extracted from the component so it has one tested
 * home (see tests/ui/computeRangeBarPosition.test.ts) — guards against a
 * divide-by-zero on a flat week and keeps a narrow single-day range
 * visible with a 10%-width floor.
 */
export function computeRangeBarPosition(
  minC: number,
  maxC: number,
  weekMinC: number,
  weekMaxC: number,
): { startPct: number; widthPct: number } {
  const range = weekMaxC - weekMinC || 1;
  const startPct = clamp(((minC - weekMinC) / range) * 100, 0, 100);
  const widthPct = clamp(((maxC - minC) / range) * 100, 10, 100 - startPct);
  return { startPct, widthPct };
}

/** Pure presentational — a 7-day list row's visual min–max indicator. */
export function TemperatureRangeBar({ minC, maxC, weekMinC, weekMaxC }: Props) {
  const theme = useTheme();
  const { startPct, widthPct } = computeRangeBarPosition(minC, maxC, weekMinC, weekMaxC);

  // The segment's left edge sits at the day's low and its right edge at the
  // day's high (computeRangeBarPosition places both against the week's own
  // range), so the gradient's cool-to-warm sweep reads the bar the same way
  // it's already laid out: low on the left, high on the right.

  // The track is a groove with the coloured segment lying in it — the same
  // relationship as a slider, which is what the reference designs make of any
  // track like this.
  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.bg,
        boxShadow: theme.sunken('sm'),
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={TEMPERATURE_SCALE}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: `${startPct}%`,
          width: `${widthPct}%`,
          height: 6,
          borderRadius: 3,
        }}
      />
    </View>
  );
}
