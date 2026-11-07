import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import type { WeatherAlert } from '../../shared/domain/weatherAlert';
import {
  isPushHealthy,
  placeFor,
  scheduleLocalWarnings,
  syncPushRegistration,
  type WarningSettings,
} from '../../shared/notifications/weatherWarnings';

const ALL_ON: WarningSettings = {
  enabled: true,
  hazards: { thunderstorm: true, 'heavy-rain': true, 'extreme-heat': true, 'strong-wind': true },
};
const ATEBUBU = placeFor('atebubu') ?? { lat: 7.75, lng: -0.98, name: 'Atebubu', region: 'Bono East' };

const fetchMock = jest.fn();

// A push token needs the EAS project id, which app.json supplies in a build and
// the test environment does not.
(Constants as unknown as { expoConfig: { extra: unknown } }).expoConfig = {
  ...(Constants.expoConfig ?? {}),
  extra: { eas: { projectId: 'test-project' } },
} as never;

function answer(status = 200) {
  return { ok: status < 400, status, json: async () => ({ success: true, data: {} }) };
}

function bodies(path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes(path)).map(([, init]) => JSON.parse(init.body));
}

const heat = (date: string): WeatherAlert =>
  ({
    id: `weather:atebubu:extreme-heat:${date}`,
    headline: 'Extreme heat today, feels like 41°C',
    district: 'Atebubu',
    region: 'Bono East',
    hazardType: 'Extreme heat',
    severity: 'warning',
    issuedAt: `${date}T00:00:00.000Z`,
    expiresAt: `${date}T23:59:59.000Z`,
  }) as WeatherAlert;

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => answer());
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  jest.clearAllMocks();
});

describe('syncPushRegistration', () => {
  it("registers the phone's token with the town and the warning types left on", async () => {
    const result = await syncPushRegistration(
      { ...ALL_ON, hazards: { ...ALL_ON.hazards, 'extreme-heat': false } },
      { lat: 7.7527, lng: -0.9815, name: 'Atebubu', region: 'Bono East' },
    );

    expect(result).toBe('registered');
    const [body] = bodies('/api/push/register');
    expect(body).toMatchObject({
      token: 'ExponentPushToken[test-token]',
      lat: 7.75,
      lng: -0.98,
      placeName: 'Atebubu',
      region: 'Bono East',
      hazards: ['thunderstorm', 'heavy-rain', 'strong-wind'],
    });
    expect(await isPushHealthy()).toBe(true);
  });

  it('unregisters when warnings are switched off', async () => {
    await syncPushRegistration(ALL_ON, ATEBUBU);
    const result = await syncPushRegistration({ ...ALL_ON, enabled: false }, ATEBUBU);

    expect(result).toBe('unregistered');
    expect(bodies('/api/push/unregister')).toEqual([{ token: 'ExponentPushToken[test-token]' }]);
    expect(await isPushHealthy()).toBe(false);
  });

  it('does not register without notification permission', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false, canAskAgain: false, status: 'denied' });
    expect(await syncPushRegistration(ALL_ON, ATEBUBU)).toBe('no-permission');
    expect(bodies('/api/push/register')).toEqual([]);
  });

  it('reports a failure, and stays unhealthy, when the server cannot be reached', async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await syncPushRegistration(ALL_ON, ATEBUBU)).toBe('failed');
    expect(await isPushHealthy()).toBe(false);
  });
});

describe('scheduleLocalWarnings', () => {
  const morning = new Date('2026-11-07T10:00:00Z');

  it('schedules nothing on the phone while the server route works, so no warning comes twice', async () => {
    await syncPushRegistration(ALL_ON, ATEBUBU);
    expect(await scheduleLocalWarnings([heat('2026-11-07')], ALL_ON, morning)).toBe(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules the warnings itself when the server has not been reached for a day', async () => {
    expect(await scheduleLocalWarnings([heat('2026-11-07'), heat('2026-11-08')], ALL_ON, morning)).toBe(2);
    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.map(([request]) => request);
    expect(calls[0].content).toMatchObject({
      title: 'Extreme heat warning',
      body: 'Extreme heat today, feels like 41°C. Atebubu, Bono East',
      data: { type: 'weather-alert', alertId: 'weather:atebubu:extreme-heat:2026-11-07' },
    });
    // Today's goes out now; tomorrow's waits for the evening before.
    expect(calls[0].trigger).toBeNull();
    expect(calls[1].trigger.date.toISOString()).toBe('2026-11-07T18:00:00.000Z');
  });

  it('skips a warning type the farmer switched off', async () => {
    const noHeat = { ...ALL_ON, hazards: { ...ALL_ON.hazards, 'extreme-heat': false } };
    expect(await scheduleLocalWarnings([heat('2026-11-07')], noHeat, morning)).toBe(0);
  });

  it('replaces what it scheduled last time', async () => {
    await scheduleLocalWarnings([heat('2026-11-07')], ALL_ON, morning);
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockClear();
    await scheduleLocalWarnings([], ALL_ON, morning);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  });
});
