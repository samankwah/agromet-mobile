import { DEFAULT_LOCATION_ID } from '../../shared/data/mockWeather';
import { effectiveDistrictIds, useLocationStore } from '../../shared/state/locationStore';

/**
 * `locationStore` carries two independent selections — the Home weather town
 * and the alert districts — plus the geolocation state that seeds both. These
 * check the seeding rules: a detected district stands in only until the farmer
 * saves their own, and a hand-picked town is never moved by a later fix.
 */

const INITIAL = useLocationStore.getState();

beforeEach(() => {
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

describe('effectiveDistrictIds', () => {
  it('uses the saved list when there is one', () => {
    expect(effectiveDistrictIds(['tamale-metropolitan'], 'accra-metropolitan')).toEqual(['tamale-metropolitan']);
  });

  it('falls back to the detected district when nothing is saved', () => {
    expect(effectiveDistrictIds([], 'accra-metropolitan')).toEqual(['accra-metropolitan']);
  });

  it('is empty when neither is set, so the pipeline reads it as every region', () => {
    expect(effectiveDistrictIds([], null)).toEqual([]);
  });
});

describe('town selection vs geolocation', () => {
  it('marks the town manual when the carousel sets it', () => {
    useLocationStore.getState().setSelectedLocationId('kumasi');
    expect(useLocationStore.getState().selectedLocationId).toBe('kumasi');
    expect(useLocationStore.getState().townChoiceIsManual).toBe(true);
  });

  it('does not mark the town manual when geolocation sets it', () => {
    useLocationStore.getState().setDetectedTown('bolgatanga');
    expect(useLocationStore.getState().selectedLocationId).toBe('bolgatanga');
    expect(useLocationStore.getState().townChoiceIsManual).toBe(false);
  });
});

describe('detection lifecycle', () => {
  it('records a detected location and can be marked resolved', () => {
    useLocationStore.getState().setDetectedLocation({ districtId: 'ho-municipal', townId: 'ho' });
    useLocationStore.getState().markLocationResolved();

    const state = useLocationStore.getState();
    expect(state.detectedDistrictId).toBe('ho-municipal');
    expect(state.detectedTownId).toBe('ho');
    expect(state.locationResolved).toBe(true);
  });

  it('clearLocationDetection wipes the detection so it runs again', () => {
    useLocationStore.setState({
      detectedDistrictId: 'ho-municipal',
      detectedTownId: 'ho',
      locationResolved: true,
    });

    useLocationStore.getState().clearLocationDetection();

    const state = useLocationStore.getState();
    expect(state.detectedDistrictId).toBeNull();
    expect(state.detectedTownId).toBeNull();
    expect(state.locationResolved).toBe(false);
  });
});
