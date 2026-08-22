import React, { useCallback, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { ForecastRow } from '../../../../shared/domain/weeklyAdvisory';
import { tint } from '../../../../shared/theme/blend';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

type Props = { rows: ForecastRow[] };

const COLUMN_WIDTH = 156;
const LABEL_WIDTH = 104;

/**
 * An icon per weather parameter, so the columns can be found without reading.
 *
 * Keyed on the spreadsheet's own spellings, which are not consistent — the
 * template says "TEMP" in one bulletin and "TEMPERATURE" in another, and
 * "EVAPO-TRANSP." with the full stop. Both spellings map to the same icon
 * rather than one of them silently falling through to the default.
 */
const PARAMETER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  RAINFALL: 'rainy-outline',
  TEMP: 'thermometer-outline',
  TEMPERATURE: 'thermometer-outline',
  HUMIDITY: 'water-outline',
  'SOIL MOISTURE': 'leaf-outline',
  'SOIL TEMP': 'thermometer-outline',
  'SOIL TEMPERATURE': 'thermometer-outline',
  'SUNSHINE INTENSITY': 'sunny-outline',
  SUNSHINE: 'sunny-outline',
  SUNRISE: 'partly-sunny-outline',
  SUNSET: 'moon-outline',
  'EVAPO-TRANSP.': 'swap-vertical-outline',
  EVAPOTRANSPIRATION: 'swap-vertical-outline',
};

function iconFor(parameter: string): keyof typeof Ionicons.glyphMap {
  return PARAMETER_ICONS[parameter.toUpperCase()] ?? 'ellipse-outline';
}

type BandKey = 'forecast' | 'implication' | 'advisory';

/**
 * The week's forecast, one column per weather parameter.
 *
 * Three bands, the same three the web bulletin has: what the weather will do,
 * what that means, and what to do about it. The advisory belongs in the table
 * and not in cards underneath — it is the answer to the column it sits in, and
 * lifting it out separates a parameter's reading from its instruction.
 *
 * The header is a deep accent-to-teal gradient carrying white uppercase labels
 * with each parameter's icon stacked above, matching the web. Every colour
 * comes from the theme, so this holds up in dark mode where the web's fixed
 * emerald would not, and every tint is blended opaque rather than alpha-suffixed
 * so Android's elevation shadow cannot show through it.
 *
 * The frozen label column follows CalendarGrid's technique, which already
 * solved this and documented the traps: the labels are a plain View rather than
 * a second scroller, so they cannot drift out of step with the rows, and the
 * header mirrors the body's offset through a native-driven transform rather
 * than a JS scroll handler.
 *
 * Band heights are measured rather than assumed. An advisory is a full sentence
 * whose wrapped height depends on the font, the text and the column width, and
 * a guess that came up short would clip the one line a farmer most needs to
 * read. Each body band reports its height and the frozen label matches it.
 */
