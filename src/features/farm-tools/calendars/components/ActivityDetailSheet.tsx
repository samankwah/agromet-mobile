import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CalendarActivity } from '../../../../shared/domain/calendar';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { DetailRow } from '../../../../shared/ui/DetailRow';
import { Text } from '../../../../shared/ui/Text';
import { fallbackActivityColor, fitSwatchToScheme } from '../../../../shared/utils/activityColor';
import { getActivityIcon } from '../../../../shared/utils/classifyActivity';
import { activityRuns, formatActivityDates, formatWeekRange } from '../gridGeometry';

type Props = {
  activity: CalendarActivity | null;
  totalWeeks: number;
  weekOneDate: Date | null;
  currentWeek: number | null;
  onClose: () => void;
};

/**
 * The untruncated view of one activity.
 *
 * The grid's name column has room for about two short lines, so anything
 * longer than "post-harvest handling" is ellipsised there. This is where
 * the full name lives, along with the facts the coloured bar can only
 * imply — the exact weeks, the real dates when the calendar is anchored,
 * and whether it is happening now.
 */
export function ActivityDetailSheet({ activity, totalWeeks, weekOneDate, currentWeek, onClose }: Props) {
  const theme = useTheme();

  if (!activity) return null;

  const runs = activityRuns(activity, totalWeeks);
  const span = runs.length ? { start: runs[0].startWeek, end: runs[runs.length - 1].endWeek } : null;
  const dates = formatActivityDates(runs, weekOneDate);
  const swatch = fitSwatchToScheme(runs[0]?.color, theme.scheme, fallbackActivityColor(activity.activityName, theme.colors.accent));
  const isNow = span && currentWeek !== null && currentWeek >= span.start && currentWeek <= span.end;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close activity details"
      >
        {/* Stops a tap inside the sheet from closing it. */}
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radii.lg,
            borderTopRightRadius: theme.radii.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radii.sm,
                backgroundColor: swatch,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name={getActivityIcon(activity.activityName)} size={20} color={theme.colors.onAccent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="h3">{activity.activityName}</Text>
              {isNow ? (
                <Text variant="caption" color={theme.colors.accent}>
                  Happening this week
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            {span ? <DetailRow label="When" value={formatWeekRange(span.start, span.end)} /> : null}
            {dates ? <DetailRow label="Dates" value={dates} /> : null}
            {span ? <DetailRow label="Duration" value={`${span.end - span.start + 1} week${span.end === span.start ? '' : 's'}`} /> : null}
          </View>

          {/* Stated plainly rather than hidden: the calendar carries timing,
              not agronomy, and pretending otherwise would invent advice. */}
          {!dates ? (
            <Text variant="caption" muted>
              Week numbers are counted from the start of the cycle. Start a cycle to see these as real dates.
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
