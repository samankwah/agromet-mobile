import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { useReminderStore } from '../../shared/state/reminderStore';
import { useSettingsStore } from '../../shared/state/settingsStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** The screen refreshes permission on mount, so seeding the store is not enough
 * — the OS mock has to agree or the refresh overwrites it. */
function osPermission(state: 'granted' | 'undetermined' | 'denied') {
  const reply = {
    granted: { granted: true, canAskAgain: true, status: 'granted' },
    undetermined: { granted: false, canAskAgain: true, status: 'undetermined' },
    denied: { granted: false, canAskAgain: false, status: 'denied' },
  }[state];
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(reply);
}

beforeEach(() => {
  useSettingsStore.setState({
    themeOverride: 'system',
    textSize: 'standard',
    dataSaverEnabled: false,
    notificationPrefs: {
      alertsEnabled: true,
      advisoriesEnabled: true,
      bulletinsEnabled: true,
      remindersEnabled: true,
    },
  });
  useReminderStore.setState({ permission: 'granted', hasHydrated: true });
  osPermission('granted');
});

describe('SettingsScreen', () => {
  it('shows the four settings that are wired to something', async () => {
    renderScreen();

    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByText('Text size')).toBeTruthy();
    expect(screen.getByText('Data saver')).toBeTruthy();
    expect(screen.getByText('Reminder alerts')).toBeTruthy();
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  /* The store holds eight settings and only four have a consumer. A control
     that persists a value nothing reads looks like a working preference and is
     not one — this is the guard against one being added back thoughtlessly. */
  it('offers no control for a setting nothing consumes', async () => {
    renderScreen();
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());

    // Only 'en' exists, so a language picker would be a one-option decoration.
    expect(screen.queryByText(/language/i)).toBeNull();
    expect(screen.queryByText(/livestock/i)).toBeNull();
    expect(screen.queryByText(/favourite/i)).toBeNull();
    // Only remindersEnabled is wired to delivery; the other three notification
    // preferences would promise control the app cannot honour.
    expect(screen.queryByText(/weather alerts/i)).toBeNull();
    expect(screen.queryByText(/advisory notifications/i)).toBeNull();
    expect(screen.queryByText(/bulletin/i)).toBeNull();
  });

  it('records the appearance choice', async () => {
    renderScreen();

    fireEvent.press(screen.getByRole('tab', { name: 'Dark' }));
    expect(useSettingsStore.getState().themeOverride).toBe('dark');

    fireEvent.press(screen.getByRole('tab', { name: 'Light' }));
    expect(useSettingsStore.getState().themeOverride).toBe('light');
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  it('records the text size choice', async () => {
    renderScreen();

    fireEvent.press(screen.getByRole('tab', { name: 'Extra large' }));
    expect(useSettingsStore.getState().textSize).toBe('extra-large');
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  it('records the data saver switch', async () => {
    renderScreen();

    fireEvent(screen.getByLabelText('Data saver'), 'valueChange', true);
    expect(useSettingsStore.getState().dataSaverEnabled).toBe(true);
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  it('records the reminder alerts switch without clearing the other preferences', async () => {
    renderScreen();

    fireEvent(screen.getByLabelText('Reminder alerts'), 'valueChange', false);

    const prefs = useSettingsStore.getState().notificationPrefs;
    expect(prefs.remindersEnabled).toBe(false);
    // setNotificationPrefs takes a partial; a spread bug here would wipe the
    // three preferences this screen deliberately does not show.
    expect(prefs.alertsEnabled).toBe(true);
    expect(prefs.advisoriesEnabled).toBe(true);
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  /* A switch reading "on" while the OS silently drops every notification is the
     failure this whole notice exists to prevent. */
  it('warns when the phone will not deliver the alerts the switch promises', async () => {
    osPermission('undetermined');
    renderScreen();

    expect(await screen.findByText('Turn on reminder alerts')).toBeTruthy();
  });

  it('says nothing when the phone will deliver them', async () => {
    renderScreen();

    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
    expect(screen.queryByText('Turn on reminder alerts')).toBeNull();
    expect(screen.queryByText('Notifications are blocked')).toBeNull();
  });

  /* With the switch off there is nothing to warn about, and repeating it as a
     banner directly under the switch would explain a control the farmer is
     already looking at. */
  it('does not repeat the switch back at you when alerts are off', async () => {
    osPermission('denied');
    useSettingsStore.setState({
      notificationPrefs: {
        alertsEnabled: true,
        advisoriesEnabled: true,
        bulletinsEnabled: true,
        remindersEnabled: false,
      },
    });
    renderScreen();

    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
    expect(screen.queryByText('Notifications are blocked')).toBeNull();
    expect(screen.queryByText('Reminder alerts are switched off')).toBeNull();
  });
});
