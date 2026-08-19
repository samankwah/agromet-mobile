import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ForecastsScreen } from '../../features/forecasts/ForecastsScreen';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** A smoke test — confirms the screen mounts without throwing in the same
 * provider order as the real app/_layout.tsx, and that all four forecast
 * timescales are reachable from the segmented control. */
describe('ForecastsScreen', () => {
  it('renders all four forecast timescales', () => {
    const { getByText } = render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
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
});
