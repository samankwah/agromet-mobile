import React, { useState } from 'react';
import { View } from 'react-native';

import { canScheduleNotifications, schedulingBlocker } from '../../../shared/notifications/notificationClient';
import { sendTestWarning } from '../../../shared/notifications/weatherWarnings';
import type { WarningHazard } from '../../../shared/domain/userSettings';
import { useReminderStore } from '../../../shared/state/reminderStore';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Divider } from '../../../shared/ui/Divider';
import { Text } from '../../../shared/ui/Text';
import { NotificationNotice } from '../../farm-tools/reminders/components/NotificationNotice';
import { ToggleSetting } from './ToggleSetting';

const TYPES: { hazard: WarningHazard; label: string; description: string }[] = [
  { hazard: 'thunderstorm', label: 'Thunderstorms', description: 'Two hours before a storm is expected, with hail if likely.' },
  { hazard: 'heavy-rain', label: 'Heavy rain', description: 'Rain heavy enough to stop field work or flood low ground.' },
  { hazard: 'strong-wind', label: 'Strong wind', description: 'Gusts strong enough to damage roofs, racks and tall crops.' },
  { hazard: 'extreme-heat', label: 'Extreme heat', description: 'Days when it feels 40°C or hotter.' },
];

/**
 * Weather warnings as notifications: the main switch, one switch per warning
 * type, what is stopping them if anything, and a test.
 *
 * The warnings come for the town the app shows on Home, from the server even
 * with the app closed, or scheduled on the phone when the server cannot reach
 * it (`shared/notifications/weatherWarnings.ts`).
 */
export function WeatherWarningSettings() {
  const theme = useTheme();
  const enabled = useSettingsStore((state) => state.notificationPrefs.alertsEnabled);
  const hazards = useSettingsStore((state) => state.notificationPrefs.warningHazards);
  const setNotificationPrefs = useSettingsStore((state) => state.setNotificationPrefs);
  const permission = useReminderStore((state) => state.permission);
  const requestPermission = useReminderStore((state) => state.requestPermission);
  const [test, setTest] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const blocker = enabled ? schedulingBlocker(permission) : null;

  const runTest = async () => {
    setTest('sending');
    setTest((await sendTestWarning()) ? 'sent' : 'failed');
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="h3">Weather warnings</Text>
      <Card style={{ gap: theme.spacing.lg }}>
        <ToggleSetting
          label="Warn me about severe weather"
          description="Get a notification when a storm, heavy rain, strong wind or extreme heat is coming to your town, even with the app closed."
          value={enabled}
          onChange={(value) => setNotificationPrefs({ alertsEnabled: value })}
        />

        {enabled
          ? TYPES.map((type) => (
              <React.Fragment key={type.hazard}>
                <Divider />
                <ToggleSetting
                  label={type.label}
                  description={type.description}
                  value={hazards[type.hazard]}
                  onChange={(value) => setNotificationPrefs({ warningHazards: { ...hazards, [type.hazard]: value } })}
                />
              </React.Fragment>
            ))
          : null}

        {blocker ? <NotificationNotice blocker={blocker} onRequestPermission={requestPermission} subject="warnings" /> : null}

        {enabled && !blocker && canScheduleNotifications() ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Button label="Send a test notification" variant="outline" loading={test === 'sending'} onPress={runTest} />
            {test === 'sent' ? (
              <Text variant="caption" muted>
                Sent. It should arrive in a few seconds.
              </Text>
            ) : null}
            {test === 'failed' ? (
              <Text variant="caption" muted>
                Could not send one. Check your connection, then try again in a minute.
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    </View>
  );
}
