import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SeasonalSection } from '../../features/forecasts/components/SeasonalSection';
import { MapLibreChoropleth } from '../../shared/ui/MapLibreChoropleth';
import type { SeasonalOutlookSet } from '../../shared/domain/seasonalOutlook';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { seasonalPayload } from '../fixtures/seasonal';
import { createTestQueryClient } from '../testQueryClient';

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() } }));

let client: QueryClient;

beforeEach(() => {
  mockPush.mockClear();
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

/* Picked by the sheet's menu item, not by text: the All Variables table carries
   the same labels. */
function chooseVariable(view: ReturnType<typeof render>, label: string) {
  fireEvent.press(view.getByLabelText(/^VARIABLE: /));
  fireEvent.press(view.getByRole('menuitem', { name: label }));
}

function chooseSeason(view: ReturnType<typeof render>, label: string) {
  fireEvent.press(view.getByLabelText(/^SEASON: /));
  fireEvent.press(view.getByRole('menuitem', { name: label }));
}

describe('SeasonalSection controls', () => {
  it('offers Probability and Deterministic, never Average', () => {
    const { getByLabelText, queryByText } = renderWithControls();
    const views = getByLabelText('Forecast view');

    expect(views.findByProps({ accessibilityLabel: 'Probability' })).toBeTruthy();
    expect(views.findByProps({ accessibilityLabel: 'Deterministic' })).toBeTruthy();
    expect(queryByText('Average')).toBeNull();
  });

  it('opens on All Variables and All Seasons', () => {
    const view = renderWithControls();

    expect(view.getByLabelText('VARIABLE: All Variables')).toBeTruthy();
    expect(view.getByLabelText('SEASON: All Seasons')).toBeTruthy();
    expect(view.getByText(/The map shows Rainfall Total \(mm\)/)).toBeTruthy();
  });

  it('lists the seven variables exactly as named', () => {
    const view = renderWithControls();
    fireEvent.press(view.getByLabelText('VARIABLE: All Variables'));

    for (const label of [
      'Onset Date',
      'Early-Season Dry Spell',
      'Late-Season Dry Spell',
      'Cessation Date',
      'Rainfall Total (mm)',
      'Number of Rainy Days (days)',
      'Temperature (°C)',
    ]) {
      expect(view.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  it('offers All Seasons and the three rainy seasons', () => {
    const view = renderWithControls();
    fireEvent.press(view.getByLabelText('SEASON: All Seasons'));

    for (const label of ['Southern Major Season', 'Southern Minor Season', 'Northern Single Season']) {
      expect(view.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  it('swaps the season list for MAM, MJJ, JAS and SON on rainfall totals', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Rainfall Total (mm)');

    const windows = view.getByLabelText('Three-month window');
    for (const label of ['MAM', 'MJJ', 'JAS', 'SON']) {
      expect(windows.findByProps({ accessibilityLabel: label })).toBeTruthy();
    }
    expect(view.queryByLabelText(/^SEASON: /)).toBeNull();
    expect(view.getByText('March to May 2027, all regions.')).toBeTruthy();
  });

  it('has no district control, and points to the regions instead', () => {
    const { queryByText, getByText } = renderWithControls();

    expect(queryByText('GEOGRAPHY')).toBeNull();
    expect(getByText(/Tap a region for its advice\./)).toBeTruthy();
  });

  it('opens on Probability when the data carries a split', () => {
    const { getByLabelText } = renderWithControls();

    expect(getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' }).props.accessibilityState.selected).toBe(true);
  });

  it('names the model and the day the forecast was made, in one line', () => {
    const { getByText, queryByText } = renderWithControls();

    expect(getByText(/^ECMWF SEAS5 · made 1 Oct 2026\./)).toBeTruthy();
    // The method notes moved to the advisory page.
    expect(queryByText(/A guide to the season/)).toBeNull();
  });
});

describe('a season beyond the model reach', () => {
  it('says the map is the normal and when the forecast will be ready', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');
    expect(view.queryByText(/Normal, not a forecast\./)).toBeNull();

    chooseSeason(view, 'Southern Minor Season');

    expect(view.getByText(/The forecast for this season will be ready from May 2027\./)).toBeTruthy();
    // The banner says when; the card says what usually happens, once.
    expect(view.getByText(/^In most years the start of the rains in Greater Accra is/)).toBeTruthy();
    expect(view.queryByText(/The forecast for the Southern Minor Season will be ready/)).toBeNull();
  });

  it('says why Probability shows the normal instead of chances', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');
    chooseSeason(view, 'Southern Minor Season');
    fireEvent.press(view.getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' }));

    expect(view.getByText(/Chances are worked out once the season is in the forecast, from May 2027/)).toBeTruthy();
  });
});

describe('All Variables', () => {
  it("lists the season's figures for the reader's town, and the rain for the chosen months", () => {
    const view = renderWithControls();

    for (const label of ['Rains start', 'Early dry spell', 'Late dry spell', 'Rains end', 'Rainfall, Mar to May']) {
      expect(view.getByText(label)).toBeTruthy();
    }
    expect(view.getByText('420 mm')).toBeTruthy();
    // No month by month table and no starred footnote in the drawer any more.
    expect(view.queryByText(/Normal \(1995 to 2024\), not a forecast/)).toBeNull();
  });

  it('opens the advice for a figure, and the full advisory', () => {
    const view = renderWithControls();

    fireEvent.press(view.getByText('Rains end'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/seasonal/[region]/[variable]',
      params: { region: 'Greater Accra', season: 'southern-major', window: 'MAM', variable: 'cessation' },
    });

    fireEvent.press(view.getByText('Seasonal advisory'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/seasonal/[region]',
      params: { region: 'Greater Accra', season: 'southern-major', window: 'MAM' },
    });
  });
});

describe('a tap on the map', () => {
  it("opens that region's full seasonal advisory, never a panel in the drawer", () => {
    const view = renderSection();
    view.UNSAFE_getByType(MapLibreChoropleth).props.onSelect({ region: 'Upper East' });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/seasonal/[region]', params: { region: 'Upper East', season: 'northern' } });
  });
});

describe("the reader's own town card", () => {
  it('shows the town, the badge and the plain sentence', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');
    const { getByText } = view;

    expect(getByText('Accra, Greater Accra')).toBeTruthy();
    expect(getByText('High confidence')).toBeTruthy();
    expect(getByText(/72% chance the start of the rains in Greater Accra is earlier than usual, around Week 2 of March/)).toBeTruthy();
  });

  it('shows only the chosen condition, with its advice and the full advisory', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');

    // Nothing about the other figures.
    expect(view.queryByText('Early dry spell')).toBeNull();
    expect(view.queryByText('Rains end')).toBeNull();

    fireEvent.press(view.getByText('Rains start: what to do'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/seasonal/[region]/[variable]',
      params: { region: 'Greater Accra', season: 'southern-major', window: 'MAM', variable: 'onset' },
    });

    fireEvent.press(view.getByText('Full seasonal advisory'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/seasonal/[region]',
      params: { region: 'Greater Accra', season: 'southern-major', window: 'MAM' },
    });
  });

  it('keeps the drawer months for a three month figure, even outside the season', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Rainfall Total (mm)');
    fireEvent.press(view.getByLabelText('Three-month window').findByProps({ accessibilityLabel: 'JAS' }));

    fireEvent.press(view.getByText('Rainfall: what to do'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/seasonal/[region]/[variable]',
      params: { region: 'Greater Accra', season: 'southern-major', window: 'JAS', variable: 'rainfallTotal' },
    });
  });

  it('follows the variable control', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Late-Season Dry Spell');

    expect(
      view.getByText(/65% chance the longest dry spell late in the season in Greater Accra is longer than usual, about 9 days/),
    ).toBeTruthy();
  });

  it('notes the dry season in the legend when a region is in it', () => {
    const view = renderWithControls({ locationId: 'tamale' });
    chooseVariable(view, 'Rainfall Total (mm)');

    expect(view.getByText(/Regions in their dry season show as No signal/)).toBeTruthy();
    expect(view.getByText(/This is the dry season in Northern/)).toBeTruthy();
  });
});

describe('a published forecast', () => {
  it('says who issued it', () => {
    const { getByText } = renderWithControls({ set: makeSet({ source: 'gmet', issuedBy: 'Ghana Meteorological Agency' }) });

    expect(getByText(/^Issued by Ghana Meteorological Agency · made/)).toBeTruthy();
  });

  it('names the model when the map is the model', () => {
    const { getByText, queryByText } = renderWithControls();

    expect(getByText(/^ECMWF SEAS5/)).toBeTruthy();
    expect(queryByText(/^Issued by/)).toBeNull();
  });
});

/* The empty state replaces the map, never the drawer: the drawer holds the
   controls that might be the way out. */
describe('the empty states', () => {
  it('waits without a button while the outlook is being prepared', () => {
    const { getByText, queryByText } = renderWithControls({
      set: makeSet({ seasons: {}, windows: {}, unavailable: true, computing: true, fetchFailed: true }),
    });

    expect(getByText('Getting the outlook ready')).toBeTruthy();
    expect(queryByText('Try again')).toBeNull();
    expect(queryByText('The weather service did not answer')).toBeNull();
    // The drawer is still there.
    expect(getByText('VIEW')).toBeTruthy();
  });

  it('offers a retry when the fetch failed', () => {
    const onRetry = jest.fn();
    const { getByText } = renderWithControls({ set: makeSet({ seasons: {}, windows: {}, unavailable: true, fetchFailed: true }), onRetry });

    expect(getByText('The weather service did not answer')).toBeTruthy();
    fireEvent.press(getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
    expect(getByText('VARIABLE')).toBeTruthy();
  });

  it('says nothing has been computed when the store is empty', () => {
    const { getByText, queryByText } = renderWithControls({ set: makeSet({ seasons: {}, windows: {}, unavailable: true }) });

    expect(getByText('No seasonal outlook has been computed yet')).toBeTruthy();
    expect(queryByText('Try again')).toBeNull();
    expect(getByText('VIEW')).toBeTruthy();
  });
});
