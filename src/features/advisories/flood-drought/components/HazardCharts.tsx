import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import type { HazardDischarge, HazardSeries } from '../../../../shared/domain/hazard';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { LineAreaChart, type ChartPoint } from '../../../../shared/ui/LineAreaChart';
import { Text } from '../../../../shared/ui/Text';

/** Four evenly-spaced date labels across whatever length the series is. */
function xLabelsFor(dates: string[]) {
  if (dates.length === 0) return [];
  return [0, 0.33, 0.66, 0.99].map((fraction) => {
    const index = Math.min(dates.length - 1, Math.round(fraction * (dates.length - 1)));
    const date = new Date(dates[index]);
    return {
      at: index,
      label: Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    };
  });
}

function ChartCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Text variant="h3">{title}</Text>
      {/* Also the screen-reader content: the SVG below conveys nothing on its
          own, so the sentence has to carry the reading. */}
      <Text variant="caption" muted>
        {caption}
      </Text>
      {children}
    </Card>
  );
}

/**
 * Cumulative rainfall over 90 days, against the seasonal normal.
 *
 * Ninety daily bars would be noise nobody can total up. The cumulative curve
 * against a single normal answers the only question that matters — are we ahead
 * of or behind the season — and it is the exact quantity the drought index is
 * computed from, so the chart and the headline figure cannot disagree.
 *
 * `LineAreaChart` has no reference-line support and is deliberately
 * single-series, so the normal is passed as one of the y-axis ticks: that draws
 * a labelled gridline at exactly the right value without touching the shared
 * component or implying a second measure.
 */
export function RainfallAccumulationChart({ series, normalMm }: { series: HazardSeries | undefined; normalMm: number | null | undefined }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const chartWidth = width - theme.spacing.lg * 4;

  const observed = series?.observed;
  if (!observed?.dates?.length) return null;

  let running = 0;
  const points: ChartPoint[] = observed.dates.map((_, index) => {
    running += observed.precipitation?.[index] ?? 0;
    return { x: index, y: Math.round(running * 10) / 10 };
  });

  const total = running;
  const max = Math.max(total, normalMm ?? 0);
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  if (normalMm != null && !ticks.includes(Math.round(normalMm))) {
    ticks.push(Math.round(normalMm));
  }
  ticks.sort((a, b) => a - b);

  // LineAreaChart derives its domain from Math.min/max over the points, which
  // yields Infinity on an empty array and renders an empty axis frame. Below
  // two points there is no line to draw anyway.
  if (points.length < 2) return null;

  const caption =
    normalMm != null
      ? `${Math.round(total)} mm so far against a normal of ${Math.round(normalMm)} mm, ${
          total >= normalMm ? 'ahead of' : 'behind'
        } the seasonal average.`
      : `${Math.round(total)} mm over the last 90 days.`;

  return (
    <ChartCard title="Rainfall against normal" caption={caption}>
      <LineAreaChart
        points={points}
        width={chartWidth}
        height={180}
        // A neutral measurement, so a series colour rather than a status
        // colour — reusing danger/warning here would make rainfall read as
        // an alert.
        color={theme.colors.chartRain}
        yTicks={ticks}
        formatY={(value) => `${Math.round(value)}`}
        xLabels={xLabelsFor(observed.dates)}
        yDomain={{ min: 0, max: Math.max(max * 1.05, 1) }}
      />
    </ChartCard>
  );
}

/**
 * River discharge against its own thirty-year distribution.
 *
 * The median and 95th-percentile ticks are what make the series readable — a
 * raw figure in cubic metres per second means nothing without knowing what is
 * normal for that stretch of river.
 */
export function DischargeChart({ discharge, riverine }: { discharge: HazardDischarge | undefined; riverine: boolean }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const chartWidth = width - theme.spacing.lg * 4;

  if (!riverine || !discharge?.dates?.length || !discharge.values?.length) return null;

  const points: ChartPoint[] = discharge.dates
    .map((_, index) => ({ x: index, y: discharge.values?.[index] ?? null }))
    .filter((point): point is ChartPoint => point.y !== null);

  // Same guard as the rainfall chart: fewer than two points and there is no
  // line, only an empty axis frame.
  if (points.length < 2) return null;

  const peak = Math.max(...points.map((point) => point.y), discharge.p95 ?? 0);
  const ticks = [0];
  if (discharge.median != null) ticks.push(Math.round(discharge.median));
  if (discharge.p95 != null) ticks.push(Math.round(discharge.p95));
  ticks.push(Math.round(peak));

  return (
    <ChartCard
      title="River discharge"
      caption={`Gridlines mark the thirty-year median${
        discharge.median != null ? ` (${Math.round(discharge.median)} m³/s)` : ''
      } and 95th percentile${discharge.p95 != null ? ` (${Math.round(discharge.p95)} m³/s)` : ''} for this reach.`}
    >
      <LineAreaChart
        points={points}
        width={chartWidth}
        height={180}
        color={theme.colors.chartTemp}
        yTicks={Array.from(new Set(ticks)).sort((a, b) => a - b)}
        formatY={(value) => `${Math.round(value)}`}
        xLabels={xLabelsFor(discharge.dates)}
        yDomain={{ min: 0, max: Math.max(peak * 1.05, 1) }}
      />
    </ChartCard>
  );
}

/** Renders nothing when a region has neither series — the caller can drop the
 * whole section without checking each chart. */
export function HazardCharts({
  series,
  discharge,
  riverine,
  normalMm,
}: {
  series: HazardSeries | undefined;
  discharge: HazardDischarge | undefined;
  riverine: boolean;
  normalMm: number | null | undefined;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <RainfallAccumulationChart series={series} normalMm={normalMm} />
      <DischargeChart discharge={discharge} riverine={riverine} />
    </View>
  );
}
