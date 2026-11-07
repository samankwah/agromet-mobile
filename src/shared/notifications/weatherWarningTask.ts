import { getWeeklyForecast } from '../api/forecastService';
import type { NotificationPrefs } from '../domain/userSettings';
import { useLocationStore } from '../state/locationStore';
import { useSettingsStore } from '../state/settingsStore';
import { canScheduleNotifications } from './notificationClient';
import { placeFor, scheduleLocalWarnings, syncPushRegistration, type WarningSettings } from './weatherWarnings';

/**
 * The background check: Android (and iOS, more sparingly) wakes the app now and
 * then, even when it is closed, and this refreshes the forecast for the
 * farmer's town, keeps the server's record of the phone fresh, and, when the
 * server route is not working, schedules the warnings on the phone.
 *
 * The system decides when it runs: every 30 minutes at most often, less on a
 * phone saving battery. That is why the server push is the main route and this
 * is the backup.
 *
 * `expo-task-manager` and `expo-background-task` are loaded with `require`, and
 * only where they can work: Expo Go has neither, and importing them there would
 * fail at app start (the same trap as `expo-notifications`, see
 * `notificationClient.ts`). The task has to be defined when this module is
 * first evaluated, which `app/_layout.tsx` makes happen at launch, including a
 * launch the system makes just to run the task.
 */

export const WEATHER_WARNING_TASK = 'agromet-weather-warnings';

/** The minimum gap the app asks for between background runs, in minutes. */
const MINIMUM_INTERVAL_MINUTES = 30;

type TaskManagerApi = typeof import('expo-task-manager');
type BackgroundTaskApi = typeof import('expo-background-task');

function loadModules(): { TaskManager: TaskManagerApi; BackgroundTask: BackgroundTaskApi } | null {
  if (!canScheduleNotifications()) return null;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    return {
      TaskManager: require('expo-task-manager') as TaskManagerApi,
      BackgroundTask: require('expo-background-task') as BackgroundTaskApi,
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    return null;
  }
}

export function warningSettingsFrom(prefs: NotificationPrefs): WarningSettings {
  return { enabled: prefs.alertsEnabled, hazards: prefs.warningHazards };
}

/** One check, as the background task runs it. Exported for tests. */
export async function runWeatherWarningCheck(now: Date = new Date()): Promise<void> {
  // A launch made just for this task starts with empty stores: read the saved
  // settings and town first.
  await Promise.all([useSettingsStore.persist.rehydrate(), useLocationStore.persist.rehydrate()]);
  const settings = warningSettingsFrom(useSettingsStore.getState().notificationPrefs);
  const locationId = useLocationStore.getState().selectedLocationId;

  await syncPushRegistration(settings, placeFor(locationId));
  if (!settings.enabled) {
    await scheduleLocalWarnings([], settings, now);
    return;
  }
  try {
    const forecast = await getWeeklyForecast(locationId);
    await scheduleLocalWarnings(forecast.weatherAlerts ?? [], settings, now);
  } catch {
    // No connection: whatever was scheduled last time stays scheduled.
  }
}

const modules = loadModules();
if (modules) {
  try {
    modules.TaskManager.defineTask(WEATHER_WARNING_TASK, async () => {
      try {
        await runWeatherWarningCheck();
        return modules.BackgroundTask.BackgroundTaskResult.Success;
      } catch {
        return modules.BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  } catch {
    // Defined already (a fast refresh in development), or unsupported.
  }
}

/** Ask the system to run the check in the background. Safe to call on every
 * launch: registering again keeps the existing schedule. */
export async function registerWeatherWarningTask(): Promise<void> {
  if (!modules) return;
  try {
    const registered = await modules.TaskManager.isTaskRegisteredAsync(WEATHER_WARNING_TASK);
    if (!registered) {
      await modules.BackgroundTask.registerTaskAsync(WEATHER_WARNING_TASK, { minimumInterval: MINIMUM_INTERVAL_MINUTES });
    }
  } catch {
    // Background work refused (battery saver, restricted app): the server push
    // still gets warnings through.
  }
}

/** Stop the background check, when warnings are switched off. */
export async function unregisterWeatherWarningTask(): Promise<void> {
  if (!modules) return;
  try {
    if (await modules.TaskManager.isTaskRegisteredAsync(WEATHER_WARNING_TASK)) {
      await modules.BackgroundTask.unregisterTaskAsync(WEATHER_WARNING_TASK);
    }
  } catch {
    // Nothing to stop.
  }
}
