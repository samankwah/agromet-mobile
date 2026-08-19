import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { CalendarActivity } from '../../../../shared/domain/calendar';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';
import { fallbackActivityColor, fitSwatchToScheme, readableInkOn } from '../../../../shared/utils/activityColor';
import {
  activityAccessibilityLabel,
  activityRuns,
  computeNameColumnWidth,
  formatWeekRangeShort,
  weekDateRange,
  WEEK_COLUMN_WIDTH,
  type ActivityRun,
  type WeekBand,
} from '../gridGeometry';

type Props = {
  totalWeeks: number;
  activities: CalendarActivity[];
  /** Merged header segments — months when the calendar is anchored to real
   * dates, week blocks otherwise. */
  bands: WeekBand[];
  /** Week 1's real date, used for the day-range header and the row labels. */
  weekOneDate?: Date | null;
  /** Server-computed cycle position. Marks the current week, and is where
   * the grid opens scrolled to. */
  currentWeek?: number | null;
  selectedActivityId?: string | null;
  onSelectActivity?: (activity: CalendarActivity) => void;
};

/**
 * The production calendar as a frozen-column timeline, matching the printed
 * layout: a merged month band, week numbers, the day range under each week,
 * and one coloured bar per activity.
 *
 * Three decisions carry this component.
 *
 * **It scrolls rather than shrinks.** A season runs 28-37 weeks and a phone
 * leaves about 210px beside the frozen column. Fitting every week on screen
 * gives each one 6px, which draws a single-week activity as a dot and
 * leaves no bar wide enough for a label. The printed calendar solves this
 * by being wider than a page; this one solves it by scrolling.
 *
 * **Only one axis scrolls here.** The name column is a plain View beside
 * the body, so names cannot drift out of line with their bars, and the
 * page's own scroller handles the vertical axis. The header mirrors the
 * horizontal offset through a native-driven transform rather than a JS
 * scroll handler, so a fling costs no JS-thread work.
 *
 * **One View per run, not per week.** An activity occupies a contiguous
 * span, so it is one positioned bar — 14 Views for a calendar that would
 * otherwise cost 12 x 37 cells.
 */
