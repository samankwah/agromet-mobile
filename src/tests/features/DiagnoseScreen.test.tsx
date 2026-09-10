import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { DiagnoseScreen } from '../../features/farm-tools/diagnose/DiagnoseScreen';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// The screen renames the navigator header per step and intercepts "back" to
// mean "previous step", so it needs a navigation object as well as the router.
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useNavigation: () => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) }),
}));

// The camera and picker are native. These mocks GRANT and return a photo,
// which is the path that matters now: the provider classifies the image, so a
// run that never produces one exercises nothing.
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn(async () => ({ granted: true }))],
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///leaf.jpg' }] })),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri: string) => ({ uri })),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-file-system', () => ({
  File: class {
    async base64() {
      return 'aGVsbG8=';
    }
  },
}));

/** One diagnosis as the backend actually shapes it, so the adapter is
 * exercised rather than a convenient invention. */
function diagnosisPayload(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ok',
    isAvailable: true,
    plant: 'maize',
    disease: 'Maize streak virus',
    remedy: 'Prevention: Control insect vectors.',
    treatmentParts: {
      immediate: ['Remove and burn infected plants', 'Apply a registered foliar spray'],
      prevention: ['Use resistant seed'],
    },
    confidence: 0.82,
    source: 'kindwise',
    evidence: ['yellow streaks'],
    notes: [],
    disclaimer: 'This is decision support, not a guaranteed diagnosis. Confirm with an extension officer.',
    ...overrides,
  };
}

function stubDiagnosis(body: unknown = diagnosisPayload()) {
  const mock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

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

/** Attaches the one required input. The photo is what the provider reads, so
 * nothing can be submitted without it. One press, no sheet — see the
 * regression test below for why that matters. */
async function attachPhoto() {
  fireEvent.press(screen.getByLabelText('Choose a crop photo from your gallery'));
  await screen.findByLabelText('Remove photo');
}

/** Step one asks for the photo; the crop, stage and description are step two. */
async function goToDetails() {
  fireEvent.press(screen.getByText('Next'));
  await screen.findByText('Which crop?');
}

async function attachPhotoAndContinue() {
  await attachPhoto();
  await goToDetails();
}

function describeSymptoms(text = 'Small holes in the leaves') {
  fireEvent.changeText(screen.getByLabelText('Describe the crop symptoms'), text);
}

beforeEach(() => {
  queryClient.clear();
  jest.clearAllMocks();
  stubDiagnosis();
});

describe('DiagnoseScreen — attaching the photo', () => {
  /*
   * The regression test for the bug that made this screen unusable on iPhone.
   *
   * The gallery button used to live in a bottom-sheet `Modal`, and tapping it
   * dismissed the sheet and launched the picker in the same breath. On iOS
   * dismissing a Modal only *schedules* an animated UIViewController
   * dismissal, so the picker was presented into a view controller that was
   * being torn down: no picker, no photo, no error. The invariant that makes
   * that impossible is that the picker is reachable in zero taps, so there is
   * never a modal in flight when it is presented.
   */
  it('launches the picker straight from the card, with no sheet to dismiss first', async () => {
    renderScreen();

    expect(screen.queryByLabelText('Close photo options')).toBeNull();

    fireEvent.press(screen.getByLabelText('Choose a crop photo from your gallery'));

    // Awaited first: the handler asks for permission before it launches, so
    // the call has not happened yet at the moment of the press.
    expect(await screen.findByLabelText('Remove photo')).toBeTruthy();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  });

  it('offers the camera in zero taps too', () => {
    renderScreen();

    expect(screen.getByLabelText('Take a photo of the crop')).toBeTruthy();
  });

  /* A failure part-way through used to reset the spinner and put the empty
     frame back with nothing said, which looks exactly like the app ignoring
     the tap. */
  it('says so when the photo cannot be prepared', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    renderScreen();

    fireEvent.press(screen.getByLabelText('Choose a crop photo from your gallery'));

    expect(await screen.findByText('Could not attach that photo. Try again, or take a new one.')).toBeTruthy();
    // Still blocked, and still saying why.
    expect(screen.getByText('Add a photo to continue')).toBeTruthy();
  });

  it('says so when photo access is refused', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    renderScreen();

    fireEvent.press(screen.getByLabelText('Choose a crop photo from your gallery'));

    expect(await screen.findByText(/Photo library access is off/)).toBeTruthy();
  });

  it('stays quiet when the farmer cancels the picker', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: [] });
    renderScreen();

    fireEvent.press(screen.getByLabelText('Choose a crop photo from your gallery'));

    // A cancel is a decision, not a failure, and must leave no warning behind.
    expect(await screen.findByLabelText('Take a photo of the crop')).toBeTruthy();
    expect(screen.queryByText('Could not attach that photo. Try again, or take a new one.')).toBeNull();
  });
});

