import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DiagnoseScreen } from '../../features/farm-tools/diagnose/DiagnoseScreen';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// The camera and picker are native; the diagnose flow must still be drivable
// without them, since the photo is optional.
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: false }, jest.fn(async () => ({ granted: false }))],
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: false })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri: string) => ({ uri })),
  SaveFormat: { JPEG: 'jpeg' },
}));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <DiagnoseScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Fills in the one required field. */
function describeSymptoms(text = 'Small holes in the leaves') {
  fireEvent.changeText(screen.getByLabelText('Describe the crop symptoms'), text);
}

beforeEach(() => {
  queryClient.clear();
  jest.clearAllMocks();
});

describe('DiagnoseScreen — the form', () => {
  it('asks the three questions it needs answered', () => {
    renderScreen();

    expect(screen.getByText('Which crop?')).toBeTruthy();
    expect(screen.getByText('What stage is it at?')).toBeTruthy();
    expect(screen.getByText('What do you see?')).toBeTruthy();
  });

  /* A disabled button with no explanation is a dead end — the farmer cannot
     tell whether the app is broken or they have missed something. */
  it('says why it cannot continue while the description is empty', () => {
    renderScreen();

    expect(screen.getByText('Describe what you see to continue')).toBeTruthy();

    describeSymptoms();
    expect(screen.queryByText('Describe what you see to continue')).toBeNull();
  });

  it('starts on a sensible crop and stage rather than nothing', () => {
    renderScreen();

    expect(screen.getByLabelText('Maize').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Vegetative').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('moves the selection when another crop is chosen', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Cassava'));

    expect(screen.getByLabelText('Cassava').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Maize').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('offers the photo as optional, and does not demand a choice up front', () => {
    renderScreen();

    expect(screen.getByLabelText('Add a photo of the crop, optional')).toBeTruthy();
    // Camera vs gallery is asked only once the farmer has said yes to a photo.
    expect(screen.queryByText('Take a photo')).toBeNull();
    expect(screen.queryByText('Choose from gallery')).toBeNull();
  });

  it('asks camera or gallery only after the dropzone is tapped', async () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Add a photo of the crop, optional'));

    expect(await screen.findByText('Take a photo')).toBeTruthy();
    expect(screen.getByText('Choose from gallery')).toBeTruthy();
  });
});

describe('DiagnoseScreen — the answer', () => {
  /* The whole point of the redesign: submitting must visibly go somewhere.
     The result used to render below the form, so on a phone the screen did
     not appear to change at all. */
  it('replaces the form with the result instead of appending it below', async () => {
    renderScreen();
    describeSymptoms();

    fireEvent.press(screen.getByText('Get decision support'));

    expect(await screen.findByText('Most likely')).toBeTruthy();
    expect(screen.queryByText('Which crop?')).toBeNull();
    expect(screen.queryByText('Get decision support')).toBeNull();
  });

  it('numbers the immediate actions so a farmer can keep their place', async () => {
    renderScreen();
    describeSymptoms();
    fireEvent.press(screen.getByText('Get decision support'));

    await screen.findByText('Do this now');
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  /* There is no prop to hide this, and there should never be one. */
  it('always shows the disclaimer', async () => {
    renderScreen();
    describeSymptoms();
    fireEvent.press(screen.getByText('Get decision support'));

    expect(await screen.findByText(/decision support, not a guaranteed diagnosis/)).toBeTruthy();
  });

  it('goes back to a blank form, keeping the crop but clearing the description', async () => {
    renderScreen();
    describeSymptoms('Small holes in the leaves');
    fireEvent.press(screen.getByText('Get decision support'));

    fireEvent.press(await screen.findByText('Diagnose another crop'));

    expect(await screen.findByText('Which crop?')).toBeTruthy();
    expect(screen.getByLabelText('Describe the crop symptoms').props.value).toBe('');
    // The crop is a property of the farmer's field, not of one question.
    expect(screen.getByLabelText('Maize').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('Describe what you see to continue')).toBeTruthy();
  });
});