export function ForecastTable({ rows }: Props) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [heights, setHeights] = useState<Partial<Record<BandKey, number>>>({});

  const onBandLayout = useCallback(
    (key: BandKey) => (event: LayoutChangeEvent) => {
      const measured = Math.round(event.nativeEvent.layout.height);
      setHeights((current) => (current[key] === measured ? current : { ...current, [key]: measured }));
    },
    [],
  );

  if (rows.length === 0) return null;

  const viewportWidth = Math.max(140, screenWidth - LABEL_WIDTH - theme.spacing.lg * 2 - 2);
  const bodyWidth = COLUMN_WIDTH * rows.length;

  const caption = theme.typeScale.caption;
  const headerHeight = caption.lineHeight * 2 + theme.spacing.lg;
  const minBandHeight = Math.max(theme.minTouchTarget, caption.lineHeight * 2 + theme.spacing.md);

  const gradient: [string, string] = [theme.colors.accentStrong, theme.colors.teal];
  const forecastFill = tint(theme.colors.accent, theme.colors.surface, 0.09);
  const advisoryFill = tint(theme.colors.accent, theme.colors.surface, 0.05);

  const bandHeight = (key: BandKey) => Math.max(heights[key] ?? minBandHeight, minBandHeight);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Ionicons name="grid-outline" size={16} color={theme.colors.accent} />
          <Text variant="caption" color={theme.colors.accent} style={{ letterSpacing: 0.8 }}>
            DETAILED FORECAST
          </Text>
        </View>
        <Text variant="caption" muted>
          Swipe sideways for the other measurements.
        </Text>
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row' }}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: LABEL_WIDTH,
            height: headerHeight,
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.sm,
          }}
        >
          <Text variant="caption" color={theme.colors.onAccent} style={{ letterSpacing: 0.6 }}>
            MEASURE
          </Text>
        </LinearGradient>

        <View style={{ width: viewportWidth, overflow: 'hidden' }}>
          <Animated.View style={{ width: bodyWidth, transform: [{ translateX: Animated.multiply(scrollX, -1) }] }}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', height: headerHeight, width: bodyWidth }}
            >
              {rows.map((row) => (
                <View
                  key={row.parameter}
                  style={{
                    width: COLUMN_WIDTH,
                    paddingHorizontal: theme.spacing.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.colors.onAccent + '33',
                  }}
                >
                  <Ionicons name={iconFor(row.parameter)} size={15} color={theme.colors.onAccent} />
                  <Text
                    variant="caption"
                    color={theme.colors.onAccent}
                    numberOfLines={2}
                    style={{ textAlign: 'center', letterSpacing: 0.4 }}
                  >
                    {row.parameter}
                  </Text>
                </View>
              ))}
            </LinearGradient>
          </Animated.View>
        </View>
      </View>

      {/* Body */}
      <View style={{ flexDirection: 'row' }}>
        {/* The frozen column. A plain View, not a scroller — which is precisely
            why it cannot fall out of step with the rows beside it. */}
        <View style={{ width: LABEL_WIDTH }}>
          <RowLabel label="FORECAST" height={bandHeight('forecast')} fill={forecastFill} strong />
          <RowLabel label="IMPLICATION" height={bandHeight('implication')} fill={theme.colors.surface} divided />
          <RowLabel label="ADVISORY" height={bandHeight('advisory')} fill={forecastFill} strong divided />
        </View>

        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator
          bounces={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          style={{ width: viewportWidth }}
        >
          <View style={{ width: bodyWidth }}>
            {/* One gridline layer behind the bands rather than a border per
                cell, which would double up along every shared edge. */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {rows.map((row, index) => (
                <View
                  key={row.parameter}
                  style={{
                    position: 'absolute',
                    left: index * COLUMN_WIDTH,
                    top: 0,
                    bottom: 0,
                    width: StyleSheet.hairlineWidth,
                    backgroundColor: theme.colors.border,
                  }}
                />
              ))}
            </View>

            {/* Tinted: it carries the measured values, and is read first. */}
            <Band
              rows={rows}
              field="forecast"
              minHeight={minBandHeight}
              fill={forecastFill}
              onLayout={onBandLayout('forecast')}
              render={(row) => (
                <Text variant="bodyStrong" color={theme.colors.accentStrong} style={{ textAlign: 'center' }}>
                  {row.forecast}
                </Text>
              )}
            />

            <Band
              rows={rows}
              field="implication"
              minHeight={minBandHeight}
              fill={theme.colors.surface}
              divided
              onLayout={onBandLayout('implication')}
              render={(row) => (
                <Text variant="caption" muted style={{ textAlign: 'center' }}>
                  {row.implication}
                </Text>
              )}
            />

            {/* The point of the whole table: the sentence the farmer acts on.
                Nothing in this band is truncated. */}
            <Band
              rows={rows}
              field="advisory"
              minHeight={minBandHeight}
              fill={advisoryFill}
              divided
              onLayout={onBandLayout('advisory')}
              render={(row) => (
                <Text variant="caption" color={theme.colors.accentStrong} style={{ textAlign: 'center' }}>
                  {row.advisory}
                </Text>
              )}
            />
          </View>
        </Animated.ScrollView>
      </View>
    </Card>
  );
}

/** One horizontal band of cells, sized by its tallest cell. */
function Band({
  rows,
  field,
  minHeight,
  fill,
  divided,
  onLayout,
  render,
}: {
  rows: ForecastRow[];
  field: BandKey;
  minHeight: number;
  fill: string;
  divided?: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  render: (row: ForecastRow) => React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        minHeight,
        backgroundColor: fill,
        borderTopWidth: divided ? StyleSheet.hairlineWidth : 0,
        borderColor: theme.colors.border,
      }}
    >
      {rows.map((row) => (
        <View
          key={`${field}-${row.parameter}`}
          style={{
            width: COLUMN_WIDTH,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {render(row)}
        </View>
      ))}
    </View>
  );
}

/** The row's name, tinted to match the band it labels. */
function RowLabel({
  label,
  height,
  fill,
  strong,
  divided,
}: {
  label: string;
  height: number;
  fill: string;
  strong?: boolean;
  divided?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        height,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: fill,
        borderTopWidth: divided ? StyleSheet.hairlineWidth : 0,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
      }}
    >
      <Text
        variant="caption"
        color={strong ? theme.colors.accentStrong : theme.colors.muted}
        style={{ letterSpacing: 0.6 }}
      >
        {label}
      </Text>
    </View>
  );
}
