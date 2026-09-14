import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FloodDroughtScreen } from '../../features/advisories/flood-drought/FloodDroughtScreen';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// react-native-safe-area-context needs explicit metrics in Jest — see
// HomeScreen.test.tsx for why.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function hazardBlock(band: string, score: number) {
  return {
    score,
    band,
    drivers: [],
    advisories: band === 'normal' ? [] : ['Clear field drains before the next rainfall.'],
    overridden: false,
    source: 'open-meteo',
  };
}

function region(name: string, floodBand: string, floodScore: number) {
  return {
    region: name,
    agroZone: 'Guinea Savannah',
    centroid: [9, -1],
    riverPoint: [9, -1],
    riverine: true,
    flood: hazardBlock(floodBand, floodScore),
    drought: { ...hazardBlock('normal', 8), spi: 0.4, spiClass: 'near normal' },
    dominant: 'flood',
    discharge: { median: 500, p90: 3000, p95: 7000, forecastFrom: null },
  };
}

const SUMMARY = {
  success: true,
  data: {
    regions: [region('Eastern', 'severe', 69), region('Volta', 'moderate', 52), region('Ahafo', 'normal', 12)],
    national: {
      regionCount: 16,
      floodBands: {},
      droughtBands: {},
      floodElevated: 6,
      droughtElevated: 0,
      highestFlood: { region: 'Eastern', score: 69, band: 'severe', overridden: false },
      highestDrought: { region: 'Greater Accra', score: 27, band: 'watch', overridden: false },
      overriddenCount: 0,
    },
    unavailable: false,
    computedAt: '2026-08-20T06:00:00.000Z',
    stale: false,
    baseline: 'ERA5 1995-2024',
    hasClimatology: true,
    sources: [{ id: 'open-meteo', label: 'Open-Meteo' }],
  },
};

function respondWith(body: unknown, ok = true, status = 200) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response),
  ) as unknown as typeof fetch;
}

/**
 * A client of its own, with retries off.
 *
 * The shared app client sets `retry: 2`, which is right on a phone and wrong
 * in Jest: a rejected fetch then schedules two backoff timers that outlive the
 * test and hang the worker.
 */
let client: QueryClient;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <FloodDroughtScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  // The offline cache outlives the QueryClient — it is AsyncStorage, not
  // memory. Without this, a later test inherits an earlier one's snapshot and
  // the read-through fallback (correctly) hides the error state.
  await AsyncStorage.clear();
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

describe('FloodDroughtScreen', () => {
  it('ranks the regions needing attention worst first', async () => {
    respondWith(SUMMARY);
    renderScreen();
    await screen.findByText('Needs attention');

    /* Asserted through the rows' accessibility labels rather than their text:
       a region name also appears in the stat tiles, and the label is the thing
       a screen-reader user actually receives. */
    const rowLabels = screen
      .getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('Open region details'));

    /* Only the elevated regions are listed up front; Ahafo is normal and lives
       behind the "Calmer regions" disclosure. */
    expect(rowLabels.map((label) => label.split(',')[0])).toEqual(['Eastern', 'Volta']);
    expect(rowLabels[0]).toContain('Severe');
  });

  /* Thirteen rows reading "normal" is reassurance, not information — but it has
     to stay reachable. */
  it('folds the calm regions away but keeps them reachable', async () => {
    respondWith(SUMMARY);
    renderScreen();
    await screen.findByText('Calmer regions');

    expect(screen.queryByText('Ahafo')).toBeNull();

    fireEvent.press(screen.getByLabelText(/Show the 1 calmer regions/i));
    expect(await screen.findByText('Ahafo')).toBeTruthy();
  });

  /* The question that opened the app. With nothing saved this must be a prompt,
     not an absent section. */
  it('prompts for saved districts when the reader has none', async () => {
    respondWith(SUMMARY);
    renderScreen();

    await screen.findByText('Your area');
    expect(screen.getByText(/Save your districts/i)).toBeTruthy();
  });

  /* Counts, never an average — a mean across sixteen regions is exactly the
     statistic that hides the one region in trouble. */
  it('summarises the country as a count of regions above normal', async () => {
    respondWith(SUMMARY);
    renderScreen();

    await screen.findByText('2 of 3');
  });

  /* The backend answers 200 with `unavailable` rather than an error. If that
     ever renders as an empty list instead of an explanation, a farmer sees a
     blank screen during exactly the outage they most need telling about. */
  it('explains itself when no reading is available', async () => {
    respondWith({ success: true, data: { regions: [], national: null, unavailable: true } });
    renderScreen();

    await screen.findByText(/not available right now/i);
  });

  it('offers a retry when the server cannot be reached and nothing is cached', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Network request failed')),
    ) as unknown as typeof fetch;
    renderScreen();

    await screen.findByText('Retry');
  });

  /* The reason a farmer can open this screen without signal. A successful load
     is written to AsyncStorage; a later unreachable server renders that rather
     than an error, and says how old it is. */
  it('falls back to the last saved reading when the server is unreachable', async () => {
    respondWith(SUMMARY);
    const first = renderScreen();
    await screen.findByText('Needs attention');
    first.unmount();

    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Network request failed')),
    ) as unknown as typeof fetch;
    renderScreen();

    await screen.findByText('Needs attention');
    expect(screen.getByText(/Showing readings saved/i)).toBeTruthy();
  });
});
