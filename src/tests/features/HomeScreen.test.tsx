import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '../../features/home/HomeScreen';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// react-native-safe-area-context needs explicit initial metrics in Jest —
// there's no native layout pass to derive them from, so SafeAreaProvider
// renders no children at all without this (per the library's own testing
// guidance).
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * A smoke test, not a behavior test — confirms the full Home composition
 * (CityCarousel/AlertBanner/CurrentConditionsCard/QuickActionsRow/
 * FeaturedForecastCard/AdvisoryTeaserCard/NewsTeaserCard, all wired
 * through useHomeData's queries and the Zustand stores) mounts without
 * throwing, in the same provider order as the real app/_layout.tsx.
 * Queries are gated on `hasHydrated` (false at first render, before the
 * Zustand persist middleware resolves), so this renders the loading state
 * for every card — exactly what a farmer's first frame looks like.
 */
describe('HomeScreen', () => {
  it('renders the branded header without crashing', () => {
    const { getByText } = render(
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <HomeScreen />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(getByText('AgroMet Ghana')).toBeTruthy();
  });
});
