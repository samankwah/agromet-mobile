import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { CalendarActivity } from '../../../../shared/domain/calendar';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';
import { fallbackActivityColor, fitSwatchToScheme, readableInkOn } from '../../../../shared/utils/activityColor';
import {
  activityAccessibilityLabel,
  activityRuns,
  computeColumnWidth,
  computeNameColumnWidth,
  formatWeekRangeShort,
  type ActivityRun,
  type GridDensity,
  type WeekBand,
} from '../gridGeometry';

type Props = {
  totalWeeks: number;
  activities: CalendarActivity[];
  /** Merged header segments — months when the calendar is anchored to real
   * dates, week blocks otherwise. */
  bands: WeekBand[];
  /** Week 1's real date, used only to speak dates in the row labels. */
  weekOneDate?: Date | null;
  /** Server-computed cycle position. Draws the "you are here" marker. */
  currentWeek?: number | null;
  selectedActivityId?: string | null;
  onSelectActivity?: (activity: CalendarActivity) => void;
  density?: GridDensity;
};

/**
 * The production calendar as a frozen-column timeline.
 *
 * Two structural decisions carry this component:
 *
 * 1. **Only one axis scrolls here.** The activity-name column is a plain
 *    View laid out beside the body, so the names cannot drift out of line
 *    with their bars — there is no second scroller to synchronise, and the
 *    page's own scroller handles the vertical axis. The header mirrors the
 *    horizontal offset through a native-driven transform rather than a JS
 *    scroll handler, so a fling costs no JS-thread work.
 *
 * 2. **One View per run, not per week.** An activity occupies a contiguous
 *    span, so it is drawn as a single positioned bar. The alternative —
 *    a cell per week — is 12 x 36 = 432 Views for the same picture.
 */
