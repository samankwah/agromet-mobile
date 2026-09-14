import React from 'react';
import { Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { Text } from '../../../../shared/ui/Text';

/** What is stopping alerts, including the app's own setting. */
export type ReminderBlocker = 'expo-go' | 'permission-undetermined' | 'permission-denied' | 'disabled' | null;

type Props = {
  blocker: ReminderBlocker;
  /** Turns the app's own reminders setting back on. */
  onEnable?: () => void;
  /** Prompts the OS for notification permission. */
  onRequestPermission?: () => void;
};

/**
 * Says plainly when a reminder will not actually alert anyone.
 *
 * This is the most important component on the screen. A reminder that silently
 * fails to fire is worse than no reminder at all: the farmer stops watching for
 * the task themselves *because* they set a reminder, and then nothing arrives.
 * Each case gets its own words and, where one exists, its own way out.
 */
export function NotificationNotice({ blocker, onEnable, onRequestPermission }: Props) {
  const theme = useTheme();

  if (!blocker) return null;

  const copy = {
    'expo-go': {
      icon: 'flask-outline' as const,
      title: 'Alerts are off in Expo Go',
      body: 'Reminders are saved and shown here, but Expo Go cannot deliver notifications on Android. Install the development build to get alerts when the app is closed.',
      action: null,
    },
    'permission-undetermined': {
      icon: 'notifications-outline' as const,
      title: 'Turn on reminder alerts',
      body: 'Your phone has not been asked yet. Allow notifications and reminders will alert you when they are due, even with the app closed.',
      action: 'Allow notifications',
    },
    'permission-denied': {
      icon: 'notifications-off-outline' as const,
      title: 'Notifications are blocked',
      body: 'Reminders are saved, but your phone will not alert you. Allow notifications for AgroMet to change that.',
      action: 'Open settings',
    },
    disabled: {
      icon: 'toggle-outline' as const,
      title: 'Reminder alerts are switched off',
      body: 'Reminders are still saved and listed here. Turn alerts back on to be notified when one is due.',
      action: 'Turn alerts on',
    },
  }[blocker];

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.warning + '1a',
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: theme.colors.warning + '55',
        padding: theme.spacing.md,
      }}
    >
      <Ionicons name={copy.icon} size={20} color={theme.colors.warning} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: theme.spacing.sm }}>
        <Text variant="bodyStrong" color={theme.colors.warning}>
          {copy.title}
        </Text>
        <Text variant="caption" muted>
          {copy.body}
        </Text>

        {copy.action ? (
          <Button
            label={copy.action}
            variant="outline"
            onPress={
              blocker === 'disabled'
                ? onEnable
                : blocker === 'permission-undetermined'
                  ? onRequestPermission
                  : // Only a farmer who has permanently refused needs system
                    // settings; for anyone else the in-app prompt still works.
                    () => Linking.openSettings()
            }
          />
        ) : null}
      </View>
    </View>
  );
}
