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
  /** Shown in the bar's first cell ("mm", "°C", "days"). Empty for none. */
  unit: string;
  /** How to render the break values — plain numbers by default, or as a
   * week-of-month for day-of-year variables like onset/cessation. */
  valueFormat?: SpatialValueFormat;
  /** 'tercile' keys the five probability bands instead of a numeric scale. */
  mode?: 'continuous' | 'tercile';
  /** Overrides `TERCILE_CATEGORIES` in tercile mode, for variables with their
   * own published convention. See `utils/tercilePalette.ts`. Each band's
   * `sublabel` (its share, "70%+") is what the bar prints inside it. */
  categories?: { label: string; color: string; sublabel?: string }[];
  /** Kept for callers; the bar labels each band with its own `sublabel`. */
  bounds?: string[];
  /** The continuous ramp to key. Defaults to viridis; the subseasonal maps pass
   * their variable's own so the key matches the fill exactly. */
  stops?: ColorStops;
  /** Explicit class lower bounds, for a quantity with published breaks of its
   * own rather than an equal division of a range. When set, `min` and `max`
   * are ignored: the whole point of fixed breaks is that the scale does not
   * move with the data. */
  breaks?: number[];
  /** Kept for callers; the unit now always sits in the bar's first cell. */
  unitPlacement?: 'axis' | 'value';
};

const BAR_HEIGHT = 26;

/** Relative luminance of an `rgb(...)` or `#rrggbb` colour, 0 (black) to 1. */
function luminance(color: string): number {
  let r = 0;
  let g = 0;
  let b = 0;
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (rgb) {
    [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  } else if (/^#[0-9a-f]{6}/i.test(color)) {
    [r, g, b] = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
  } else {
    return 0.5;
  }
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** White on a deep colour, near-black on a pale one, whichever reads better. */
function inkOn(color: string): string {
  return luminance(color) > 0.38 ? 'rgba(20, 28, 34, 0.92)' : 'rgba(255, 255, 255, 0.96)';
}

/**
 * The map's key as one long bar, the way Windy and the big weather maps draw
 * it: the unit in the first cell, then each colour block with its value printed
 * inside it, at the block's lower edge. One line instead of a strip with a row
 * of numbers under it and a unit somewhere else, so the key takes half the
 * height and a reader matches a colour to its number without looking away.
 *
 * Still stepped, not a smooth gradient: each block is one class from
 * `buildColorClasses`, the same classing the map fill uses, so the key cannot
 * disagree with the map. The top block is open ended ("this much and above"),
 * so it carries no closing number.
 */
export function ColorScaleLegend({ min, max, unit, valueFormat = 'number', mode = 'continuous', categories, stops, breaks }: Props) {
  const theme = useTheme();
  const range = max - min;

  const cells: { key: string; color: string; label: string }[] =
    mode === 'tercile'
      ? (categories ?? TERCILE_CATEGORIES).map((category, index) => ({
          key: `${category.label}-${index}`,
          color: category.color,
          // "70%+" reads as "70+" beside a "%" cell, the way "mm" heads the rain.
          label: (category.sublabel ?? category.label).replace(/%/g, ''),
        }))
      : (breaks ? buildFixedClasses(breaks, stops ?? VIRIDIS_STOPS) : buildColorClasses(min, max, undefined, stops)).map((entry) => ({
          key: String(entry.from),
          color: entry.color,
          // Fixed breaks are published numbers, printed as they are.
          label: breaks ? String(entry.from) : formatSpatialValue(entry.from, valueFormat, range),
        }));

  const unitLabel = mode === 'tercile' ? '%' : unit;
  const accessibilityLabel = `Map key${unitLabel ? `, ${unitLabel}` : ''}: ${cells.map((cell) => cell.label).join(', ')}`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', height: BAR_HEIGHT, borderRadius: theme.radii.sm, overflow: 'hidden' }}
    >
      {unitLabel ? (
        <View style={{ justifyContent: 'center', paddingHorizontal: theme.spacing.sm, backgroundColor: theme.colors.text }}>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.colors.bg, fontFamily: theme.fontFamily.bodySemiBold }}>
            {unitLabel}
          </Text>
        </View>
      ) : null}
      {cells.map((cell) => (
        <View key={cell.key} style={{ flex: 1, justifyContent: 'center', paddingLeft: 5, backgroundColor: cell.color }}>
          <Text
            variant="caption"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ color: inkOn(cell.color), fontFamily: theme.fontFamily.bodySemiBold }}
          >
            {cell.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
