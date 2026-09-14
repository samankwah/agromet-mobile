import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RemindersScreen } from '../../features/farm-tools/reminders/RemindersScreen';
import type { FarmReminder } from '../../shared/domain/farmReminder';
import { useReminderStore } from '../../shared/state/reminderStore';
import { useSettingsStore } from '../../shared/state/settingsStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen(node: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>{node}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

function seeded(overrides: Partial<FarmReminder> = {}): FarmReminder {
  return {
    id: 'seeded',
    title: 'Top-dress the maize',
    dueAt: inDays(1),
    repeat: 'none',
    isDone: false,
    source: 'manual',
    notificationId: 'scheduled-1',
    createdAt: inDays(-1),
    updatedAt: inDays(-1),
    ...overrides,
  };
}

beforeEach(() => {
  useReminderStore.setState({ reminders: [], permission: 'granted', hasHydrated: true });
  useSettingsStore.setState({
    notificationPrefs: { alertsEnabled: true, advisoriesEnabled: true, bulletinsEnabled: true, remindersEnabled: true },
  });
  jest.clearAllMocks();
});

describe('RemindersScreen', () => {
  it('says there is nothing to do, and where reminders can come from', () => {
    renderScreen(<RemindersScreen />);

    expect(screen.getByText('Nothing to do yet')).toBeTruthy();
    expect(screen.getByText(/crop calendar activity or a weather alert/)).toBeTruthy();
  });

  it('groups reminders by urgency rather than listing them flat', () => {
    useReminderStore.setState({
      reminders: [
        seeded({ id: 'late', title: 'Late task', dueAt: inDays(-2) }),
        seeded({ id: 'soon', title: 'Soon task', dueAt: inDays(3) }),
      ],
    });

    renderScreen(<RemindersScreen />);

    expect(screen.getByText('Overdue')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Late task')).toBeTruthy();
    expect(screen.getByText('Soon task')).toBeTruthy();
  });

  it('creates a reminder from the form', async () => {
    renderScreen(<RemindersScreen />);

    fireEvent.press(screen.getByText('New reminder'));
    fireEvent.changeText(screen.getByLabelText('Reminder title'), 'Vaccinate the flock');
    fireEvent.press(screen.getByText('Add reminder'));

    await waitFor(() => expect(useReminderStore.getState().reminders).toHaveLength(1));
    expect(useReminderStore.getState().reminders[0].title).toBe('Vaccinate the flock');
  });

  /* An untitled reminder arriving at 07:00 tells the farmer nothing, so the
     form refuses it rather than saving something useless. */
  it('refuses a reminder with no title, and says why', async () => {
    renderScreen(<RemindersScreen />);

    fireEvent.press(screen.getByText('New reminder'));
    fireEvent.press(screen.getByText('Add reminder'));

    expect(await screen.findByText(/Give the reminder a name/)).toBeTruthy();
    expect(useReminderStore.getState().reminders).toHaveLength(0);
  });

  it('completes a reminder from its checkbox and moves it to Done', async () => {
    useReminderStore.setState({ reminders: [seeded()] });
    renderScreen(<RemindersScreen />);

    fireEvent.press(screen.getByLabelText('Mark done: Top-dress the maize'));

    await waitFor(() => expect(useReminderStore.getState().reminders[0].isDone).toBe(true));
    // Nothing outstanding, but something *was* done — a different state from a
    // farmer who has never added anything, and worth different words.
    expect(screen.getByText('All caught up')).toBeTruthy();

    fireEvent.press(screen.getByText('Done'));
    expect(screen.getByText('Top-dress the maize')).toBeTruthy();
  });

  it('deletes a reminder from the edit sheet', async () => {
    useReminderStore.setState({ reminders: [seeded()] });
    renderScreen(<RemindersScreen />);

    fireEvent.press(screen.getByLabelText(/^Edit Top-dress the maize/));
    fireEvent.press(await screen.findByText('Delete reminder'));

    await waitFor(() => expect(useReminderStore.getState().reminders).toHaveLength(0));
  });

  /* The most important behaviour on the screen: a reminder that cannot alert
     must say so. A farmer who sets one and hears nothing has been failed. */
  it('warns on a reminder that has no alert behind it', () => {
    useReminderStore.setState({ reminders: [seeded({ notificationId: null })] });
    renderScreen(<RemindersScreen />);

    expect(screen.getByText('No alert')).toBeTruthy();
  });

  /* A fresh install has never been asked, which is not the same as refused.
     Telling that farmer alerts are "blocked" and sending them to system
     settings is untrue, and the toggle they are sent to look for is not even
     there yet. */
  it('offers an in-app prompt when permission has simply never been asked', async () => {
    useReminderStore.setState({ reminders: [seeded()], permission: 'undetermined' });
    renderScreen(<RemindersScreen />);

    expect(screen.getByText('Turn on reminder alerts')).toBeTruthy();
    expect(screen.queryByText('Open settings')).toBeNull();

    fireEvent.press(screen.getByText('Allow notifications'));
    await waitFor(() => expect(useReminderStore.getState().permission).toBe('granted'));
  });

  it('sends the farmer to system settings only once they have actually refused', () => {
    useReminderStore.setState({ reminders: [seeded()], permission: 'denied' });
    renderScreen(<RemindersScreen />);

    expect(screen.getByText('Notifications are blocked')).toBeTruthy();
    expect(screen.getByText('Open settings')).toBeTruthy();
  });

  it('explains when the farmer has switched reminder alerts off, and offers to turn them back on', async () => {
    useSettingsStore.setState({
      notificationPrefs: { alertsEnabled: true, advisoriesEnabled: true, bulletinsEnabled: true, remindersEnabled: false },
    });
    renderScreen(<RemindersScreen />);

    expect(screen.getByText('Reminder alerts are switched off')).toBeTruthy();

    fireEvent.press(screen.getByText('Turn alerts on'));
    await waitFor(() =>
      expect(useSettingsStore.getState().notificationPrefs.remindersEnabled).toBe(true),
    );
  });

  /* The summary answers "am I on top of things?" before the list answers
     "of what?" — and it leads with a sentence, not a bare number. */
  it('leads with the overdue count when something is late', () => {
    useReminderStore.setState({
      reminders: [
        seeded({ id: 'late', title: 'Late task', dueAt: inDays(-2) }),
        seeded({ id: 'soon', title: 'Soon task', dueAt: inDays(3) }),
      ],
    });
    renderScreen(<RemindersScreen />);

    expect(screen.getByText('1 reminder is overdue')).toBeTruthy();
    expect(screen.getByText(/Done this week/)).toBeTruthy();
  });

  it('says nothing is due when the day is clear', () => {
    useReminderStore.setState({ reminders: [seeded({ dueAt: inDays(5) })] });
    renderScreen(<RemindersScreen />);

    expect(screen.getByText('Nothing due today')).toBeTruthy();
  });

  /* A summary of nothing is noise; it appears only once there is something to
     summarise. */
  it('hides the summary entirely when there are no reminders', () => {
    renderScreen(<RemindersScreen />);

    expect(screen.queryByText('Nothing due today')).toBeNull();
    expect(screen.queryByText(/Done this week/)).toBeNull();
  });

  it('shows no warning at all when everything is working', () => {
    useReminderStore.setState({ reminders: [seeded()] });
    renderScreen(<RemindersScreen />);

    expect(screen.queryByText('No alert')).toBeNull();
    expect(screen.queryByText('Notifications are blocked')).toBeNull();
    expect(screen.queryByText('Reminder alerts are switched off')).toBeNull();
  });
});
