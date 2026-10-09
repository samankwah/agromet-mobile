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

type Overrides = { set?: SeasonalOutlookSet; onRetry?: () => void };

function renderSection(overrides: Overrides = {}) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <SeasonalSection
            set={overrides.set ?? makeSet()}
            status="success"
            onRetry={overrides.onRetry ?? (() => {})}
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

  it('has no district control', () => {
    const { queryByText } = renderWithControls();

    expect(queryByText('GEOGRAPHY')).toBeNull();
  });

  it('opens on Probability when the data carries a split', () => {
    const { getByLabelText } = renderWithControls();

    expect(getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' }).props.accessibilityState.selected).toBe(true);
  });

  it('names the model and the day the forecast was made, in one line', () => {
    const { getByText, queryByText } = renderWithControls();

    expect(getByText('ECMWF SEAS5 · made 1 Oct 2026.')).toBeTruthy();
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
  });

  it('greys out Probability and says when it will be ready', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');
    chooseSeason(view, 'Southern Minor Season');
    const probability = view.getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' });

    expect(probability.props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(view.getByText('Probability will be ready from May 2027.')).toBeTruthy();
    const deterministic = view.getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Deterministic' });
    expect(deterministic.props.accessibilityState.selected).toBe(true);
  });

  it('turns Probability back on for a season in the forecast', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');
    chooseSeason(view, 'Southern Minor Season');
    chooseSeason(view, 'Southern Major Season');

    expect(view.queryByText(/Probability will be ready/)).toBeNull();
    const probability = view.getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' });
    expect(probability.props.accessibilityState.disabled).toBe(false);
  });
});

describe('All Variables', () => {
  it('shows the season, not the months', () => {
    const view = renderWithControls();

    expect(view.getByLabelText('SEASON: All Seasons')).toBeTruthy();
    expect(view.queryByLabelText('Three-month window')).toBeNull();
  });
});

describe('the drawer', () => {
  it("describes the country or a half of it, never the reader's town", () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');

    expect(view.queryByText('Accra, Greater Accra')).toBeNull();
    expect(view.queryByText(/Greater Accra/)).toBeNull();
    expect(view.getByText(/The Northern Single Season in the five northern regions/)).toBeTruthy();
  });

  it('links to no other page', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Rainfall Total (mm)');

    expect(view.queryByText(/what to do/)).toBeNull();
    expect(view.queryByText(/seasonal advisory/i)).toBeNull();
    expect(view.queryByText(/Tap a region/)).toBeNull();
  });

  it("leaves a tap on the map to the map's own popup", () => {
    const view = renderSection();
    expect(view.UNSAFE_getByType(MapLibreChoropleth).props.onSelect).toBeUndefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('notes the dry season when a region is in it', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Rainfall Total (mm)');

    expect(view.getByText(/Regions in their dry season show as No signal/)).toBeTruthy();
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
