import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AboutScreen } from '../../features/about/AboutScreen';
import { LegalScreen } from '../../features/legal/LegalScreen';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const DOCUMENT = {
  success: true,
  slug: 'terms',
  title: 'Terms of Service',
  summary: 'Please read these terms carefully before using AgroMet.',
  updated: 'April 2026',
  sections: [
    { title: 'Acceptance of Terms', body: 'By using AgroMet you agree to these terms.' },
    { title: 'User Responsibilities', body: 'You agree to:', items: ['Keep your account secure'] },
  ],
};

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function renderScreen(node: React.ReactElement, client = queryClient) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>{node}</QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/**
 * The shared client retries twice with backoff, so a failing query stays
 * `pending` far longer than a test should wait. Testing the error path means
 * turning that off — the retry policy itself is queryClient.ts's business.
 */
function noRetryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  queryClient.clear();
  mockFetch.mockReset();
});

describe('LegalScreen', () => {
  it('renders the document the backend published, sections and bullets alike', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => DOCUMENT,
      text: async () => JSON.stringify(DOCUMENT),
    });

    renderScreen(<LegalScreen slug="terms" />);

    expect(await screen.findByText('Acceptance of Terms')).toBeTruthy();
    expect(screen.getByText('User Responsibilities')).toBeTruthy();
    expect(screen.getByText('Keep your account secure')).toBeTruthy();
    expect(screen.getByText('Last updated April 2026')).toBeTruthy();
  });

  /* The reason this copy is fetched rather than shipped: one source of truth.
     The reason it is cached: terms only readable online are unreadable in a
     field. This asserts the failure path a farmer with no signal actually hits
     on a first visit — an error they can retry, never a blank page. */
  it('reports an unreachable server rather than showing an empty document', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    renderScreen(<LegalScreen slug="privacy" />, noRetryClient());

    // AsyncStateView's error state, with its retry — never a blank page, and
    // never an empty document that would then be written to the offline cache.
    expect(await screen.findByText("Couldn't load this")).toBeTruthy();
    expect(screen.queryByText('Last updated')).toBeNull();
  });
});

describe('AboutScreen', () => {
  it('names the publisher and carries the caution about forecasts', () => {
    renderScreen(<AboutScreen />);

    expect(screen.getByText('What this app is for')).toBeTruthy();
    expect(screen.getByText(/best estimate, not a promise/)).toBeTruthy();
    expect(screen.getByText('Ghana Meteorological Agency')).toBeTruthy();
  });

  it('falls back to a readable version rather than a blank row', () => {
    // jest.setup.js mocks expoConfig as {}, so this is the path any build
    // stripped of its config would take too.
    renderScreen(<AboutScreen />);

    expect(screen.getByText('in development')).toBeTruthy();
  });
});
