import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

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

  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          left: `${startPct}%`,
          width: `${widthPct}%`,
          height: 4,
          borderRadius: 2,
          // The same series colour the day-detail temperature chart uses, so
          // temperature is encoded identically in the list and the chart.
          // Not `warning`, which is a reserved status colour — a normal
          // 29°C day is not an alert.
          backgroundColor: theme.colors.chartTemp,
        }}
      />
    </View>
  );
}
