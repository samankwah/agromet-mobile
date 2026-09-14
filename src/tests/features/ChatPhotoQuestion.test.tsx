import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ChatScreen } from '../../features/chat/ChatScreen';
import { askAboutPhoto } from '../../shared/api/imageQuestionService';
import { NetworkError } from '../../shared/api/http';
import { useLocationStore } from '../../shared/state/locationStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

/**
 * Asking about a photo, and what happens when that fails.
 *
 * Its own file because the mocks are its own: the photo path runs through the
 * image picker, a compressor and a different endpoint from every other test in
 * the chat suite, and mounting all of that for the twenty tests that never take
 * a photo would slow them down for nothing.
 *
 * This path had no test at all, which is how both of its bugs survived. A
 * failed photo question showed a dimmed bubble with no reason on it, because
 * the screen read its error text off the *text* mutation; and retrying one
 * re-sent it to `/api/chat`, a text endpoint, without the photo.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///leaf.jpg' }] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///leaf.jpg' }] })),
}));

jest.mock('../../shared/utils/compressImage', () => ({
  compressImage: jest.fn(async (uri: string) => uri),
}));

// Mocked at the service rather than at `fetch`, so the test says which endpoint
// was asked. That is the whole point of the retry case below.
jest.mock('../../shared/api/imageQuestionService', () => ({
  askAboutPhoto: jest.fn(),
}));

jest.setTimeout(30_000);

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

const ask = askAboutPhoto as jest.MockedFunction<typeof askAboutPhoto>;

let client: QueryClient;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <ChatScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

async function attachAPhoto() {
  fireEvent.press(screen.getByLabelText('Attach'));
  fireEvent.press(screen.getByLabelText('Camera. Photograph a crop and ask about it'));
  await screen.findByText('What is wrong with this crop?');
}

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mockFetch.mockReset();
  ask.mockReset();
  await AsyncStorage.clear();
  useLocationStore.setState({ selectedLocationId: 'tamale', hasHydrated: true });
});

afterEach(() => {
  client.clear();
});

describe('asking about a photo', () => {
  it('puts the answer in the transcript like any other reply', async () => {
    ask.mockResolvedValue('This looks like early blight. Remove the affected leaves.');
    renderScreen();

    await attachAPhoto();

    expect(await screen.findByText('This looks like early blight. Remove the affected leaves.')).toBeTruthy();
  });

  it('tells the assistant where the farmer is', async () => {
    ask.mockResolvedValue('Looks healthy.');
    renderScreen();

    await attachAPhoto();
    await screen.findByText('Looks healthy.');

    expect(ask).toHaveBeenCalledWith('file:///leaf.jpg', undefined, 'Northern');
  });

  it('says why it failed, on the question that failed', async () => {
    ask.mockRejectedValue(new NetworkError('Could not reach the AgroMet server. Check your connection and try again.'));
    renderScreen();

    await attachAPhoto();

    expect(await screen.findByText('Could not reach the AgroMet server. Check your connection and try again.')).toBeTruthy();
  });

  it('retries it as a photo, not as text', async () => {
    ask.mockRejectedValueOnce(new NetworkError('Could not reach the AgroMet server. Check your connection and try again.'));
    ask.mockResolvedValueOnce('This looks like early blight.');
    renderScreen();

    await attachAPhoto();
    await screen.findByText('Could not reach the AgroMet server. Check your connection and try again.');

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('This looks like early blight.')).toBeTruthy();
    expect(ask).toHaveBeenCalledTimes(2);
    // The picture went back to the endpoint that can read it. Sending this
    // through /api/chat was the bug: a text endpoint being asked what is wrong
    // with a crop it never saw.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not keep a failed photo question for tomorrow', async () => {
    ask.mockRejectedValue(new NetworkError('Could not reach the AgroMet server. Check your connection and try again.'));
    renderScreen();

    await attachAPhoto();
    await screen.findByText('Could not reach the AgroMet server. Check your connection and try again.');

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('agromet:cache:chat-transcript');
      expect(stored ? JSON.parse(stored).value : []).toEqual([]);
    });
  });
});
