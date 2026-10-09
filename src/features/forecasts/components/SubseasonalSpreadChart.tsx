import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import type { SubseasonalSeries, SubseasonalVariableId } from '../../../shared/domain/subseasonalOutlook';
import { unitFor } from '../../../shared/domain/subseasonalOutlook';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { LineAreaChart, type ChartPoint } from '../../../shared/ui/LineAreaChart';
import { Text } from '../../../shared/ui/Text';

type Props = {
  series: SubseasonalSeries;
  variable: SubseasonalVariableId;
  /** The first day of the window, so the axis carries real dates rather than
   * "day 1". Optional: the chart is still readable without it. */
  windowStart?: string;
};

const CHART_HEIGHT = 180;
const TICK_COUNT = 4;

/**
 * One grid cell's window, day by day: the ensemble mean inside its spread.
 *
 * The band is the point. A subseasonal mean on its own invites a farmer to read
 * "6 mm on the 12th" as a forecast, when what the ensemble actually says is
 * "somewhere between 1 and 14, most likely around 6". Drawing the 10th-to-90th
 * percentile makes the disagreement visible rather than leaving it to a caption,
 * which is the same rule the rest of this segment follows.
 *
 * Not the full envelope: one stray member would set the band's width and make
 * every cell look equally uncertain.
 */
export function SubseasonalSpreadChart({ series, variable, windowStart }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // The full width it is given, measured, rather than the screen less a guess
  // at the padding around it: the guess took four gutters where the drawer
  // has two, and left the chart short of the text beside it.
  const [boxWidth, setBoxWidth] = useState(0);
  const chartWidth = Math.max(boxWidth || width - theme.spacing.lg * 2, 220);
  const unit = unitFor(variable);

  const { points, band, ticks, domain, labels } = useMemo(() => {
    const mean: ChartPoint[] = series.mean.map((y, x) => ({ x, y }));
    const upper: ChartPoint[] = series.high.map((y, x) => ({ x, y }));
    const lower: ChartPoint[] = series.low.map((y, x) => ({ x, y }));

    // Whole-number ticks, in whole steps, with the scale pinned to them: an
    // axis reading 2.3, 4.7, 7 asks the reader to do sums, and a tenth of a
    // millimetre or a degree is well inside the spread the band is drawing.
    const top = Math.ceil(Math.max(...series.high, ...series.mean));
    const bottom = Math.floor(Math.min(...series.low, ...series.mean));
    const step = Math.max(1, Math.ceil((top - bottom) / TICK_COUNT));

    return {
      points: mean,
      band: { upper, lower },
      ticks: Array.from({ length: TICK_COUNT + 1 }, (_, index) => bottom + index * step),
      domain: { min: bottom, max: bottom + step * TICK_COUNT },
      // Sparse, per the project's chart rules: first, middle and last of a
      // fifteen-day window, never one label per day.
      labels: [0, Math.floor(series.mean.length / 2), series.mean.length - 1].map((at) => ({
        at,
        label: dayLabel(at, windowStart),
      })),
    };
  }, [series, windowStart]);

  return (
    <View style={{ gap: theme.spacing.xs }} onLayout={(event) => setBoxWidth(Math.floor(event.nativeEvent.layout.width))}>
      <LineAreaChart
        points={points}
        band={band}
        width={chartWidth}
        height={CHART_HEIGHT}
        color={theme.colors.accent}
        yTicks={ticks}
        yDomain={domain}
        formatY={(value) => `${value}${unit === '°C' ? '°' : ''}`}
        xLabels={labels}
        yTitle={variable === 'rainfall' ? `Rainfall (${unit} per day)` : `Daily high (${unit})`}
      />
      <Text variant="caption" muted>
        The line is the average of every forecast. The shaded band is where 8 in 10 of them fall.
      </Text>
    </View>
  );
}

/** "Day 1" is meaningless on a window that starts a fortnight out, so the axis
 * carries real dates whenever the caller knows where the window begins. */
function dayLabel(offset: number, windowStart?: string): string {
  if (!windowStart) return `Day ${offset + 1}`;

  const date = new Date(`${windowStart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return `Day ${offset + 1}`;

  date.setUTCDate(date.getUTCDate() + offset);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