export function CalendarGrid({
  totalWeeks,
  activities,
  bands,
  weekOneDate = null,
  currentWeek = null,
  selectedActivityId = null,
  onSelectActivity,
}: Props) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;

  const nameWidth = computeNameColumnWidth(screenWidth);
  const viewportWidth = Math.max(140, screenWidth - nameWidth - theme.spacing.lg * 2);
  const columnWidth = WEEK_COLUMN_WIDTH;
  const bodyWidth = columnWidth * totalWeeks;

  const caption = theme.typeScale.caption;
  const rowHeight = Math.max(theme.minTouchTarget, caption.lineHeight * 2 + 12);
  const bandHeight = caption.lineHeight + 8;
  const weekRowHeight = caption.lineHeight + 4;
  // A day range only exists once the calendar is anchored to a real date.
  const showDates = weekOneDate !== null;
  const dateRowHeight = showDates ? caption.lineHeight + 4 : 0;
  const headerHeight = bandHeight + weekRowHeight + dateRowHeight;

  const rows = useMemo(() => {
    // Names repeat — the published maize calendar has two separate
    // "Harvesting" rows. Only the repeated ones carry their weeks as a
    // qualifier, so unique names stay uncluttered.
    const occurrences = new Map<string, number>();
    for (const entry of activities) occurrences.set(entry.activityName, (occurrences.get(entry.activityName) ?? 0) + 1);

    return activities.map((activity, index) => {
      const runs = activityRuns(activity, totalWeeks);
      const span = runs.length ? formatWeekRangeShort(runs[0].startWeek, runs[runs.length - 1].endWeek) : null;
      const isRepeated = (occurrences.get(activity.activityName) ?? 0) > 1;

      return {
        activity,
        runs,
        isAlternate: index % 2 === 1,
        qualifier: isRepeated ? span : null,
        accessibilityLabel: activityAccessibilityLabel(activity, runs, totalWeeks, weekOneDate),
      };
    });
  }, [activities, totalWeeks, weekOneDate]);

  const weeks = useMemo(() => Array.from({ length: totalWeeks }, (_, index) => index + 1), [totalWeeks]);

  // Open where the farmer is rather than at week 1 — a batch in week 22 of
  // 34 should not have to be scrolled to.
  const initialOffset = currentWeek ? Math.max(0, (currentWeek - 2) * columnWidth) : 0;

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View
          style={{
            width: nameWidth,
            height: headerHeight,
            justifyContent: 'flex-end',
            paddingBottom: 4,
            paddingHorizontal: theme.spacing.sm,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="caption" muted numberOfLines={1}>
            Stage of activity
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
                  <Text variant="caption" muted numberOfLines={1}>
                    {band.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', height: weekRowHeight }}>
              {weeks.map((week) => (
                <View key={week} style={{ width: columnWidth, alignItems: 'center' }}>
                  <Text variant="caption" color={week === currentWeek ? theme.colors.accent : theme.colors.muted} numberOfLines={1}>
                    {week}
                  </Text>
                </View>
              ))}
            </View>

            {showDates ? (
              <View style={{ flexDirection: 'row', height: dateRowHeight }}>
                {weeks.map((week) => (
                  <View key={week} style={{ width: columnWidth, alignItems: 'center' }}>
                    <Text variant="caption" muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {weekDateRange(weekOneDate, week)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>
        </View>
      </View>

      {/* No vertical scroller here — the rows lay out at full height and the
          page scrolls them. A second vertical scroller nested inside the
          screen's own is a reliable way to get stuck scrolls on Android. */}
      <View style={{ flexDirection: 'row' }}>
        {/* The frozen column. A plain View, not a scroller — which is
            precisely why it cannot fall out of step with the rows. */}
        <View style={{ width: nameWidth, borderRightWidth: 1, borderColor: theme.colors.border }}>
          {rows.map((row) => (
            <ActivityNameCell
              key={row.activity.id}
              name={row.activity.activityName}
              qualifier={row.qualifier}
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
          showsHorizontalScrollIndicator
          bounces={false}
          contentOffset={{ x: initialOffset, y: 0 }}
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
                    width: columnWidth,
                    backgroundColor: theme.colors.accent,
                    opacity: 0.16,
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
  );
}

type NameCellProps = {
  name: string;
  /** Set only where the name repeats within this calendar. */
  qualifier: string | null;
  accessibilityLabel: string;
  height: number;
  isAlternate: boolean;
  isSelected: boolean;
  onPress?: () => void;
};

/**
 * The accessible half of a row. Long names truncate to two lines here; the
 * full string, and the weeks it covers, live in the spoken label and in the
 * detail sheet this opens.
 */
const ActivityNameCell = React.memo(function ActivityNameCell({
  name,
  qualifier,
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
            paddingHorizontal: theme.spacing.sm,
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
          {qualifier ? (
            <Text variant="caption" color={isSelected ? theme.colors.onAccent : theme.colors.muted} numberOfLines={1}>
              {qualifier}
            </Text>
          ) : null}
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
 * Hidden from the accessibility tree on purpose: a screen reader should
 * hear each row once, from its name cell, rather than swipe through a wall
 * of unlabelled coloured rectangles.
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
        const span = run.endWeek - run.startWeek + 1;

        return (
          <View
            key={run.key}
            style={{
              position: 'absolute',
              left: (run.startWeek - 1) * columnWidth,
              width: span * columnWidth,
              top: 7,
              bottom: 7,
              backgroundColor: fill,
              // A hairline outline, because a pale spreadsheet fill would
              // otherwise be an invisible bar on a pale surface.
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
              borderRadius: 3,
              // Left-aligned, not centred: a 14-week bar is wider than the
              // viewport, and a centred label would sit off-screen exactly
              // when the bar is most prominent.
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingHorizontal: 6,
              overflow: 'hidden',
            }}
          >
            {/* Only where the bar can genuinely hold it. A label that
                appears on some rows and not others reads as arbitrary. */}
            {span >= 3 ? (
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
