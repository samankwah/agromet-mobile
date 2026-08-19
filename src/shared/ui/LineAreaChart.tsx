import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';
import { monotoneAreaPath, monotoneLinePath } from '../utils/monotonePath';

export type ChartPoint = { x: number; y: number; label?: string };

/** Room reserved on the right for the axis labels. Exported so anything
 * that has to line up with the plot area — the day-detail hourly icon
 * strip — derives its width from the chart instead of re-hardcoding it. */
export const CHART_PAD_RIGHT = 44;

/** The drawable width for a given chart width, i.e. everything left of the
 * axis labels. */
export function chartPlotWidth(width: number): number {
  return Math.max(width - CHART_PAD_RIGHT, 10);
}

type Props = {
  points: ChartPoint[];
  width: number;
  height: number;
  /** The single series colour. These charts are deliberately one series
   * each — per the visualization guidance a lone series needs no legend,
   * because the section title already names it. */
  color: string;
  /** Axis ticks, drawn on the right like the reference. */
  yTicks: number[];
  formatY: (value: number) => string;
  /** Sparse x labels (e.g. 12AM / 6AM / 12PM / 6PM) — never one per point.
   * Each also gets a vertical gridline. */
  xLabels: { at: number; label: string }[];
  /** Direct-label the extremes rather than every point. */
  markExtremes?: boolean;
  extremeLabels?: { high: string; low: string };
  /** Clamp the y domain (precipitation is always 0-100). */
  yDomain?: { min: number; max: number };
};

const PAD_BOTTOM = 30; // room for the time axis, clear of the plot floor
const PAD_TOP_MARKED = 18; // room for the H/L labels above the line

/**
 * A single-series line+area chart, drawn with react-native-svg.
 *
 * Follows the project's visualization rules: one measure on one axis (never
 * a second y-scale), recessive gridlines, and labels only on the extremes
 * rather than on every point — a number on every point is noise, not
 * information.
 *
 * The curve is monotone-cubic smoothed (see utils/monotonePath), which is
 * what keeps 24 hourly readings from reading as a polygon while guaranteeing
 * the line never rises above the "H" marker labelling the day's high.
 */
export function LineAreaChart({ points, width, height, color, yTicks, formatY, xLabels, markExtremes, extremeLabels, yDomain }: Props) {
  const theme = useTheme();

  const padTop = markExtremes ? PAD_TOP_MARKED : 8;
  const plotW = chartPlotWidth(width);
  const plotH = Math.max(height - PAD_BOTTOM - padTop, 10);
  const baselineY = padTop + plotH;

  // Sorted here rather than inside the path helper so the array used for
  // the area's closing edge is the same one the curve was built from.
  const sorted = React.useMemo(() => [...points].sort((a, b) => a.x - b.x), [points]);

  const ys = sorted.map((p) => p.y);
  const minY = yDomain?.min ?? Math.min(...ys);
  const maxY = yDomain?.max ?? Math.max(...ys);
  const span = maxY - minY || 1;

  const xs = sorted.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const spanX = maxX - minX || 1;

  const toX = (x: number) => ((x - minX) / spanX) * plotW;
  const toY = (y: number) => padTop + plotH - ((y - minY) / span) * plotH;

  const linePath = monotoneLinePath(sorted, toX, toY);
  const areaPath = monotoneAreaPath(sorted, toX, toY, baselineY);

  const highPoint = sorted.reduce((a, b) => (b.y > a.y ? b : a), sorted[0]);
  const lowPoint = sorted.reduce((a, b) => (b.y < a.y ? b : a), sorted[0]);
  const gradientId = `chart-fill-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.85} />
            <Stop offset="1" stopColor={color} stopOpacity={0.1} />
          </LinearGradient>
        </Defs>

        {/* Recessive grid — present enough to read a value against, quiet
            enough not to compete with the data. Drawn first so the series
            always sits on top of it. */}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <React.Fragment key={`grid-${tick}`}>
              <Line x1={0} y1={y} x2={plotW} y2={y} stroke={theme.colors.border} strokeWidth={0.5} opacity={0.5} />
              <SvgText x={plotW + 8} y={y + 4} fill={theme.colors.muted} fontSize={11}>
                {formatY(tick)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Vertical dotted rules under each time label, so an hour can be
            traced up to the curve without counting gridlines. */}
        {xLabels.map((entry) => (
          <Line
            key={`vgrid-${entry.label}`}
            x1={toX(entry.at)}
            y1={padTop}
            x2={toX(entry.at)}
            y2={baselineY}
            stroke={theme.colors.border}
            strokeWidth={0.5}
            strokeDasharray="2 4"
            opacity={0.7}
          />
        ))}

        {/* Separates the plot from its value labels. */}
        <Line x1={plotW} y1={padTop} x2={plotW} y2={baselineY} stroke={theme.colors.border} strokeWidth={1} opacity={0.8} />

        <Path d={areaPath} fill={`url(#${gradientId})`} />
        <Path d={linePath} stroke={color} strokeWidth={3.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {markExtremes && highPoint && lowPoint ? (
          <>
            {/* The halo is the page background, not `surface` — these charts
                sit directly on the page now, not inside a card. */}
            <Circle cx={toX(highPoint.x)} cy={toY(highPoint.y)} r={5} fill={color} stroke={theme.colors.bg} strokeWidth={2} />
            <Circle cx={toX(lowPoint.x)} cy={toY(lowPoint.y)} r={5} fill={color} stroke={theme.colors.bg} strokeWidth={2} />
            <SvgText x={toX(highPoint.x)} y={toY(highPoint.y) - 12} fill={theme.colors.text} fontSize={11} textAnchor="middle">
              {extremeLabels?.high ?? 'H'}
            </SvgText>
            <SvgText x={toX(lowPoint.x)} y={toY(lowPoint.y) - 12} fill={theme.colors.text} fontSize={11} textAnchor="middle">
              {extremeLabels?.low ?? 'L'}
            </SvgText>
          </>
        ) : null}

        {xLabels.map((entry) => (
          <SvgText
            key={entry.label}
            x={toX(entry.at)}
            y={baselineY + 20}
            fill={theme.colors.muted}
            fontSize={11}
            // The first and last labels anchor inward so they can't clip
            // off either edge of the canvas.
            textAnchor={entry.at === minX ? 'start' : entry.at === maxX ? 'end' : 'middle'}
          >
            {entry.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
