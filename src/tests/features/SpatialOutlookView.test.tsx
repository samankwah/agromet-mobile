import React from 'react';
import { render } from '@testing-library/react-native';
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
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SpatialOutlookView seasonal={undefined} />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Smoke test — the Outlook landing view is the selector drawer over the
 * choropleth, so the selectors must be present on first render (they are
 * the landing experience, not behind a drill-down). */
describe('SpatialOutlookView', () => {
  it('renders the selector drawer on landing', () => {
    const { getByText } = renderView();

    expect(getByText('FORECAST VIEW')).toBeTruthy();
    expect(getByText('GEOGRAPHY')).toBeTruthy();
    expect(getByText('VARIABLE')).toBeTruthy();
  });

  it('offers both forecast-view and geography options', () => {
    const { getByText } = renderView();

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

    const { getByText, queryByText } = renderView();
    expect(getByText('SEASON')).toBeTruthy();
    expect(queryByText('SUB-SEASON')).toBeNull();
  });
});
