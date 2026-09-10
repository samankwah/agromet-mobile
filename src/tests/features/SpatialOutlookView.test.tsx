import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SpatialOutlookView } from '../../features/forecasts/spatial-outlook/SpatialOutlookView';
import { queryClient } from '../../shared/api/queryClient';
import { SPATIAL_VARIABLES } from '../../shared/api/spatialOutlookService';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderView() {
  const utils = render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SpatialOutlookView seasonal={undefined} />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );

  /** The drawer lands collapsed (map first), so a test that needs the
   * selectors taps the handle to bring them up. */
  const expandDrawer = () => fireEvent.press(utils.getByLabelText('Expand map controls'));

  return { ...utils, expandDrawer };
}

describe('SpatialOutlookView', () => {
  it('lands with the selector drawer collapsed, showing just the map and legend', () => {
    const { queryByText, getByLabelText } = renderView();

    expect(getByLabelText('Expand map controls')).toBeTruthy();
    expect(queryByText('FORECAST VIEW')).toBeNull();
  });

  it('reveals the selectors once the drawer is expanded', () => {
    const { getByText, expandDrawer } = renderView();
    expandDrawer();

    expect(getByText('FORECAST VIEW')).toBeTruthy();
    expect(getByText('GEOGRAPHY')).toBeTruthy();
    expect(getByText('VARIABLE')).toBeTruthy();
  });

  it('offers both forecast-view and geography options', () => {
    const { getByText, expandDrawer } = renderView();
    expandDrawer();

    expect(getByText('Probability')).toBeTruthy();
    expect(getByText('Deterministic')).toBeTruthy();
    expect(getByText('Region')).toBeTruthy();
    expect(getByText('District')).toBeTruthy();
  });

  it('shows a SEASON selector for the default variable, which is season-scoped', () => {
    // The default is the first variable — a season-defining characteristic
    // (Onset Date), so the period selector must offer Ghana's seasons
    // rather than trimesters.
    expect(SPATIAL_VARIABLES[0].periodKind).toBe('season');

    const { getByText, queryByText, expandDrawer } = renderView();
    expandDrawer();
    expect(getByText('SEASON')).toBeTruthy();
    expect(queryByText('SUB-SEASON')).toBeNull();
  });
});
