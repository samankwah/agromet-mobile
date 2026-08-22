import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import type { ReminderGroups, WeekProgress } from '../../../../shared/utils/reminderSchedule';

type Props = {
  groups: ReminderGroups;
  progress: WeekProgress;
};

/**
 * The answer to "am I on top of things?", above the list that answers "what
 * exactly?".
 *
 * Leads with a sentence, not a dashboard. A farmer glancing at their phone
 * between rows of maize should get the verdict in one read; the counts and the
 * bar are there for the second read, not the first.
 *
 * The bar restates numbers already printed beside it, following the rule
 * CycleProgressCard sets — it is never the only place the progress is stated,
 * because a bar alone is unreadable to a screen reader and ambiguous to
 * everyone else.
 */
export function ReminderSummary({ groups, progress }: Props) {
  const theme = useTheme();

  const overdue = groups.overdue.length;
  const today = groups.today.length;

  const headline =
    overdue > 0
      ? `${overdue} ${overdue === 1 ? 'reminder is' : 'reminders are'} overdue`
      : today > 0
        ? `${today} ${today === 1 ? 'reminder' : 'reminders'} due today`
        : 'Nothing due today';

  const tone = overdue > 0 ? theme.colors.danger : today > 0 ? theme.colors.accent : theme.colors.muted;

  const detail =
    overdue > 0 && today > 0
      ? `and ${today} due today`
      : groups.thisWeek.length > 0
        ? `${groups.thisWeek.length} more this week`
        : groups.later.length > 0
          ? `${groups.later.length} scheduled for later`
          : 'You are all caught up';

  return (
    <Card raised style={{ gap: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: tone }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
        <Ionicons
          name={overdue > 0 ? 'alert-circle' : today > 0 ? 'today-outline' : 'checkmark-circle-outline'}
          size={22}
          color={tone}
          style={{ marginTop: 2 }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h3" color={overdue > 0 ? theme.colors.danger : undefined}>
            {headline}
          </Text>
          <Text variant="caption" muted>
            {detail}
          </Text>
        </View>
      </View>

      {/* Only meaningful once there is a week's worth of work to measure. */}
      {progress.total > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text variant="caption" muted>
              Done this week
            </Text>
            <Text variant="caption">
              {progress.completed} of {progress.total}
            </Text>
          </View>

          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${progress.completed} of ${progress.total} reminders done this week.`}
            style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' }}
          >
            <View
              style={{
                width: `${Math.round(progress.percent)}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.colors.accent,
              }}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
