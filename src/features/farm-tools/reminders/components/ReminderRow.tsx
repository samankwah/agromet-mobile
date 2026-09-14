import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { REPEAT_LABELS, SOURCE_LABELS, type FarmReminder } from '../../../../shared/domain/farmReminder';
import { useTheme, type Theme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { formatDateTime } from '../../../../shared/utils/dates';
import { formatRelativeTime } from '../../../../shared/utils/formatRelativeTime';
import { dueState, type DueState } from '../../../../shared/utils/reminderSchedule';

type Props = {
  reminder: FarmReminder;
  onToggleDone: (id: string) => void;
  onEdit: (reminder: FarmReminder) => void;
  /** Highlighted because the farmer arrived here by tapping its notification. */
  focused?: boolean;
};

/** The colour that carries a row's urgency, on the accent bar and the due text. */
function toneFor(state: DueState, theme: Theme): string {
  if (state === 'overdue') return theme.colors.danger;
  if (state === 'today') return theme.colors.accent;
  if (state === 'done') return theme.colors.border;
  return theme.colors.teal;
}

/** A small pill, matching CycleProgressCard's status chip. */
function Chip({ icon, label, color }: { icon?: keyof typeof Ionicons.glyphMap; label: string; color?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: (color ?? theme.colors.muted) + '1a',
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={color ?? theme.colors.muted} /> : null}
      <Text variant="caption" color={color ?? theme.colors.muted}>
        {label}
      </Text>
    </View>
  );
}

/**
 * One reminder.
 *
 * A card with a coloured left edge rather than a bare row of text, matching
 * the alert banner on Home — that edge is what lets a farmer find the late
 * work by colour before reading a single word, which is the whole job of this
 * list. Colour is never the only signal: the same urgency is written out as
 * "2 days ago" beside it.
 *
 * The checkbox is its own pressable with a generous hit slop, so completing
 * something is one deliberate tap and never opens the edit sheet by accident.
 */
export function ReminderRow({ reminder, onToggleDone, onEdit, focused }: Props) {
  const theme = useTheme();
  const state = dueState(reminder, new Date());
  const tone = toneFor(state, theme);

  return (
    <Card
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeftWidth: 4,
        borderLeftColor: tone,
        opacity: reminder.isDone ? 0.72 : 1,
        // A notification tap lands here; the tint says which one it meant.
        backgroundColor: focused ? theme.colors.accent + '14' : theme.colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Pressable
          onPress={() => onToggleDone(reminder.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: reminder.isDone }}
          accessibilityLabel={`${reminder.isDone ? 'Mark not done' : 'Mark done'}: ${reminder.title}`}
          hitSlop={8}
          style={{
            minWidth: theme.minTouchTarget,
            minHeight: theme.minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: theme.spacing.sm,
          }}
        >
          {({ pressed }) => (
            <Ionicons
              name={reminder.isDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={reminder.isDone ? theme.colors.accent : theme.colors.muted}
              style={{ opacity: pressed ? 0.5 : 1 }}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => onEdit(reminder)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${reminder.title}, due ${formatDateTime(new Date(reminder.dueAt))}`}
          style={{ flex: 1 }}
        >
          {({ pressed }) => (
            <View
              style={{
                gap: theme.spacing.xs,
                opacity: pressed ? 0.7 : 1,
                paddingRight: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
              }}
            >
              <Text
                variant="bodyStrong"
                muted={reminder.isDone}
                style={reminder.isDone ? { textDecorationLine: 'line-through' } : undefined}
                numberOfLines={2}
              >
                {reminder.title}
              </Text>

              {reminder.note ? (
                <Text variant="caption" muted numberOfLines={2}>
                  {reminder.note}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                <Chip
                  icon={state === 'overdue' ? 'alert-circle-outline' : 'time-outline'}
                  label={
                    reminder.isDone
                      ? formatDateTime(new Date(reminder.dueAt))
                      : formatRelativeTime(reminder.dueAt)
                  }
                  color={reminder.isDone ? theme.colors.muted : tone}
                />

                {reminder.repeat !== 'none' ? <Chip icon="repeat" label={REPEAT_LABELS[reminder.repeat]} /> : null}

                {reminder.source !== 'manual' ? (
                  <Chip
                    icon={reminder.source === 'calendar-activity' ? 'calendar-outline' : 'thunderstorm-outline'}
                    label={SOURCE_LABELS[reminder.source]}
                    color={theme.colors.teal}
                  />
                ) : null}

                {/* A reminder with nothing scheduled behind it will not speak
                    up. Saying so on the row itself is more honest than one
                    banner at the top that the farmer scrolled past. */}
                {!reminder.isDone && !reminder.notificationId ? (
                  <Chip icon="notifications-off-outline" label="No alert" color={theme.colors.warning} />
                ) : null}
              </View>
            </View>
          )}
        </Pressable>

        <View style={{ paddingTop: theme.spacing.md + 2, paddingRight: theme.spacing.md }}>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
        </View>
      </View>
    </Card>
  );
}
