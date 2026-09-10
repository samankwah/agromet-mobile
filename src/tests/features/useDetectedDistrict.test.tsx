import * as Location from 'expo-location';

import { detectAndStoreDistrict } from '../../features/advisories/weather-alerts/useDetectedDistrict';
import { DEFAULT_LOCATION_ID } from '../../shared/data/mockWeather';
import { useLocationStore } from '../../shared/state/locationStore';

/**
 * `detectAndStoreDistrict` is the one-shot the hook fires. It must leave the
 * store in a sane place whatever happens: a district when there is a fix, the
 * permission recorded and the attempt closed when there is not.
 */

const getPerms = Location.getForegroundPermissionsAsync as jest.Mock;
const getPosition = Location.getCurrentPositionAsync as jest.Mock;

const INITIAL = useLocationStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useLocationStore.setState({
    selectedLocationId: DEFAULT_LOCATION_ID,
    savedDistrictIds: [],
    detectedDistrictId: null,
    detectedTownId: null,
    locationPermission: 'unknown',
    locationResolved: false,
    townChoiceIsManual: false,
  });
});

afterAll(() => {
  useLocationStore.setState(INITIAL);
});

it('places the farmer and moves the Home town when a fix comes back', async () => {
  getPerms.mockResolvedValueOnce({ granted: true, canAskAgain: true });
  getPosition.mockResolvedValueOnce({ coords: { latitude: 6.6885, longitude: -1.6244 } }); // Kumasi

  await detectAndStoreDistrict();

  const state = useLocationStore.getState();
  expect(state.detectedDistrictId).toBe('kumasi-metropolitan');
  expect(state.detectedTownId).toBe('kumasi');
  expect(state.selectedLocationId).toBe('kumasi');
  expect(state.locationResolved).toBe(true);
});

it('leaves a hand-picked town alone', async () => {
  useLocationStore.setState({ selectedLocationId: 'accra', townChoiceIsManual: true });
  getPerms.mockResolvedValueOnce({ granted: true, canAskAgain: true });
  getPosition.mockResolvedValueOnce({ coords: { latitude: 6.6885, longitude: -1.6244 } });

  await detectAndStoreDistrict();

  const state = useLocationStore.getState();
  expect(state.detectedDistrictId).toBe('kumasi-metropolitan'); // alerts still follow the fix
  expect(state.selectedLocationId).toBe('accra'); // weather does not
});

it('records a denied permission and closes the attempt without a district', async () => {
  getPerms.mockResolvedValueOnce({ granted: false, canAskAgain: false });

  await detectAndStoreDistrict();

  const state = useLocationStore.getState();
  expect(state.locationPermission).toBe('denied');
  expect(state.detectedDistrictId).toBeNull();
  expect(state.locationResolved).toBe(true);
  expect(getPosition).not.toHaveBeenCalled();
});

it('closes the attempt when granted but no fix is available', async () => {
  getPerms.mockResolvedValueOnce({ granted: true, canAskAgain: true });
  getPosition.mockRejectedValueOnce(new Error('no fix'));

  await detectAndStoreDistrict();

  const state = useLocationStore.getState();
  expect(state.locationPermission).toBe('granted');
  expect(state.detectedDistrictId).toBeNull();
  expect(state.locationResolved).toBe(true);
});

it('resolves to nothing when the fix is outside the served area', async () => {
  getPerms.mockResolvedValueOnce({ granted: true, canAskAgain: true });
  getPosition.mockResolvedValueOnce({ coords: { latitude: 6.5244, longitude: 3.3792 } }); // Lagos

  await detectAndStoreDistrict();

  const state = useLocationStore.getState();
  expect(state.detectedDistrictId).toBeNull();
  expect(state.locationResolved).toBe(true);
});
