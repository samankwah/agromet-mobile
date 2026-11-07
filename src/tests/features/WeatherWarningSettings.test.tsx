import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { WeatherWarningSettings } from '../../features/settings/components/WeatherWarningSettings';
import { useReminderStore } from '../../shared/state/reminderStore';
import { useSettingsStore } from '../../shared/state/settingsStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

const ALL_ON = { thunderstorm: true, 'heavy-rain': true, 'extreme-heat': true, 'strong-wind': true };

function renderSection() {
  return render(
    <ThemeProvider>
      <WeatherWarningSettings />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  useReminderStore.setState({ permission: 'granted' });
  useSettingsStore.setState({
    notificationPrefs: { ...useSettingsStore.getState().notificationPrefs, alertsEnabled: true, warningHazards: { ...ALL_ON } },
  });
});

describe('WeatherWarningSettings', () => {
  it('offers the main switch and one switch per warning type', () => {
    renderSection();
    for (const label of ['Warn me about severe weather', 'Thunderstorms', 'Heavy rain', 'Strong wind', 'Extreme heat']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('turns one type off without touching the others', () => {
    renderSection();
    fireEvent(screen.getByLabelText('Extreme heat'), 'valueChange', false);
    expect(useSettingsStore.getState().notificationPrefs.warningHazards).toEqual({ ...ALL_ON, 'extreme-heat': false });
  });

  it('hides the types when warnings are off', () => {
    useSettingsStore.setState({
      notificationPrefs: { ...useSettingsStore.getState().notificationPrefs, alertsEnabled: false },
    });
    renderSection();
    expect(screen.queryByLabelText('Thunderstorms')).toBeNull();
  });

  it('asks for notification permission when it has not been given', () => {
    useReminderStore.setState({ permission: 'undetermined' });
    renderSection();
    expect(screen.getByText('Turn on weather warnings')).toBeTruthy();
    expect(screen.queryByText('Send a test notification')).toBeNull();
  });
});
