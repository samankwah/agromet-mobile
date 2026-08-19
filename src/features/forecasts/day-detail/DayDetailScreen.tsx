import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getDayDetail } from '../../../shared/api/forecastService';
import type { DailyForecast, HourlyForecast, WeeklyForecast } from '../../../shared/domain/forecast';
import { useLocationStore } from '../../../shared/state/locationStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { BulletList } from '../../../shared/ui/BulletList';
import { Card } from '../../../shared/ui/Card';
import { DetailRow } from '../../../shared/ui/DetailRow';
import { Divider } from '../../../shared/ui/Divider';
import { LineAreaChart } from '../../../shared/ui/LineAreaChart';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { Screen } from '../../../shared/ui/Screen';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';
import { getConditionIcon } from '../../../shared/utils/getConditionIcon';
import { DayStrip } from './DayStrip';
import { HourlyConditionStrip, hasVaryingConditions } from './HourlyConditionStrip';

const X_LABELS = [
  { at: 0, label: '12AM' },
  { at: 6, label: '6AM' },
  { at: 12, label: '12PM' },
  { at: 18, label: '6PM' },
];
const CLOSE_SIZE = 32;

function hourOf(iso: string): number {
  return new Date(iso).getUTCHours();
}

/** Builds the plain-language recap the reference shows, from the day's own
 * hourly curve rather than canned text — so it always matches the chart
 * directly above it. */
function buildDailySummary(day: DailyForecast, hours: HourlyForecast[]): string {
  if (hours.length === 0) return day.farmerInterpretation;

  const warmest = hours.reduce((a, b) => (b.tempC > a.tempC ? b : a));
  const coolest = hours.reduce((a, b) => (b.tempC < a.tempC ? b : a));
  const fmt = (h: HourlyForecast) => new Date(h.hour).toLocaleTimeString(undefined, { hour: 'numeric', timeZone: 'UTC' });
  const weekday = new Date(day.date).toLocaleDateString(undefined, { weekday: 'long' });

  return (
    `${weekday}'s low will be ${formatTemperature(coolest.tempC)} around ${fmt(coolest)}, ` +
    `and the high will be ${formatTemperature(warmest.tempC)} around ${fmt(warmest)}. ` +
    `Rain is most likely at ${day.rainfallProbabilityPct}% chance, with about ${day.rainfallMm} mm expected.`
  );
}

type Props = { date: string };

export function DayDetailScreen({ date }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const locationId = useLocationStore((state) => state.selectedLocationId);
  const [selectedDate, setSelectedDate] = useState(date);
  const [tempMode, setTempMode] = useState(0);
  const [metric, setMetric] = useState<MetricId>('conditions');

  const query = useQuery({
    queryKey: ['dayDetail', locationId, selectedDate],
    queryFn: () => getDayDetail(locationId, selectedDate),
  });

  return (
    // Full-bleed so the header can span edge to edge and the charts aren't
    // inset by a card. Screen still owns the safe-area insets and the themed
    // background — the same escape hatch ForecastsScreen uses.
    <Screen scroll={false} padded={false}>
      <ConditionsHeader onClose={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          // Screen's SafeAreaView doesn't claim the bottom edge and this
          // route has no tab bar beneath it, so without this the last card
          // would sit on the home indicator.
          paddingBottom: insets.bottom + theme.spacing['3xl'],
          gap: theme.spacing.lg,
        }}
      >
        <AsyncStateView status={query.status} error={query.error} onRetry={query.refetch}>
          {query.data ? (
            <DayDetail
              day={query.data.day}
              hours={query.data.hours}
              week={query.data.week}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              tempMode={tempMode}
              onTempMode={setTempMode}
              metric={metric}
              // Reset the sub-mode too: leaving it on index 1 would land a
              // switch from "Feels Like" straight onto "Amount".
              onMetric={(id) => {
                setMetric(id);
                setTempMode(0);
              }}
              chartWidth={width - theme.spacing.lg * 2}
            />
          ) : null}
        </AsyncStateView>
      </ScrollView>
    </Screen>
  );
}

/**
 * Pinned by being a flex sibling above the ScrollView rather than a sticky
 * or absolutely-positioned child. The ScrollView clips to its own frame, so
 * an opaque header reads exactly like the reference's pinned sheet header —
 * without stickyHeaderIndices, whose Android implementation loses z-order to
 * Card's own elevation.
 */
