import * as Location from 'expo-location';

import {
  ensureLocationPermission,
  getCurrentCoords,
  getLocationPermissionState,
} from '../../shared/location/locationClient';

/**
 * The client's whole job is to map `expo-location`'s permission responses onto
 * the app's four-state union without ever throwing. The `undetermined` vs
 * `denied` split is the part that matters: only `denied` should send a farmer
 * to system settings.
 */

const getPerms = Location.getForegroundPermissionsAsync as jest.Mock;
const requestPerms = Location.requestForegroundPermissionsAsync as jest.Mock;
const getPosition = Location.getCurrentPositionAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getLocationPermissionState', () => {
  it('reports granted', async () => {
    getPerms.mockResolvedValueOnce({ granted: true, canAskAgain: true });
    await expect(getLocationPermissionState()).resolves.toBe('granted');
  });

  it('reports undetermined when it can still be asked', async () => {
    getPerms.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    await expect(getLocationPermissionState()).resolves.toBe('undetermined');
  });

  it('reports denied only when it cannot be asked again', async () => {
    getPerms.mockResolvedValueOnce({ granted: false, canAskAgain: false });
    await expect(getLocationPermissionState()).resolves.toBe('denied');
  });

  it('never throws', async () => {
    getPerms.mockRejectedValueOnce(new Error('no native module'));
    await expect(getLocationPermissionState()).resolves.toBe('unknown');
  });
});

describe('ensureLocationPermission', () => {
  it('asks when the permission is undetermined', async () => {
    getPerms.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    requestPerms.mockResolvedValueOnce({ granted: true, canAskAgain: true });

    await expect(ensureLocationPermission()).resolves.toBe('granted');
    expect(requestPerms).toHaveBeenCalledTimes(1);
  });

  it('does not ask again once refused for good', async () => {
    getPerms.mockResolvedValueOnce({ granted: false, canAskAgain: false });

    await expect(ensureLocationPermission()).resolves.toBe('denied');
    expect(requestPerms).not.toHaveBeenCalled();
  });

  it('skips the request when already granted', async () => {
    getPerms.mockResolvedValueOnce({ granted: true, canAskAgain: true });

    await expect(ensureLocationPermission()).resolves.toBe('granted');
    expect(requestPerms).not.toHaveBeenCalled();
  });
});

describe('getCurrentCoords', () => {
  it('returns the coordinates from a fix', async () => {
    getPosition.mockResolvedValueOnce({ coords: { latitude: 6.6885, longitude: -1.6244 } });
    await expect(getCurrentCoords()).resolves.toEqual({ latitude: 6.6885, longitude: -1.6244 });
  });

  it('returns null when no fix can be had', async () => {
    getPosition.mockRejectedValueOnce(new Error('location services off'));
    await expect(getCurrentCoords()).resolves.toBeNull();
  });
});
