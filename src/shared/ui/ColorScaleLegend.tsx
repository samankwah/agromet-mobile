import React from 'react';
import { View } from 'react-native';

import type { SpatialValueFormat } from '../domain/spatialOutlook';
import { useTheme } from '../theme/ThemeProvider';
import { buildColorClasses, TERCILE_CATEGORIES } from '../utils/colorScale';
import { formatSpatialValue } from '../utils/formatSpatialValue';
import { Text } from './Text';

type Props = {
  min: number;
  max: number;
  unit: string;
  /** How to render the break values — plain numbers by default, or as a
   * week-of-month for day-of-year variables like onset/cessation. */
  valueFormat?: SpatialValueFormat;
  /** 'tercile' renders the three named probability categories instead of
   * a numeric scale — a probabilistic forecast has no meaningful numeric
   * axis to label. */
  mode?: 'continuous' | 'tercile';
};

/**
 * A stepped (classed) legend rather than a continuous gradient: each block
 * is one class from `buildColorClasses`, so a colour on the map can be
 * matched back to an actual value range. The classing lives in
 * colorScale.ts and is shared with the map fill — the legend cannot
 * disagree with what's rendered.
 */
export function ColorScaleLegend({ min, max, unit, valueFormat = 'number', mode = 'continuous' }: Props) {
  const theme = useTheme();
  const classes = buildColorClasses(min, max);
  const range = max - min;
  const format = (value: number) => formatSpatialValue(value, valueFormat, range);

  if (mode === 'tercile') {
    return (
      <View style={{ gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', borderRadius: theme.radii.sm, overflow: 'hidden' }}>
          {TERCILE_CATEGORIES.map((category) => (
            <View key={category.label} style={{ flex: 1, height: 12, backgroundColor: category.color }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}>
          {TERCILE_CATEGORIES.map((category) => (
            <View key={category.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {category.label}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="caption" muted>
          {unit}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', borderRadius: theme.radii.sm, overflow: 'hidden' }}>
        {classes.map((entry) => (
          <View key={entry.from} style={{ flex: 1, height: 12, backgroundColor: entry.color }} />
        ))}
      </View>

      {/* Labels sit on the class *boundaries*, so each number lines up with
          the edge between two blocks rather than floating over a block's
          middle where it would be ambiguous. */}
      <View style={{ flexDirection: 'row' }}>
        {classes.map((entry) => (
          <View key={entry.from} style={{ flex: 1, alignItems: 'flex-start' }}>
            <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {format(entry.from)}
            </Text>
          </View>
        ))}
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {format(max)}
          </Text>
        </View>
      </View>

      <Text variant="caption" muted>
        {unit}
      </Text>
    </View>
  );
}
