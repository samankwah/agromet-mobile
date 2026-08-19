import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CalendarActivity, ProductionCycle } from '../../../../shared/domain/calendar';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { getActivityIcon } from '../../../../shared/utils/classifyActivity';
import { activitiesInWeek, formatWeekRange } from '../gridGeometry';

type Props = {
  cycle: ProductionCycle;
  activities: CalendarActivity[];
  totalWeeks: number;
  onSetStatus: (status: ProductionCycle['status']) => void;
  isUpdating: boolean;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Where a running batch has got to, and what it needs this week.
 *
 * Every number here is the server's — `currentWeek`, `progressPercent` and
 * `expectedEndDate` are read, never recalculated, so the phone and the
 * dashboard can never disagree about which week a batch is in.
 *
 * "This week" is the part that earns the feature: a calendar tells a farmer
 * what happens in week 7, but only a running cycle knows that today *is*
 * week 7.
 */
export function CycleProgressCard({ cycle, activities, totalWeeks, onSetStatus, isUpdating }: Props) {
  const theme = useTheme();

  const percent = Math.max(0, Math.min(100, cycle.progressPercent));
  const dueNow = activitiesInWeek(activities, cycle.currentWeek, totalWeeks);
  const isComplete = cycle.status === 'completed' || cycle.currentWeek >= cycle.totalDurationWeeks;

  return (
    <Card raised style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3">{cycle.batchName}</Text>
          <Text variant="caption" muted>
            Started {formatDate(cycle.startDate)}
            {cycle.initialQuantity > 0 ? ` · ${cycle.initialQuantity} birds` : ''}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: cycle.status === 'active' ? theme.colors.accent : theme.colors.border,
          }}
        >
          <Text variant="caption" color={cycle.status === 'active' ? theme.colors.onAccent : theme.colors.text}>
            {cycle.status === 'active' ? 'Active' : cycle.status === 'paused' ? 'Paused' : 'Done'}
          </Text>
        </View>
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text variant="bodyStrong">
            Week {cycle.currentWeek} of {cycle.totalDurationWeeks}
          </Text>
          <Text variant="caption" muted>
            {Math.round(percent)}%
          </Text>
        </View>

        {/* The bar restates the week numbers already printed above it — it
            is never the only place the progress is stated. */}
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Week ${cycle.currentWeek} of ${cycle.totalDurationWeeks}, ${Math.round(percent)} percent through the cycle.`}
          style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' }}
        >
          <View style={{ width: `${percent}%`, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent }} />
        </View>

        <Text variant="caption" muted>
          {isComplete ? 'Cycle complete' : `Expected to finish ${formatDate(cycle.expectedEndDate)}`}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="bodyStrong">This week</Text>
        {dueNow.length === 0 ? (
          <Text variant="body" muted>
            Nothing scheduled for week {cycle.currentWeek} — keep up routine monitoring.
          </Text>
        ) : (
          dueNow.map((activity) => (
            <View key={activity.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name={getActivityIcon(activity.activityName)} size={16} color={theme.colors.accent} />
              <Text variant="body" style={{ flex: 1 }}>
                {activity.activityName}
              </Text>
              <Text variant="caption" muted>
                {formatWeekRange(activity.startWeek, activity.endWeek ?? activity.startWeek)}
              </Text>
            </View>
          ))
        )}
      </View>
      {/* A batch that cannot be stopped is a batch that stays "active"
          forever and keeps claiming a week it is no longer in. */}
      {cycle.status !== 'completed' ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              label={cycle.status === 'active' ? 'Pause' : 'Resume'}
              variant="outline"
              loading={isUpdating}
              onPress={() => onSetStatus(cycle.status === 'active' ? 'paused' : 'active')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Finish" variant="outline" loading={isUpdating} onPress={() => onSetStatus('completed')} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
