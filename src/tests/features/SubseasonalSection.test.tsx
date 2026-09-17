import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SubseasonalSection } from '../../features/forecasts/components/SubseasonalSection';
import { createTestQueryClient } from '../testQueryClient';
import type { SubseasonalCell, SubseasonalOutlookSet } from '../../shared/domain/subseasonalOutlook';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * A client of its own, with retries off, and a rejecting fetch: selecting a
 * place in these tests fires SelectionDetail's own day-by-day series query
 * (`useQuery(['subseasonalSeries', ...])`), which is real network on the
 * shared app client — see HomeScreen.test.tsx for why that hangs the worker.
 * None of these tests assert on that chart, so a fast rejection is enough.
 */
let client: QueryClient;

beforeEach(() => {
  client = createTestQueryClient();
  globalThis.fetch = jest.fn(() =>
    Promise.reject(new TypeError('Network request failed')),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

function cell(withProbabilities: boolean): SubseasonalCell {
  const probabilities = { below: 0.1, normal: 0.2, above: 0.7 };
  return {
    id: '8.00,-1.00',
    lat: 8,
    lng: -1,
    rainfall: withProbabilities
      ? { value: 68.9, members: 31, normal: 60, probabilities, category: 'above', confidence: 'high', noSignal: false }
      : { value: 68.9, members: 31, normal: null },
    temperature: null,
  };
}

function set(withProbabilities: boolean): SubseasonalOutlookSet {
  return {
    cells: [cell(withProbabilities)],
    unavailable: false,
    fetchFailed: false,
    computing: false,
    issuedAt: '2026-08-24T00:00:00Z',
    windowStart: '2026-09-07',
    windowEnd: '2026-09-21',
    model: 'NOAA GEFS 0.5 degree',
    baseline: 'ERA5 1995-2024',
    stale: false,
  };
}

type RenderOverrides = {
  outlookStatus?: 'pending' | 'error' | 'success';
  outlookError?: unknown;
  onRetryOutlook?: () => void;
  /** Replaces the whole field, for the states that have no cells at all. */
  set?: SubseasonalOutlookSet;
  onRetry?: () => void;
};

function renderSection(withProbabilities: boolean, overrides: RenderOverrides = {}) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <SubseasonalSection
            outlook={undefined}
            set={overrides.set ?? set(withProbabilities)}
            status="success"
            onRetry={overrides.onRetry ?? (() => {})}
            outlookStatus={overrides.outlookStatus ?? 'success'}
            outlookError={overrides.outlookError}
            onRetryOutlook={overrides.onRetryOutlook ?? (() => {})}
          />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Render with the controls drawer open, which is where the controls live. It
 * starts closed so the map is unobstructed, so anything testing a control has
 * to open it first. */
function renderWithControls(withProbabilities: boolean, overrides: RenderOverrides = {}) {
  const view = renderSection(withProbabilities, overrides);
  fireEvent.press(view.getByLabelText('Expand map controls'));
  return view;
}

/**
 * Which view the reader lands on.
 *
 * The probability map needs a per-cell ERA5 baseline that is baked offline and
 * can lag the deployment. Landing on Probability while that bake is unfinished
 * shows "no probabilities have been computed yet" on a screen that *does* hold
 * a real forecast, one tap away: the ensemble mean needs no baseline at all.
 * So the default follows the data rather than being fixed.
 */
describe('SubseasonalSection default view', () => {
  it('opens on Probability when the field carries a tercile split', () => {
    const { getByLabelText } = renderWithControls(true);
    const tabs = getByLabelText('Forecast view');

    expect(tabs.findByProps({ accessibilityLabel: 'Probability' }).props.accessibilityState.selected).toBe(true);
  });

  it('opens on Deterministic when no cell has one, rather than on an empty map', () => {
    const { getByLabelText } = renderWithControls(false);
    const tabs = getByLabelText('Forecast view');

    expect(tabs.findByProps({ accessibilityLabel: 'Deterministic' }).props.accessibilityState.selected).toBe(true);
  });

  it('still lets the reader choose the empty view for themselves', () => {
    // The default is a starting point, not a lock: Probability stays reachable
    // so a reader can see for themselves that nothing has been computed.
    const { getByLabelText } = renderWithControls(false);

    expect(getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' })).toBeTruthy();
  });
});

/**
 * The empty probability view has to carry its own way out.
 *
 * Its advice used to read "switch to Deterministic below", pointing at a
 * control that lives inside the drawer and disappears whenever the drawer is
 * collapsed. On a screen showing nothing else, that is a dead end dressed as
 * guidance, so the escape is a button in the empty state itself.
 */
describe('the empty probability view', () => {
  it('offers the working view as an action, not as directions', () => {
    const { getByLabelText, getByText } = renderWithControls(false);

    // Probability is reachable even though it is not the default.
    fireEvent.press(getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' }));

    expect(getByText('No probabilities have been computed yet')).toBeTruthy();
    expect(getByText('Show the ensemble average')).toBeTruthy();
  });

  it('does not tell the reader to look at a control that may be hidden', () => {
    const { getByLabelText, queryByText } = renderWithControls(false);
    fireEvent.press(getByLabelText('Forecast view').findByProps({ accessibilityLabel: 'Probability' }));

    expect(queryByText(/below/i)).toBeNull();
  });
});

/**
 * A failed fetch is not an empty forecast.
 *
 * Both reach this screen as `unavailable`, and both used to read "No outlook has
 * been computed yet", which tells a farmer the outlook does not exist and that
 * waiting is the only option. When the real cause is a refused upstream call
 * (Open-Meteo rate-limits the 165-point ensemble), the useful instruction is the
 * opposite one: try again now. So the copy follows `fetchFailed`.
 */
describe('the failed-fetch empty state', () => {
  function failedSet(): SubseasonalOutlookSet {
    return { ...set(false), cells: [], unavailable: true, fetchFailed: true };
  }

  it('says the service did not answer rather than that nothing was computed', () => {
    const { getByText, queryByText } = renderSection(false, { set: failedSet() });

    expect(getByText('The weather service did not answer')).toBeTruthy();
    expect(queryByText('No outlook has been computed yet')).toBeNull();
  });

  it('offers a retry, because this is the state where retrying works', () => {
    const onRetry = jest.fn();
    const { getByText } = renderSection(false, { set: failedSet(), onRetry });

    fireEvent.press(getByText('Try again'));

    expect(onRetry).toHaveBeenCalled();
  });

  it('does not offer the ensemble average, which is just as empty', () => {
    // The deterministic view is the escape from a *missing baseline*. With no
    // cells at all there is nothing to switch to, so offering it would be a
    // button that changes nothing.
    const { queryByText } = renderSection(false, { set: failedSet() });

    expect(queryByText('Show the ensemble average')).toBeNull();
  });

  it('waits rather than offering a retry while the server is still fetching', () => {
    // The server now starts the fetch and answers immediately, so an empty first
    // response is normal and self-correcting. Calling that a failure, or handing
    // the reader a button, would both be wrong.
    const preparing = { ...set(false), cells: [], unavailable: true, fetchFailed: true, computing: true };
    const { getByText, queryByText } = renderSection(false, { set: preparing });

    expect(getByText('Getting the outlook ready')).toBeTruthy();
    expect(queryByText('Try again')).toBeNull();
    // `computing` outranks `fetchFailed`, which is set from the attempt before.
    expect(queryByText('The weather service did not answer')).toBeNull();
  });

  it('still says "not computed yet" when the cache is genuinely empty', () => {
    const empty = { ...set(false), cells: [], unavailable: true, fetchFailed: false };
    const { getByText, queryByText } = renderSection(false, { set: empty });

    expect(getByText('No outlook has been computed yet')).toBeTruthy();
    expect(queryByText('The weather service did not answer')).toBeNull();
  });
});

/**
 * The sheet over the map.
 *
 * The map is the content, so the drawer starts out of the way and opens when
 * asked. Its controls therefore have to be absent until then -- a collapsed
 * drawer that still renders its controls is not collapsed, it is invisible.
 */
describe('the controls drawer', () => {
  it('starts closed, leaving the map unobstructed', () => {
    // The drawer no longer unmounts the controls on collapse (a scroll
    // gesture needs something already there to scroll open — see
    // Drawer.test.tsx), so the closed state is asserted through the handle's
    // own label rather than the controls' presence in the tree.
    const { queryByLabelText } = renderSection(true);

    expect(queryByLabelText('Expand map controls')).toBeTruthy();
    expect(queryByLabelText('Collapse map controls')).toBeNull();
  });

  it('opens on the handle, and offers the way back', () => {
    const { getByLabelText, queryByLabelText } = renderSection(true);
    fireEvent.press(getByLabelText('Expand map controls'));

    expect(queryByLabelText('Collapse map controls')).toBeTruthy();
  });

  it('keeps the legend visible while closed', () => {
    // The key is what makes the map readable, so it belongs to the map rather
    // than to the controls: closing the sheet must not take it away.
    const { getAllByText } = renderSection(false);

    expect(getAllByText(/mm$/).length).toBeGreaterThan(0);
  });
});

/**
 * The selected place's panel, which reads like the day-detail sheet: a named
 * header with a close control, then sections.
 *
 * The figures are the point. A reader who picks an area is asking what the
 * shade under their finger means, and the panel used to answer with a curve
 * alone, leaving the split and the normal unstated.
 */
describe('the selected place panel', () => {
  function selectPlace(withProbabilities: boolean) {
    const view = renderWithControls(withProbabilities);
    fireEvent.changeText(view.getByLabelText('Search for a district or region'), 'bongo');
    fireEvent.press(view.getByLabelText('Bongo, Upper East'));
    return view;
  }

  it('names the place and offers a close control, not a text link', () => {
    const { getByText, getByLabelText } = selectPlace(true);

    expect(getByText('Bongo')).toBeTruthy();
    expect(getByLabelText('Close Bongo details')).toBeTruthy();
  });

  it('states the split and the normal, not just the curve', () => {
    const { getByText } = selectPlace(true);

    expect(getByText('Compared with normal')).toBeTruthy();
    // Both figures, rounded: 68.9 mm against a 60 mm normal. Queried by the
    // values rather than by "70%", which the legend's own scale also prints.
    expect(getByText('69mm')).toBeTruthy();
    expect(getByText('Normal for this window')).toBeTruthy();
    expect(getByText('60mm')).toBeTruthy();
    // All three legs of the split are named, so the reader sees what the
    // dominant one was chosen against.
    expect(getByText('Drier than normal')).toBeTruthy();
    expect(getByText('Near normal')).toBeTruthy();
    expect(getByText('Wetter than normal')).toBeTruthy();
  });

  it('takes the baseline name from the response rather than from the clock', () => {
    // The record is fixed at bake time, so counting back thirty years from
    // today would misname it by however long ago the bake ran. Matched on the
    // panel's own sentence: the footer prints the baseline too.
    const { getByText } = selectPlace(true);

    expect(getByText(/Out of 31 forecast runs, against the ERA5 1995-2024 average/)).toBeTruthy();
  });

  it('says plainly when a cell has no baseline to compare against', () => {
    const { getByText, queryByText } = selectPlace(false);

    expect(queryByText('Near normal')).toBeNull();
    expect(getByText(/no baseline yet/i)).toBeTruthy();
  });

  it('closes on the close control', () => {
    const { getByLabelText, queryByText } = selectPlace(true);
    fireEvent.press(getByLabelText('Close Bongo details'));

    expect(queryByText('Compared with normal')).toBeNull();
  });
});

/**
 * The reader's own town is a separate query from the map, so it can fail on
 * its own — this is the bug: a rate-limited upstream (or a town without a
 * baked baseline) used to make the personal card vanish silently while a
 * perfectly healthy map sat right above it, with no error and no way to
 * retry.
 */
describe('the reader\'s own town card', () => {
  it('shows an error and a retry, not a silent gap, when only the personal card fails', () => {
    const onRetryOutlook = jest.fn();
    const { getByText } = renderWithControls(true, { outlookStatus: 'error', onRetryOutlook });

    // The map (`set`) is healthy in this fixture, so its own controls must
    // still be reachable — the failure is scoped to the card, not the screen.
    expect(getByText('FORECAST VIEW')).toBeTruthy();

    expect(getByText("Couldn't load this")).toBeTruthy();

    fireEvent.press(getByText('Retry'));
    expect(onRetryOutlook).toHaveBeenCalledTimes(1);
  });

  it('shows a loading skeleton, not a blank gap, while the personal card is pending', () => {
    const { queryByText, getByLabelText } = renderWithControls(true, { outlookStatus: 'pending' });

    expect(queryByText("Couldn't load this")).toBeNull();
    // The map's own view stays reachable while only the card is loading.
    expect(getByLabelText('Forecast view')).toBeTruthy();
  });
});
