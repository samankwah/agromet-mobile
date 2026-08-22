import React from 'react';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';

import { useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  data: number[] | null;
  width?: number;
  height?: number;
};

/**
 * The price sparkline on a commodity card.
 *
 * Deliberately not LineAreaChart: that component carries axes, tick labels,
 * gridlines and extreme markers, all of which are noise at 88x32 and none of
 * which a card has room for. This is the same straight-segment sparkline the
 * web market draws, so a card looks the same on both.
 *
 * Direction, not value, is the message here — the exact numbers are on the
 * card beside it and in the chart on the commodity screen.
 */
export function Sparkline({ data, width = 88, height = 32 }: Props) {
  const theme = useTheme();
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((value, index) => ({
    x: pad + (index / (data.length - 1)) * (width - pad * 2),
    y: pad + (1 - (value - min) / range) * (height - pad * 2),
  }));

  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${points[0].x},${height} ${line} ${points[points.length - 1].x},${height}`;
  const last = points[points.length - 1];
  const color = data[data.length - 1] >= data[0] ? theme.colors.accent : theme.colors.danger;

  return (
    <Svg width={width} height={height}>
      <Polygon points={area} fill={color} fillOpacity={0.12} />
      <Polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </Svg>
  );
}