function ConditionsHeader({ onClose }: { onClose: () => void }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="header"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.bg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}
    >
      {/* The left margin matching the close button's width is what centres
          the title group, rather than a second spacer view. */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          marginLeft: CLOSE_SIZE,
        }}
      >
        <Ionicons name="cloud-outline" size={18} color={theme.colors.muted} />
        <Text variant="h3" numberOfLines={1}>
          Conditions
        </Text>
      </View>

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close day details"
        // 32 + 12 hitSlop per side clears the 44pt minimum without a 44pt
        // circle dominating the header.
        hitSlop={12}
        style={({ pressed }) => ({
          width: CLOSE_SIZE,
          height: CLOSE_SIZE,
          borderRadius: CLOSE_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceStrong,
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="close" size={18} color={theme.colors.muted} />
      </Pressable>
    </View>
  );
}

/**
 * The reference's pill, top-right of the hero row: it chooses which measure
 * the main chart plots. Only measures with genuine hour-by-hour values are
 * offered — wind and humidity are daily figures in this data, and charting
 * a flat line across 24 hours would imply detail that isn't there.
 */
const METRICS = [
  {
    id: 'conditions',
    label: 'Conditions',
    icon: 'partly-sunny-outline',
    modes: ['Actual', 'Feels Like'],
    subtitle: 'Temperature · Feels Like',
  },
  { id: 'uv', label: 'UV Index', icon: 'sunny-outline', modes: [], subtitle: 'Sun strength' },
  { id: 'wind', label: 'Wind', icon: 'navigate-outline', modes: [], subtitle: 'Speed' },
  {
    id: 'precipitation',
    label: 'Precipitation',
    icon: 'rainy-outline',
    modes: ['Chance', 'Amount'],
    subtitle: 'Chance · Amount',
  },
  { id: 'humidity', label: 'Humidity', icon: 'water-outline', modes: [], subtitle: 'Relative humidity' },
] as const;

type MetricId = (typeof METRICS)[number]['id'];

function metricFor(id: MetricId) {
  return METRICS.find((entry) => entry.id === id) ?? METRICS[0];
}

/**
 * The measure menu, anchored under the pill rather than presented as a
 * bottom sheet — it belongs to the control that opened it, which is what
 * the reference does. Measured with measureInWindow at open time so the
 * card lands under the pill whatever the hero row's height works out to.
 */
function MetricPill({ metric, onSelect }: { metric: MetricId; onSelect: (id: MetricId) => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number }>({ top: 0, right: theme.spacing.lg });
  const current = metricFor(metric);

  // Opened first, positioned second. Gating the open on measureInWindow's
  // callback means the menu never appears if that callback doesn't fire —
  // which is exactly what happens without a native layout pass.
  const openMenu = () => {
    setOpen(true);
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      setPosition({ top: y + h + theme.spacing.xs, right: Math.max(width - (x + w), theme.spacing.sm) });
    });
  };

  return (
    <View ref={anchorRef} collapsable={false} style={{ flexShrink: 0 }}>
      <Pressable
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={`Chart measure: ${current.label}. Choose another.`}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          minHeight: 36,
          borderRadius: 999,
          backgroundColor: theme.colors.surfaceStrong,
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {/* The selected measure's own icon, at full text contrast — this is
            the only thing on screen that says which measure the chart is
            currently plotting. */}
        <Ionicons name={current.icon} size={18} color={theme.colors.text} />
        <Ionicons name="chevron-down" size={14} color={theme.colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close measure menu">
          <View
            style={{
              position: 'absolute',
              top: position.top,
              right: position.right,
              minWidth: 240,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceStrong,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.elevation.raised,
            }}
          >
            {METRICS.map((entry) => {
              const isSelected = entry.id === metric;
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => {
                    onSelect(entry.id);
                    setOpen(false);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  style={{
                    minHeight: theme.minTouchTarget,
                    paddingHorizontal: theme.spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  {/* A fixed slot, not a transparent-coloured icon — Ionicons
                      doesn't honour a transparent colour on Android, which
                      made every row look selected. */}
                  <View style={{ width: 18, alignItems: 'center' }}>
                    {isSelected ? <Ionicons name="checkmark" size={18} color={theme.colors.accent} /> : null}
                  </View>
                  <Ionicons name={entry.icon} size={20} color={theme.colors.muted} />
                  <View style={{ flexShrink: 1 }}>
                    <Text variant="body">{entry.label}</Text>
                    {/* Only the selected row names its sub-modes, as in the
                        reference — on the others it would be noise. */}
                    {isSelected ? (
                      <Text variant="caption" muted>
                        {entry.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Everything that differs between the measures the pill can select, so the
 * chart itself stays one component rather than four near-copies. Each
 * measure has two sub-modes, chosen by the segmented control below the
 * chart — the same pairing the reference names in its menu subtitle. */
function buildChartConfig(metric: MetricId, mode: number, theme: ReturnType<typeof useTheme>, hours: HourlyForecast[]) {
  if (metric === 'uv') {
    const points = hours.map((h) => ({ x: hourOf(h.hour), y: h.uvIndex }));
    return {
      points,
      color: theme.colors.chartTemp,
      ticks: [0, 3, 6, 8, 11],
      formatY: (v: number) => `${v}`,
      domain: { min: 0, max: 11 },
      unitLabel: 'UV index',
      // The scale's own published bands, not invented advice.
      caption: 'Sun strength: 0-2 low, 3-5 moderate, 6-7 high, 8-10 very high, 11+ extreme. Cover up above 6.',
      markExtremes: true,
    };
  }

  if (metric === 'wind') {
    const points = hours.map((h) => ({ x: hourOf(h.hour), y: h.windKph }));
    const peak = Math.max(5, Math.ceil(Math.max(...points.map((p) => p.y))));
    const step = peak / 4;
    return {
      points,
      color: theme.colors.chartRain,
      ticks: [0, step, step * 2, step * 3, peak],
      formatY: (v: number) => `${Math.round(v)}`,
      domain: { min: 0, max: peak },
      unitLabel: 'Wind (km/h)',
      caption: 'Wind picks up with the afternoon heat. Spray early, when it is calmest.',
      markExtremes: true,
    };
  }

  if (metric === 'humidity') {
    const points = hours.map((h) => ({ x: hourOf(h.hour), y: h.humidityPct }));
    return {
      points,
      color: theme.colors.chartRain,
      ticks: [0, 25, 50, 75, 100],
      formatY: (v: number) => `${v}%`,
      domain: { min: 0, max: 100 },
      unitLabel: 'Humidity (%)',
      caption: 'Highest near dawn, lowest mid-afternoon. Long humid spells raise disease pressure on crops.',
      markExtremes: true,
    };
  }

  if (metric === 'precipitation') {
    const isChance = mode === 0;
    const points = hours.map((h) => ({ x: hourOf(h.hour), y: isChance ? h.rainfallProbabilityPct : h.rainfallMm }));

    if (isChance) {
      return {
        points,
        color: theme.colors.chartRain,
        ticks: [0, 20, 40, 60, 80, 100],
        formatY: (v: number) => `${v}%`,
        domain: { min: 0, max: 100 },
        unitLabel: 'Chance of rain (%)',
        caption: 'How likely rain is in each hour.',
        markExtremes: false,
      };
    }

    // A dry day is genuinely flat at zero, so floor the axis at 1mm rather
    // than letting the curve collapse onto the baseline with no scale.
    const peak = Math.max(1, Math.ceil(Math.max(...points.map((p) => p.y))));
    const step = peak / 4;
    return {
      points,
      color: theme.colors.chartRain,
      ticks: [0, step, step * 2, step * 3, peak],
      formatY: (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1)),
      domain: { min: 0, max: peak },
      unitLabel: 'Rainfall (mm)',
      caption: 'How much rain falls in each hour, in millimetres.',
      markExtremes: false,
    };
  }

  const points = hours.map((h) => ({ x: hourOf(h.hour), y: mode === 0 ? h.tempC : h.feelsLikeC }));
  const values = points.map((p) => p.y);
  // Round the axis outward to whole 3 degree steps so gridlines land on
  // readable numbers rather than wherever the data happens to stop.
  const min = Math.floor((Math.min(...values) - 1) / 3) * 3;
  const max = Math.ceil((Math.max(...values) + 1) / 3) * 3;
  const ticks: number[] = [];
  for (let t = min; t <= max; t += 3) ticks.push(t);

  return {
    points,
    color: theme.colors.chartTemp,
    ticks,
    formatY: (v: number) => `${Math.round(v)}°`,
    domain: { min, max },
    unitLabel: 'Celsius (°C)',
    caption: mode === 0 ? 'The actual air temperature.' : 'How warm it feels once humidity and wind are accounted for.',
    markExtremes: true,
  };
}

/** A section title sitting on the page background, with the card (if any)
 * below it — the reference's structure, and the reason the page reads as a
 * document rather than a stack of boxes. */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text variant="h2">{title}</Text>
      {subtitle ? (
        <Text variant="caption" muted>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function DayDetail({
  day,
  hours,
  week,
  selectedDate,
  onSelectDate,
  tempMode,
  onTempMode,
  metric,
  onMetric,
  chartWidth,
}: {
  day: DailyForecast;
  hours: HourlyForecast[];
  week: WeeklyForecast;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tempMode: number;
  onTempMode: (index: number) => void;
  metric: MetricId;
  onMetric: (id: MetricId) => void;
  chartWidth: number;
}) {
  const theme = useTheme();

  const chart = buildChartConfig(metric, tempMode, theme, hours);
  const current = metricFor(metric);

  // For today the headline is the temperature right now, taken from the
  // hour we're actually in — the same figure the chart plots at that point,
  // so the two can't disagree. A future day has no "now", so it leads with
  // its high.
  const nowHour = new Date().getUTCHours();
  const isToday = day.date === new Date().toISOString().slice(0, 10);
  const headlineTempC = (isToday ? hours.find((h) => hourOf(h.hour) === nowHour)?.tempC : undefined) ?? day.tempMaxC;

  const weekday = new Date(day.date).toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <DayStrip days={week.days} selectedDate={selectedDate} onSelect={onSelectDate} />
      <Text variant="body" muted style={{ textAlign: 'center' }}>
        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </Text>

      <Divider />

      {/* The unit is stated once, below — so the hero and the chart's axis
          both print a bare degree rather than repeating "C" nine times. */}
      {/* High, low and the condition glyph read as one group, the way the
          reference has them — the icon belongs to the numbers, so pushing it
          to the far edge of the screen breaks the reading. The pill takes
          that far edge instead. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs, flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="h1" style={{ fontSize: 38, lineHeight: 44 }}>
              {Math.round(headlineTempC)}°
            </Text>
            <Ionicons name={getConditionIcon(day.condition)} size={32} color={theme.colors.muted} />
          </View>
          {/* One headline figure with the range beneath it, as the reference
              has it — not two large numbers competing side by side. */}
          <Text variant="caption" muted>
            H:{Math.round(day.tempMaxC)}° L:{Math.round(day.tempMinC)}°
          </Text>
        </View>

        <MetricPill metric={metric} onSelect={onMetric} />
      </View>

      {hasVaryingConditions(hours) ? <HourlyConditionStrip hours={hours} chartWidth={chartWidth} /> : null}

      <LineAreaChart
        points={chart.points}
        width={chartWidth}
        height={200}
        color={chart.color}
        yTicks={chart.ticks}
        formatY={chart.formatY}
        xLabels={X_LABELS}
        markExtremes={chart.markExtremes}
        extremeLabels={{ high: 'H', low: 'L' }}
        yDomain={chart.domain}
      />

      {/* Only the measures that genuinely have two readings show a toggle —
          the same pairing the pill's menu names in its subtitle. UV, wind
          and humidity have one, so no control appears rather than a
          single dead segment. */}
      {current.modes.length > 1 ? (
        <SegmentedControl
          segments={[...current.modes]}
          selectedIndex={tempMode}
          onChange={onTempMode}
          accessibilityLabel={`${current.label} reading`}
        />
      ) : null}
      <Text variant="caption" muted>
        {chart.caption}
      </Text>

      <Divider />

      <SectionHeading title="Chance of Rain" subtitle={`${weekday}'s chance: ${day.rainfallProbabilityPct}%`} />
      <LineAreaChart
        points={hours.map((h) => ({ x: hourOf(h.hour), y: h.rainfallProbabilityPct }))}
        width={chartWidth}
        height={180}
        color={theme.colors.chartRain}
        yTicks={[0, 20, 40, 60, 80, 100]}
        formatY={(v) => `${v}%`}
        xLabels={X_LABELS}
        yDomain={{ min: 0, max: 100 }}
      />
      <Text variant="caption" muted>
        The daily chance is higher than any single hour&apos;s, because rain only has to fall once.
      </Text>

      <SectionHeading title="Rain Total" />
      <Card>
        <DetailRow label="Rain" value={`${day.rainfallMm} mm`} dotColor={theme.colors.chartRain} valueColor={theme.colors.chartRain} />
      </Card>

      {/* Not in the reference, but wind drives spray decisions and humidity
          drives disease pressure — both are farm decisions this page exists
          to support, and neither appears anywhere else on it. */}
      <SectionHeading title="Wind & Humidity" />
      <Card style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <StatTile icon="navigate-outline" label="Wind" value={formatWind(day.windKph)} />
        <StatTile icon="water-outline" label="Humidity" value={`${day.humidityPct}%`} />
      </Card>

      <SectionHeading title="Daily Summary" />
      <Card>
        <Text variant="body" muted>
          {buildDailySummary(day, hours)}
        </Text>
      </Card>

      <SectionHeading title="What This Means For Your Farm" />
      <Card raised style={{ gap: theme.spacing.sm }}>
        <Text variant="body" muted>
          {day.farmerInterpretation}
        </Text>
        <BulletList items={week.farmerActionCard.actions} accent />
      </Card>

      <MockDataTag />
    </View>
  );
}
