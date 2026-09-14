import React from 'react';
import { View } from 'react-native';

import type { SpatialValueFormat } from '../domain/spatialOutlook';
import { useTheme } from '../theme/ThemeProvider';
import { buildColorClasses, buildFixedClasses, TERCILE_CATEGORIES, VIRIDIS_STOPS, type ColorStops } from '../utils/colorScale';
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
  /** Overrides `TERCILE_CATEGORIES` in tercile mode, for variables with their
   * own published convention. See `utils/tercilePalette.ts`. `sublabel` carries
   * the share each band covers, so the key says where the bands cut rather than
   * only naming them. */
  categories?: { label: string; color: string; sublabel?: string }[];
  /** Share at each boundary between bands, one more than there are bands, for a
   * stepped key. Omit it and the blocks are labelled by name instead. */
  bounds?: string[];
  /** The continuous ramp to key. Defaults to viridis; the subseasonal maps pass
   * their variable's own so the key matches the fill exactly. */
  stops?: ColorStops;
  /** Explicit class lower bounds, for a quantity with published breaks of its
   * own rather than an equal division of a range. The rain map passes
   * `PRECIP_RATE_BREAKS`. When set, `min` and `max` are ignored: the whole point
   * of fixed breaks is that the scale does not move with the data. */
  breaks?: number[];
  /** Where the unit goes. 'axis' puts it on its own line under the scale, which
   * suits a long one like "week of month". 'value' appends it to every break,
   * which reads better for a short symbol: a bare "25" beside a bare "31" makes
   * a reader hunt for the line that says what they are counting. */
  unitPlacement?: 'axis' | 'value';
};

/**
 * A stepped (classed) legend rather than a continuous gradient: each block
 * is one class from `buildColorClasses`, so a colour on the map can be
 * matched back to an actual value range. The classing lives in
 * colorScale.ts and is shared with the map fill — the legend cannot
 * disagree with what's rendered.
 */
export function ColorScaleLegend({ min, max, unit, valueFormat = 'number', mode = 'continuous', categories, bounds, stops, breaks, unitPlacement = 'axis' }: Props) {
  const theme = useTheme();
  const classes = breaks ? buildFixedClasses(breaks, stops ?? VIRIDIS_STOPS) : buildColorClasses(min, max, undefined, stops);
  const range = max - min;
  const inlineUnit = unitPlacement === 'value' ? unit : '';
  const format = (value: number) => `${formatSpatialValue(value, valueFormat, range)}${inlineUnit}`;

  if (mode === 'tercile') {
    return (
      <View style={{ gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', borderRadius: theme.radii.sm, overflow: 'hidden' }}>
          {(categories ?? TERCILE_CATEGORIES).map((category) => (
            <View key={category.label} style={{ flex: 1, height: 12, backgroundColor: category.color }} />
          ))}
        </View>
        {/* A stepped key, labelled the same way the continuous one is: the
            share sits on the *boundary* between two colours rather than
            floating over a block's middle, where it would not say which side
            it belonged to. The colour carries the direction, so the number
            does not repeat it. Palettes with no boundaries defined keep their
            names, which is what the seasonal key still uses. */}
        {bounds ? (
          <View style={{ flexDirection: 'row' }}>
            {bounds.slice(0, -1).map((bound, index) => (
              <View key={`${bound}-${index}`} style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {bound}
                </Text>
              </View>
            ))}
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {bounds[bounds.length - 1]}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row' }}>
            {(categories ?? TERCILE_CATEGORIES).map((category) => (
              <View key={category.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {category.label}
                </Text>
              </View>
            ))}
          </View>
        )}
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
              {/* Fixed breaks are published numbers, printed as they are. Running
                  them through the range-sensitive formatter would round 0.1 away
                  on a scale whose whole point is that it does not move. */}
              {breaks ? String(entry.from) : format(entry.from)}
            </Text>
          </View>
        ))}
        {/* A fixed-break scale's top class is open ended, so it gets no closing
            boundary label: the last left-aligned break already reads as "this
            much and above". An equal-interval scale does have a maximum, and
            labelling it is what makes the last block readable. */}
        {breaks ? null : (
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {format(max)}
            </Text>
          </View>
        )}
      </View>

      {unitPlacement === 'axis' ? (
        <Text variant="caption" muted>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}
