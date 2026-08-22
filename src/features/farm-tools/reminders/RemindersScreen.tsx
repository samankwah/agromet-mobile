import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FarmReminder, ReminderDraft } from '../../../shared/domain/farmReminder';
import { useReminderStore } from '../../../shared/state/reminderStore';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Screen } from '../../../shared/ui/Screen';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Skeleton, SkeletonScreen } from '../../../shared/ui/Skeleton';
import { Text } from '../../../shared/ui/Text';
import { NotificationNotice, type ReminderBlocker } from './components/NotificationNotice';
import { ReminderForm, seedFromReminder, type ReminderFormSeed } from './components/ReminderForm';
import { ReminderRow } from './components/ReminderRow';
import { ReminderSummary } from './components/ReminderSummary';
import { useReminders } from './useReminders';

type Props = {
  /** Set when the farmer arrived by tapping a notification. */
  focusId?: string;
};

/**
 * Everything the farmer has asked to be reminded about.
 *
 * Grouped by urgency rather than listed flat: "what is late, and what is
 * today" is the only question this screen has to answer quickly, and one
 * chronological list buries that under next month's work.
 *
 * The screen owns its own ScrollView instead of using `Screen`'s, so the add
 * button can float above the content. A full-width button in the flow pushed
 * the first reminder below the fold on a small phone and then scrolled away
 * exactly when a farmer at the bottom of a long list wanted it.
 */
export function RemindersScreen({ focusId }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { groups, progress, hasHydrated, blocker } = useReminders();

  const add = useReminderStore((state) => state.add);
  const update = useReminderStore((state) => state.update);
  const toggleDone = useReminderStore((state) => state.toggleDone);
  const remove = useReminderStore((state) => state.remove);
  const requestPermission = useReminderStore((state) => state.requestPermission);
  const setNotificationPrefs = useSettingsStore((state) => state.setNotificationPrefs);

  const [tab, setTab] = useState(0); // 0 = Upcoming, 1 = Done
  const [formOpen, setFormOpen] = useState(false);
  const [seed, setSeed] = useState<ReminderFormSeed | undefined>(undefined);

  const sections = useMemo(
    () => [
      { title: 'Overdue', tone: theme.colors.danger, items: groups.overdue },
      { title: 'Today', tone: theme.colors.accent, items: groups.today },
      { title: 'This week', tone: theme.colors.text, items: groups.thisWeek },
      { title: 'Later', tone: theme.colors.muted, items: groups.later },
    ],
    [groups, theme.colors],
  );

  const upcomingCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  const openCreate = () => {
    setSeed(undefined);
    setFormOpen(true);
  };

  const openEdit = (reminder: FarmReminder) => {
    setSeed(seedFromReminder(reminder));
    setFormOpen(true);
  };

  const submit = (draft: ReminderDraft) => {
    if (seed?.id) update(seed.id, draft);
    else add(draft);
    setFormOpen(false);
  };

  const deleteCurrent = () => {
    if (seed?.id) remove(seed.id);
    setFormOpen(false);
  };

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
          // Clears the floating button, so the last reminder is always reachable.
          paddingBottom: theme.spacing['3xl'] * 2 + insets.bottom,
        }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="h1">Farm reminders</Text>
          <Text variant="body" muted>
            Tasks you have asked to be reminded about, soonest first.
          </Text>
        </View>

        <NotificationNotice
          blocker={blocker as ReminderBlocker}
          onEnable={() => setNotificationPrefs({ remindersEnabled: true })}
          onRequestPermission={requestPermission}
        />

        {hasHydrated && upcomingCount + groups.done.length > 0 ? (
          <ReminderSummary groups={groups} progress={progress} />
        ) : null}

        <SegmentedControl
          segments={[`Upcoming${upcomingCount ? ` (${upcomingCount})` : ''}`, 'Done']}
          selectedIndex={tab}
          onChange={setTab}
          accessibilityLabel="Show upcoming or completed reminders"
        />

        {!hasHydrated ? (
          <SkeletonScreen>
            {[0, 1, 2].map((row) => (
              <Card key={row} style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
                  <Skeleton width={24} height={24} radius={12} />
                  <View style={{ flex: 1, gap: theme.spacing.xs }}>
                    <Skeleton width="70%" height={15} />
                    <Skeleton width={110} height={16} radius={999} />
                  </View>
                </View>
              </Card>
            ))}
          </SkeletonScreen>
        ) : tab === 0 ? (
          upcomingCount === 0 ? (
            <EmptyState
              icon="checkbox-outline"
              title={groups.done.length > 0 ? 'All caught up' : 'Nothing to do yet'}
              message={
                groups.done.length > 0
                  ? 'Nothing outstanding. Anything you add will show up here, soonest first.'
                  : 'Add a reminder, or open a crop calendar activity or a weather alert and set one from there.'
              }
            >
              <Button
                label="Add your first reminder"
                variant="outline"
                onPress={openCreate}
                icon={<Ionicons name="add" size={16} color={theme.colors.accent} />}
              />
            </EmptyState>
          ) : (
            <View style={{ gap: theme.spacing.lg }}>
              {sections
                .filter((section) => section.items.length > 0)
                .map((section) => (
                  <View key={section.title} style={{ gap: theme.spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Text variant="bodyStrong" color={section.tone}>
                        {section.title}
                      </Text>
                      <Text variant="caption" muted>
                        {section.items.length}
                      </Text>
                      {/* A hairline carrying the section's own colour, so the
                          eye can find the overdue block without reading. */}
                      <View style={{ flex: 1, height: 1, backgroundColor: section.tone + '33' }} />
                    </View>

                    {section.items.map((reminder) => (
                      <ReminderRow
                        key={reminder.id}
                        reminder={reminder}
                        onToggleDone={toggleDone}
                        onEdit={openEdit}
                        focused={reminder.id === focusId}
                      />
                    ))}
                  </View>
                ))}
            </View>
          )
        ) : groups.done.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Nothing completed yet"
            message="Reminders you tick off will collect here."
          />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Text variant="bodyStrong">Completed</Text>
              <Text variant="caption" muted>
                {groups.done.length}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
            </View>
            {groups.done.map((reminder) => (
              <ReminderRow key={reminder.id} reminder={reminder} onToggleDone={toggleDone} onEdit={openEdit} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating, so it is reachable from anywhere in a long list and never
          competes with the content for the top of the screen. */}
      <Pressable
        onPress={openCreate}
        accessibilityRole="button"
        accessibilityLabel="New reminder"
        style={{
          position: 'absolute',
          right: theme.spacing.lg,
          bottom: theme.spacing.lg + insets.bottom,
        }}
      >
        {({ pressed }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              minHeight: theme.minTouchTarget + 8,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: 999,
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.85 : 1,
              ...theme.elevation.raised,
            }}
          >
            <Ionicons name="add" size={20} color={theme.colors.onAccent} />
            <Text variant="bodyStrong" color={theme.colors.onAccent}>
              New reminder
            </Text>
          </View>
        )}
      </Pressable>

      <ReminderForm
        visible={formOpen}
        seed={seed}
        onSubmit={submit}
        onDelete={seed?.id ? deleteCurrent : undefined}
        onClose={() => setFormOpen(false)}
      />
    </Screen>
  );
}
