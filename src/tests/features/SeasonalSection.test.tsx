import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SeasonalSection } from '../../features/forecasts/components/SeasonalSection';
import type { SeasonalOutlookSet } from '../../shared/domain/seasonalOutlook';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { seasonalPayload } from '../fixtures/seasonal';
import { createTestQueryClient } from '../testQueryClient';

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let client: QueryClient;

beforeEach(() => {
  client = createTestQueryClient();
  globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

function makeSet(overrides: Record<string, unknown> = {}): SeasonalOutlookSet {
  return {
    validFrom: null,
    validTo: null,
    pdfUrl: null,
    ...seasonalPayload(overrides),
  } as unknown as SeasonalOutlookSet;
}

type Overrides = { set?: SeasonalOutlookSet; onRetry?: () => void; locationId?: string };

function renderSection(overrides: Overrides = {}) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <SeasonalSection
            set={overrides.set ?? makeSet()}
            status="success"
            onRetry={overrides.onRetry ?? (() => {})}
            locationId={overrides.locationId ?? 'accra'}
          />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** The controls live in the drawer, which starts closed over the map. */
function renderWithControls(overrides: Overrides = {}) {
  const view = renderSection(overrides);
  fireEvent.press(view.getByLabelText('Expand map controls'));
  return view;
}

describe('SeasonalSection controls', () => {
  it('offers view, variable and season, with the seasons named from the data', () => {
    const { getByText, getByLabelText } = renderWithControls();

    expect(getByText('VIEW')).toBeTruthy();
    expect(getByText('VARIABLE')).toBeTruthy();
    expect(getByText('SEASON')).toBeTruthy();
    const seasons = getByLabelText('Season');
    for (const label of ['Nov to Jan', 'Dec to Feb', 'Jan to Mar']) {
      expect(seasons.findByProps({ accessibilityLabel: label })).toBeTruthy();
    }
  });

  it('has no district control, and says why', () => {
    const { queryByText, getByText } = renderWithControls();

    expect(queryByText('GEOGRAPHY')).toBeNull();
    expect(getByText('Shown by region. The seasonal forecast is too coarse for district detail.')).toBeTruthy();
  });

  it('opens on Probability when the data carries a split', () => {
    const { getByLabelText } = renderWithControls();

    expect(getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' }).props.accessibilityState.selected).toBe(true);
  });

  it('names the model, the baseline and the day the forecast was made', () => {
    const { getByText } = renderWithControls();

    expect(getByText(/ECMWF SEAS5 \(51 members\), adjusted to local climate · baseline ERA5 1995-2024/)).toBeTruthy();
    expect(getByText(/Forecast made 1 Oct 2026/)).toBeTruthy();
  });
});

describe("the reader's own town card", () => {
  it('shows the region, the badge and the plain sentence', () => {
    const { getByText } = renderWithControls();

    expect(getByText('Greater Accra')).toBeTruthy();
    expect(getByText('High confidence')).toBeTruthy();
    expect(getByText(/72% chance of a drier than normal season from Nov to Jan/)).toBeTruthy();
  });

  it('follows the season control', () => {
    const { getByLabelText, getByText } = renderWithControls();
    fireEvent.press(getByLabelText('Season').findByProps({ accessibilityLabel: 'Dec to Feb' }));

    expect(getByText('The forecasts for Greater Accra do not agree, so treat this season as normal.')).toBeTruthy();
  });

  it('notes the dry season in the legend when a region is in it', () => {
    const { getByText } = renderWithControls({ locationId: 'tamale' });

    expect(getByText(/Regions in their dry season show as No signal/)).toBeTruthy();
    expect(getByText(/This is the dry season in Northern/)).toBeTruthy();
  });
});

describe('a published forecast', () => {
  it('says who issued it', () => {
    const { getByText } = renderWithControls({ set: makeSet({ source: 'gmet', issuedBy: 'Ghana Meteorological Agency' }) });

    expect(getByText('Published seasonal forecast')).toBeTruthy();
    expect(getByText('Issued by Ghana Meteorological Agency')).toBeTruthy();
  });

  it('shows no notice when the map is the model', () => {
    const { queryByText } = renderWithControls();

    expect(queryByText('Published seasonal forecast')).toBeNull();
  });
});

/* The empty state replaces the map, never the drawer: the drawer holds the
   controls that might be the way out. */
describe('the empty states', () => {
  it('waits without a button while the outlook is being prepared', () => {
    const { getByText, queryByText } = renderWithControls({
      set: makeSet({ windows: [], unavailable: true, computing: true, fetchFailed: true }),
    });

    expect(getByText('Getting the outlook ready')).toBeTruthy();
    expect(queryByText('Try again')).toBeNull();
    expect(queryByText('The weather service did not answer')).toBeNull();
    // The drawer is still there.
    expect(getByText('VIEW')).toBeTruthy();
  });

  it('offers a retry when the fetch failed', () => {
    const onRetry = jest.fn();
    const { getByText } = renderWithControls({ set: makeSet({ windows: [], unavailable: true, fetchFailed: true }), onRetry });

    expect(getByText('The weather service did not answer')).toBeTruthy();
    fireEvent.press(getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
    expect(getByText('VARIABLE')).toBeTruthy();
  });

  it('says nothing has been computed when the store is empty', () => {
    const { getByText, queryByText } = renderWithControls({ set: makeSet({ windows: [], unavailable: true }) });

    expect(getByText('No seasonal outlook has been computed yet')).toBeTruthy();
    expect(queryByText('Try again')).toBeNull();
    expect(getByText('VIEW')).toBeTruthy();
  });
});