export function CalendarGrid({
  totalWeeks,
  activities,
  bands,
  weekOneDate = null,
  currentWeek = null,
  selectedActivityId = null,
  onSelectActivity,
  density = 'fit',
}: Props) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;

  const layout = useMemo(() => {
    const nameWidth = computeNameColumnWidth(screenWidth);
    const available = Math.max(140, screenWidth - nameWidth - theme.spacing.lg * 2);
    const columnWidth = computeColumnWidth(available, totalWeeks, density);
    const caption = theme.typeScale.caption;

    return {
      nameWidth,
      columnWidth,
      bodyWidth: columnWidth * totalWeeks,
      viewportWidth: available,
      // Two lines of activity name. Must fit the name column's content
      // exactly, or the names stop lining up with their bars.
      rowHeight: Math.max(theme.minTouchTarget, caption.lineHeight * 2 + 12),
      bandHeight: caption.lineHeight + 8,
      // Week numbers need ~18px to avoid colliding; below that the month
      // band alone carries the axis.
      showWeekNumbers: columnWidth >= 20,
    };
  }, [density, screenWidth, theme.minTouchTarget, theme.spacing.lg, theme.typeScale.caption, totalWeeks]);

  const { nameWidth, columnWidth, bodyWidth, viewportWidth, rowHeight, bandHeight, showWeekNumbers } = layout;
  const weekRowHeight = showWeekNumbers ? theme.typeScale.caption.lineHeight + 6 : 0;

  const rows = useMemo(
    () =>
      activities.map((activity, index) => {
        const runs = activityRuns(activity, totalWeeks);
        return {
          activity,
          runs,
          isAlternate: index % 2 === 1,
          accessibilityLabel: activityAccessibilityLabel(activity, runs, totalWeeks, weekOneDate),
        };
      }),
    [activities, totalWeeks, weekOneDate],
  );

  const weeks = useMemo(() => Array.from({ length: totalWeeks }, (_, index) => index + 1), [totalWeeks]);
  const isScrollable = bodyWidth > viewportWidth;

  return (
    <View>
      {/* Header. Sits outside the vertical scroller so it stays put while
          the rows move, and mirrors the body's horizontal offset. */}
      <View style={{ flexDirection: 'row' }}>
        <View
          style={{
            width: nameWidth,
            height: bandHeight + weekRowHeight,
            justifyContent: 'flex-end',
            paddingBottom: 4,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="caption" muted numberOfLines={1}>
            Activity
          </Text>
        </View>

        <View style={{ width: viewportWidth, overflow: 'hidden', borderBottomWidth: 1, borderColor: theme.colors.border }}>
          <Animated.View style={{ width: bodyWidth, transform: [{ translateX: Animated.multiply(scrollX, -1) }] }}>
            <View style={{ flexDirection: 'row', height: bandHeight }}>
              {bands.map((band) => (
                <View
                  key={band.key}
                  style={{
                    width: (band.endWeek - band.startWeek + 1) * columnWidth,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeftWidth: band.startWeek === 1 ? 0 : StyleSheet.hairlineWidth,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {band.label}
                  </Text>
                </View>
              ))}
            </View>

            {showWeekNumbers ? (
              <View style={{ flexDirection: 'row', height: weekRowHeight }}>
                {weeks.map((week) => (
                  <View key={week} style={{ width: columnWidth, alignItems: 'center' }}>
                    <Text variant="caption" color={week === currentWeek ? theme.colors.accent : theme.colors.muted} numberOfLines={1}>
                      {week}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>
        </View>
      </View>

      {/* No vertical scroller here — the rows are laid out at full height
          and the page scrolls them. Nesting a second vertical scroller
          inside the screen's own is the reliable way to get stuck scrolls
          on Android, and a dozen activities fit comfortably anyway. */}
      <View>
        <View style={{ flexDirection: 'row' }}>
          {/* The frozen column. A plain View, not a scroller — which is
              precisely why it cannot fall out of step with the rows. */}
          <View style={{ width: nameWidth, borderRightWidth: 1, borderColor: theme.colors.border }}>
            {rows.map((row) => (
              <ActivityNameCell
                key={row.activity.id}
                name={row.activity.activityName}
                accessibilityLabel={row.accessibilityLabel}
                height={rowHeight}
                isAlternate={row.isAlternate}
                isSelected={row.activity.id === selectedActivityId}
                onPress={onSelectActivity ? () => onSelectActivity(row.activity) : undefined}
              />
            ))}
          </View>

          <Animated.ScrollView
            horizontal
            scrollEnabled={isScrollable}
            showsHorizontalScrollIndicator={isScrollable}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            style={{ width: viewportWidth }}
          >
            <View style={{ width: bodyWidth }}>
              {/* One gridline layer behind every row, rather than per row. */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {weeks.slice(0, -1).map((week) => (
                  <View
                    key={week}
                    style={{
                      position: 'absolute',
                      left: week * columnWidth,
                      top: 0,
                      bottom: 0,
                      width: StyleSheet.hairlineWidth,
                      backgroundColor: theme.colors.border,
                    }}
                  />
                ))}
                {currentWeek ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: (currentWeek - 1) * columnWidth,
                      top: 0,
                      bottom: 0,
                      width: Math.max(2, columnWidth),
                      backgroundColor: theme.colors.accent,
                      opacity: 0.18,
                    }}
                  />
                ) : null}
              </View>

              {rows.map((row) => (
                <ActivityBarRow
                  key={row.activity.id}
                  name={row.activity.activityName}
                  runs={row.runs}
                  height={rowHeight}
                  columnWidth={columnWidth}
                  isAlternate={row.isAlternate}
                  isSelected={row.activity.id === selectedActivityId}
                  onPress={onSelectActivity ? () => onSelectActivity(row.activity) : undefined}
                />
              ))}
            </View>
          </Animated.ScrollView>
        </View>
      </View>
    </View>
  );
}

type NameCellProps = {
  name: string;
  accessibilityLabel: string;
  height: number;
  isAlternate: boolean;
  isSelected: boolean;
  onPress?: () => void;
};

/**
 * The accessible half of a row.
 *
 * Names like "earthening-up/staking/trellising/pruning" cannot fit this
 * column at a legible size, so they wrap to two lines and truncate; the
 * full string, and the weeks it covers, are in the spoken label and in the
 * detail sheet this opens.
 */
const ActivityNameCell = React.memo(function ActivityNameCell({
  name,
  accessibilityLabel,
  height,
  isAlternate,
  isSelected,
  onPress,
}: NameCellProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? 'Opens this activity' : undefined}
      accessibilityState={{ selected: isSelected }}
    >
      {({ pressed }) => (
        // The fixed height lives on a nested View, not on the Pressable. A
        // function `style` on Pressable is dropped here, and a name cell
        // that grows to fit its text puts every row below it out of line
        // with its bar.
        <View
          style={{
            height,
            justifyContent: 'center',
            paddingRight: theme.spacing.sm,
            overflow: 'hidden',
            backgroundColor: isSelected
              ? theme.colors.accent
              : pressed
                ? theme.colors.surfaceStrong
                : isAlternate
                  ? theme.colors.surface
                  : 'transparent',
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="caption" color={isSelected ? theme.colors.onAccent : theme.colors.text} numberOfLines={2} ellipsizeMode="tail">
            {name}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

type BarRowProps = {
  name: string;
  runs: ActivityRun[];
  height: number;
  columnWidth: number;
  isAlternate: boolean;
  isSelected: boolean;
  onPress?: () => void;
};

/**
 * Hidden from the accessibility tree on purpose. A screen reader should
 * hear each row once, from its name cell — not swipe through a wall of
 * unlabelled coloured rectangles.
 */
const ActivityBarRow = React.memo(function ActivityBarRow({
  name,
  runs,
  height,
  columnWidth,
  isAlternate,
  isSelected,
  onPress,
}: BarRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        height,
        backgroundColor: isSelected ? theme.colors.accent + '22' : isAlternate ? theme.colors.surface : 'transparent',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
      }}
    >
      {runs.map((run) => {
        const fill = fitSwatchToScheme(run.color, theme.scheme, fallbackActivityColor(name, theme.colors.accent));
        const width = (run.endWeek - run.startWeek + 1) * columnWidth;

        return (
          <View
            key={run.key}
            style={{
              position: 'absolute',
              left: (run.startWeek - 1) * columnWidth,
              width,
              top: 6,
              bottom: 6,
              backgroundColor: fill,
              // A hairline outline, because a pale spreadsheet fill would
              // otherwise be an invisible bar on a pale surface.
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
              borderRadius: 3,
              // Left-aligned, not centred: a 20-week bar is far wider than
              // the viewport, and a centred label would sit off-screen
              // exactly when the bar is most prominent.
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingHorizontal: 4,
              overflow: 'hidden',
            }}
          >
            {width >= 46 ? (
              <Text variant="caption" color={readableInkOn(fill, '#1a2430', '#ffffff')} numberOfLines={1}>
                {formatWeekRangeShort(run.startWeek, run.endWeek)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
});
