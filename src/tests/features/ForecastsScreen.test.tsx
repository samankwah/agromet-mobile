import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ForecastsScreen } from '../../features/forecasts/ForecastsScreen';
import { createTestQueryClient } from '../testQueryClient';
import { useLocationStore } from '../../shared/state/locationStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { seasonalPayload } from '../fixtures/seasonal';

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * A client of its own, with retries off, and a rejecting fetch: none of the
 * tests in this file assert on loaded data, only on structure/navigation, so
 * a fast, always-failing fetch is enough — and avoids the shared app client's
 * `retry: 2` scheduling backoff timers that outlive the test.
 */
let client: QueryClient;

beforeEach(() => {
  client = createTestQueryClient();
  globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

/** A smoke test — confirms the screen mounts without throwing in the same
 * provider order as the real app/_layout.tsx, and that all four forecast
 * timescales are reachable from the segmented control. */
describe('ForecastsScreen', () => {
  it('renders all four forecast timescales', () => {
    const { getByText } = render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <ThemeProvider>
          <QueryClientProvider client={client}>
            <ForecastsScreen />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(getByText('Forecasts')).toBeTruthy();
    // Deterministic timescales...
    expect(getByText('Daily')).toBeTruthy();
    expect(getByText('Weekly')).toBeTruthy();
    // ...then the probabilistic ones.
    expect(getByText('Subseasonal')).toBeTruthy();
    expect(getByText('Seasonal')).toBeTruthy();
  });

  /**
   * The deep-link contract Home's tiles depend on.
   *
   * This screen is a tab, so it stays mounted after its first visit. Reading the
   * requested segment once at mount is what left the Forecast tile showing
   * whatever the Outlook tile had last opened, which is the bug these cover.
   */
  describe('requested segment', () => {
    function renderScreen(requestedSegment?: string) {
      return render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <ThemeProvider>
            <QueryClientProvider client={client}>
              <ForecastsScreen requestedSegment={requestedSegment} />
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    }

    function selected(): string | undefined {
      return screen.getAllByRole('tab').find((tab) => tab.props.accessibilityState?.selected)?.props.accessibilityLabel;
    }

    it('opens on the timescale it was asked for', () => {
      renderScreen('weekly');

      expect(selected()).toBe('Weekly');
    });

    /* The Seasonal segment draws the real outlook: the same map-and-drawer
       layout as Subseasonal, fed by /api/outlook/seasonal. */
    it('draws the seasonal outlook, with its season control and the town card', async () => {
      const previous = useLocationStore.getState();
      useLocationStore.setState({ selectedLocationId: 'accra', hasHydrated: true });
      globalThis.fetch = jest.fn((url: string) =>
        String(url).includes('/api/outlook/seasonal')
          ? Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: seasonalPayload() }) })
          : Promise.reject(new TypeError('Network request failed')),
      ) as unknown as typeof fetch;

      try {
        renderScreen('seasonal');

        expect(selected()).toBe('Seasonal');
        expect(await screen.findByText('SEASON')).toBeTruthy();
        expect(screen.getByText(/60% chance the rainfall in Greater Accra is more than usual, about 420 mm/)).toBeTruthy();
        expect(screen.queryByText('Seasonal outlook coming soon')).toBeNull();
      } finally {
        useLocationStore.setState({ selectedLocationId: previous.selectedLocationId, hasHydrated: previous.hasHydrated });
      }
    });

    it('opens on Daily when asked for nothing', () => {
      renderScreen();

      expect(selected()).toBe('Daily');
    });

    it('follows a later request on a screen that is already mounted', () => {
      const { rerender } = renderScreen('weekly');

      rerender(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <ThemeProvider>
            <QueryClientProvider client={client}>
              <ForecastsScreen requestedSegment="daily" />
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>,
      );

      expect(selected()).toBe('Daily');
    });

    it('leaves the reader where they are when the request is cleared', () => {
      // What a tab-bar press looks like from here: the route file has already
      // cleared the param, so nothing is being asked for and the segment the
      // reader chose by hand must survive.
      const { rerender } = renderScreen('daily');

      fireEvent.press(screen.getByRole('tab', { name: 'Weekly' }));
      expect(selected()).toBe('Weekly');

      rerender(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
          <ThemeProvider>
            <QueryClientProvider client={client}>
              <ForecastsScreen requestedSegment="" />
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>,
      );

      expect(selected()).toBe('Weekly');
    });
  });
});
