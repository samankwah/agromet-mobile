import React from 'react';
import { View } from 'react-native';

import { glyphFromWmo } from '../../../shared/domain/weatherGlyph';
import type { HourlyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { chartPlotWidth } from '../../../shared/ui/LineAreaChart';
import { LiveWeatherIcon } from '../../../shared/ui/weather/LiveWeatherIcon';

/**
 * Every third hour, offset by one. Offsetting off hour 0 keeps the first
 * glyph's box inside the plot's left edge — hour 0 maps to exactly x=0, so
 * a centred icon there would overhang and clip on Android. Every third
 * rather than every second because at 360px the plot is ~300px wide, and a
 * 12-icon strip leaves the 24px cells touching.
 */
const STRIP_HOURS = [1, 4, 7, 10, 13, 16, 19, 22];
const CELL = 24;
const LAST_HOUR = 23;

/**
 * Whether the strip has anything to say. Compared on the resolved *glyph*
 * rather than the condition string, because several codes collapse onto one
 * picture — so distinct readings can still produce an identical row, which is
 * exactly the redundancy this guard exists to stop.
 *
 * A glyph name, not the icon component: comparing components would compare
 * function references, which happen to work only for as long as the mapping
 * stays memoised, and silently stop meaning anything if it ever does not.
 */
export function hasVaryingConditions(hours: HourlyForecast[]): boolean {
  if (hours.length < 2) return false;
  const first = glyphFromWmo(hours[0].weatherCode);
  return hours.some((hour) => glyphFromWmo(hour.weatherCode) !== first);
}

type Props = {
  hours: HourlyForecast[];
  /** The same width handed to the chart below, so both derive the identical
   * plot area and the icons sit above the hours they describe. */
  chartWidth: number;
};

/**
 * A row of condition glyphs above the temperature chart, positioned to the
 * chart's own x-scale so each one sits over its hour on the curve. It
 * carries no time labels of its own — the chart's 12AM/6AM/12PM/6PM axis
 * directly below already states the time for both.
 */
export function HourlyConditionStrip({ hours, chartWidth }: Props) {
  const theme = useTheme();

  const plotW = chartPlotWidth(chartWidth);
  const toX = (hour: number) => (hour / LAST_HOUR) * plotW;

  return (
    <View style={{ width: plotW, height: 22 }}>
      {STRIP_HOURS.map((hour) => {
        const match = hours.find((entry) => new Date(entry.hour).getUTCHours() === hour);
        if (!match) return null;

        return (
          <View key={hour} style={{ position: 'absolute', left: toX(hour) - CELL / 2, width: CELL, alignItems: 'center' }}>
            <LiveWeatherIcon weatherCode={match.weatherCode} isDay={match.isDay} size={18} color={theme.colors.muted} />
          </View>
        );
      })}
    </View>
  );
}