describe('DiagnoseScreen — the two steps', () => {
  /* The screen was one page and did not fit one. The photo is the only
     required input, so it gets a step; everything after it is refinement. */
  it('asks for the photo first and nothing else', () => {
    renderScreen();

    expect(screen.queryByText('Which crop?')).toBeNull();
    expect(screen.queryByText('What stage is it at?')).toBeNull();
    expect(screen.queryByText('What do you see?')).toBeNull();
  });

  /* The navigator header carries the title. A second copy in the content is
     the regression this replaced. */
  it('does not repeat the screen title in the content', () => {
    renderScreen();

    expect(screen.queryByText('Diagnose a crop')).toBeNull();
  });

  /* A disabled button with no explanation is a dead end — the farmer cannot
     tell whether the app is broken or they have missed something. */
  it('says why it cannot continue until there is a photo', async () => {
    renderScreen();

    expect(screen.getByText('Add a photo to continue')).toBeTruthy();

    await attachPhoto();
    expect(screen.queryByText('Add a photo to continue')).toBeNull();
  });

  /* Typing a description used to be enough to submit, back when the answer was
     matched against canned text. The provider reads the image, so prose alone
     has nothing to ask — and now it cannot even be typed until there is one. */
  it('will not move past the photo step without a photo', () => {
    renderScreen();

    expect(screen.getByText('Add a photo to continue')).toBeTruthy();
    expect(screen.queryByLabelText('Describe the crop symptoms')).toBeNull();
  });

  it('asks the three remaining questions on the second step', async () => {
    renderScreen();
    await attachPhotoAndContinue();

    expect(screen.getByText('Which crop?')).toBeTruthy();
    expect(screen.getByText('What stage is it at?')).toBeTruthy();
    expect(screen.getByText('What do you see?')).toBeTruthy();
  });

  it('goes back to the photo step with the photo still attached', async () => {
    renderScreen();
    await attachPhotoAndContinue();

    fireEvent.press(screen.getByText('Back'));

    expect(await screen.findByLabelText('Remove photo')).toBeTruthy();
    expect(screen.queryByText('Add a photo to continue')).toBeNull();
  });

  it('starts on a sensible crop and stage rather than nothing', async () => {
    renderScreen();
    await attachPhotoAndContinue();

    expect(screen.getByLabelText('Maize').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Vegetative').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('moves the selection when another crop is chosen', async () => {
    renderScreen();
    await attachPhotoAndContinue();

    fireEvent.press(screen.getByLabelText('Cassava'));

    expect(screen.getByLabelText('Cassava').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Maize').props.accessibilityState).toMatchObject({ selected: false });
  });
});

describe('DiagnoseScreen — the answer', () => {
  /* The whole point of the redesign: submitting must visibly go somewhere.
     The result used to render below the form, so on a phone the screen did
     not appear to change at all. */
  it('replaces the form with the result instead of appending it below', async () => {
    renderScreen();
    await attachPhotoAndContinue();

    fireEvent.press(screen.getByText('Get decision support'));

    expect(await screen.findByText('Most likely')).toBeTruthy();
    expect(screen.queryByText('Which crop?')).toBeNull();
    expect(screen.queryByText('Get decision support')).toBeNull();
  });

  it('numbers the immediate actions so a farmer can keep their place', async () => {
    renderScreen();
    await attachPhotoAndContinue();
    fireEvent.press(screen.getByText('Get decision support'));

    await screen.findByText('Do this now');
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  /* There is no prop to hide this, and there should never be one. */
  it('always shows the disclaimer', async () => {
    renderScreen();
    await attachPhotoAndContinue();
    fireEvent.press(screen.getByText('Get decision support'));

    expect(await screen.findByText(/decision support, not a guaranteed diagnosis/)).toBeTruthy();
  });

  it('starts over at the photo, keeping the crop but clearing the rest', async () => {
    renderScreen();
    await attachPhotoAndContinue();
    fireEvent.press(screen.getByLabelText('Cassava'));
    describeSymptoms('Small holes in the leaves');
    fireEvent.press(screen.getByText('Get decision support'));

    fireEvent.press(await screen.findByText('Diagnose another crop'));

    // Back to step one: the photo went with the last answer, so it is the
    // first thing asked for again.
    expect(await screen.findByText('Add a photo to continue')).toBeTruthy();

    await attachPhotoAndContinue();
    expect(screen.getByLabelText('Describe the crop symptoms').props.value).toBe('');
    // The crop is a property of the farmer's field, not of one question.
    expect(screen.getByLabelText('Cassava').props.accessibilityState).toMatchObject({ selected: true });
  });
});
