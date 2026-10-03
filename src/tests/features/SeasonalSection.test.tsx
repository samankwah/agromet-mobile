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

describe('a season beyond the model reach', () => {
  it('says the map is the normal and when the forecast will be ready', () => {
    const view = renderWithControls();
    chooseVariable(view, 'Onset Date');
    expect(view.queryByText(/Normal, not a forecast\./)).toBeNull();

    chooseSeason(view, 'Southern Minor Season');

    expect(view.getByText(/The forecast for this season will be ready from May 2027\./)).toBeTruthy();
    expect(view.getByText(/The forecast for the Southern Minor Season will be ready from May 2027/)).toBeTruthy();
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
  it("lists every variable for the reader's town, with the windows as columns", () => {
    const view = renderWithControls();

    expect(view.getAllByText('Early-Season Dry Spell').length).toBeGreaterThan(0);
    expect(view.getAllByText('SON').length).toBeGreaterThan(1);
    expect(view.getAllByText('420 mm').length).toBeGreaterThan(0);
    // JAS and SON are only normals in the fixture: starred, with the key.
    expect(view.getByText(/Normal \(1995 to 2024\), not a forecast/)).toBeTruthy();
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
