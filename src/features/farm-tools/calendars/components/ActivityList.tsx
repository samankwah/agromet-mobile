import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CalendarActivity } from '../../../../shared/domain/calendar';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { fallbackActivityColor, fitSwatchToScheme } from '../../../../shared/utils/activityColor';
import { getActivityIcon } from '../../../../shared/utils/classifyActivity';
import { activityAccessibilityLabel, activityRuns, formatActivityDates, formatWeekRange } from '../gridGeometry';

type Props = {
  activities: CalendarActivity[];
  totalWeeks: number;
  weekOneDate: Date | null;
  currentWeek: number | null;
  onSelect: (activity: CalendarActivity) => void;
};

/**
 * The calendar as an ordered list rather than a grid.
 *
 * Not a fallback — a two-dimensional grid is a poor experience with a
 * screen reader no matter how carefully it is labelled, and it is cramped
 * on a small screen. This reads the same data in start-week order, with
 * every fact in text, and is the better view for "what happens next".
 */
export function ActivityList({ activities, totalWeeks, weekOneDate, currentWeek, onSelect }: Props) {
  const theme = useTheme();

  const rows = activities
    .map((activity) => ({ activity, runs: activityRuns(activity, totalWeeks) }))
    .filter((row) => row.runs.length > 0)
    .sort((a, b) => a.runs[0].startWeek - b.runs[0].startWeek || a.activity.activityName.localeCompare(b.activity.activityName));

  if (rows.length === 0) {
    return (
      <Card>
        <Text variant="body" muted>
          This calendar has no scheduled activities.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ paddingVertical: theme.spacing.sm }}>
      {rows.map(({ activity, runs }, index) => {
        const span = { start: runs[0].startWeek, end: runs[runs.length - 1].endWeek };
        const isNow = currentWeek !== null && currentWeek >= span.start && currentWeek <= span.end;
        const swatch = fitSwatchToScheme(runs[0].color, theme.scheme, fallbackActivityColor(activity.activityName, theme.colors.accent));
        const dates = formatActivityDates(runs, weekOneDate);

        return (
          <Pressable
            key={activity.id}
            onPress={() => onSelect(activity)}
            accessibilityRole="button"
            accessibilityLabel={activityAccessibilityLabel(activity, runs, totalWeeks, weekOneDate)}
            accessibilityHint="Opens this activity"
            // A plain object, not a function: a function `style` on
            // Pressable is dropped on Android here, taking the layout with
            // it. Press feedback comes from the row opening a sheet.
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              minHeight: theme.minTouchTarget,
              paddingVertical: theme.spacing.sm,
              borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
            }}
          >
            {/* Colour and icon together, never colour alone. */}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.radii.sm,
                backgroundColor: swatch,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={getActivityIcon(activity.activityName)} size={16} color={theme.colors.onAccent} />
            </View>

            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {activity.activityName}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {formatWeekRange(span.start, span.end)}
                {dates ? ` · ${dates}` : ''}
              </Text>
            </View>

            {isNow ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: theme.colors.accent,
                }}
              >
                <Text variant="caption" color={theme.colors.onAccent}>
                  Now
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </Card>
  );
}
