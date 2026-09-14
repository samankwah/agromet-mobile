import React, { useEffect } from 'react';
import { View } from 'react-native';

import { schedulingBlocker } from '../../shared/notifications/notificationClient';
import { useReminderStore } from '../../shared/state/reminderStore';
import { useOnboardingStore } from '../../shared/state/onboardingStore';
import { useSettingsStore } from '../../shared/state/settingsStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Divider } from '../../shared/ui/Divider';
import { Screen } from '../../shared/ui/Screen';
import { Text } from '../../shared/ui/Text';
import { NotificationNotice } from '../farm-tools/reminders/components/NotificationNotice';
import { ChoiceSetting } from './components/ChoiceSetting';
import { ToggleSetting } from './components/ToggleSetting';

/**
 * The app's settings.
 *
 * `settingsStore` has been real and persisted for some time, but nothing ever
 * exposed it: theme, text size and data saver were reachable only by editing
 * code. This screen is that missing UI, and nothing more.
 *
 * **Every control here is wired to something that actually happens.** The store
 * holds eight settings; only these four have a consumer, so only these four are
 * shown. Deliberately absent, and why:
 *
 *   - `language` — the type is `'en'` and nothing else. A picker with one
 *     option is a decoration. It returns when a second language does.
 *   - `livestockType`, `favouriteDistrictIds`, `favouriteCrops` — nothing reads
 *     them. A control that persists a value no code consults looks like a
 *     working preference and is not one.
 *   - `notificationPrefs.alertsEnabled` / `advisoriesEnabled` /
 *     `bulletinsEnabled` — same: only `remindersEnabled` is wired to delivery
 *     (see `useReminderNotifications`), so it is the only notification switch
 *     offered. Showing the other three would promise notification control the
 *     app cannot honour.
 *
 * No screen-level `h1`: the stack header already reads "Settings", and this is
 * a utility reached from an icon, not a destination that needs re-announcing.
 * Same choice as the advisory archive.
 */
export function SettingsScreen() {
  const theme = useTheme();

  const resetWelcome = useOnboardingStore((state) => state.resetWelcome);
  const themeOverride = useSettingsStore((state) => state.themeOverride);
  const setThemeOverride = useSettingsStore((state) => state.setThemeOverride);
  const textSize = useSettingsStore((state) => state.textSize);
  const setTextSize = useSettingsStore((state) => state.setTextSize);
  const dataSaverEnabled = useSettingsStore((state) => state.dataSaverEnabled);
  const setDataSaverEnabled = useSettingsStore((state) => state.setDataSaverEnabled);
  const preferOfflineDiagnosis = useSettingsStore((state) => state.preferOfflineDiagnosis);
  const setPreferOfflineDiagnosis = useSettingsStore((state) => state.setPreferOfflineDiagnosis);
  const remindersEnabled = useSettingsStore((state) => state.notificationPrefs.remindersEnabled);
  const setNotificationPrefs = useSettingsStore((state) => state.setNotificationPrefs);

  const permission = useReminderStore((state) => state.permission);
  const refreshPermission = useReminderStore((state) => state.refreshPermission);
  const requestPermission = useReminderStore((state) => state.requestPermission);

  // The farmer may have changed notification permission in the OS since the app
  // started, and this is the screen where they would come to look for it.
  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  // Only the OS-level blockers. `schedulingBlocker` never returns 'disabled' —
  // that case is the switch immediately above, and repeating it underneath as a
  // warning with its own "turn on" button would be talking about a control the
  // farmer is already looking at.
  const blocker = remindersEnabled ? schedulingBlocker(permission) : null;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">Display</Text>
        <Card style={{ gap: theme.spacing.lg }}>
          <ChoiceSetting
            label="Appearance"
            description="System follows your phone's light or dark setting."
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={themeOverride}
            onChange={setThemeOverride}
          />

          <Divider />

          {/* Changing this re-scales the whole type scale through ThemeProvider,
              including the labels on this screen — so the effect is visible as
              it is chosen, which is the best possible preview. */}
          <ChoiceSetting
            label="Text size"
            description="Applies to text throughout the app."
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'large', label: 'Large' },
              { value: 'extra-large', label: 'Extra large' },
            ]}
            value={textSize}
            onChange={setTextSize}
          />
        </Card>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">Data and notifications</Text>
        <Card style={{ gap: theme.spacing.lg }}>
          <ToggleSetting
            label="Data saver"
            description="Load weather only for the city you are viewing, instead of all of them."
            value={dataSaverEnabled}
            onChange={setDataSaverEnabled}
          />

          <Divider />

          {/* Off by default, because it is a downgrade for most farmers: the
              online check covers many more crops and returns fuller advice.
              Offered anyway because on a metered connection the answer that
              costs no data is worth having, and the description says plainly
              what is given up rather than selling it as a feature. */}
          <ToggleSetting
            label="Diagnose crops on this phone"
            description="Use the offline check even when you have internet. It uses no data and works anywhere, but it only knows cassava diseases."
            value={preferOfflineDiagnosis}
            onChange={setPreferOfflineDiagnosis}
          />

          <Divider />

          <ToggleSetting
            label="Reminder alerts"
            description="Get notified when a farm reminder is due, even with the app closed."
            value={remindersEnabled}
            onChange={(value) => setNotificationPrefs({ remindersEnabled: value })}
          />

          {blocker ? (
            <NotificationNotice blocker={blocker} onRequestPermission={requestPermission} />
          ) : null}
        </Card>
      </View>

      {/* An action, not a preference — hence a button rather than a toggle, and
          its own section rather than a row among the settings above. It exists
          because the welcome screen is shown once per install: without this it
          could not be demonstrated to an extension officer, or checked after a
          change, without wiping the app's data. */}
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">About this app</Text>
        <Card style={{ gap: theme.spacing.md }}>
          <Text variant="body" muted>
            The introduction is shown once, the first time AgroMet opens.
          </Text>
          <Button
            label="Show the welcome screen"
            variant="outline"
            // No navigation: clearing the flag is enough, because the root
            // layout swaps the navigator for the welcome screen the moment it
            // turns false.
            onPress={resetWelcome}
          />
        </Card>
      </View>
    </Screen>
  );
}
