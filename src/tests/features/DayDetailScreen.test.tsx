import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { DayDetailScreen } from '../../features/forecasts/day-detail/DayDetailScreen';
import { getWeeklyForecast } from '../../shared/api/forecastService';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// DayDetailScreen imports `router` at module scope for its close button.
// Mocked here rather than in jest.setup.js, whose stated scope is native
// modules that have no Jest binary — expo-router isn't one of those.
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// See HomeScreen.test.tsx for why initialMetrics is required.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen(date: string) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <DayDetailScreen date={date} />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('DayDetailScreen', () => {
  let date: string;

  beforeAll(async () => {
    date = (await getWeeklyForecast('accra')).days[0].date;
  });

  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('shows the header immediately, before the forecast has loaded', () => {
    renderScreen(date);

    // The header sits outside the AsyncStateView on purpose: a farmer on a
    // slow connection must be able to close the sheet while it loads.
    expect(screen.getByText('Conditions')).toBeTruthy();
    expect(screen.getByLabelText('Close day details')).toBeTruthy();
  });

  it('closes when the close button is pressed', () => {
    renderScreen(date);

    fireEvent.press(screen.getByLabelText('Close day details'));

    expect(router.back).toHaveBeenCalled();
  });

  it('renders the reference sections once loaded', async () => {
    renderScreen(date);

    expect(await screen.findByText('Chance of Rain')).toBeTruthy();
    expect(screen.getByText('Rain Total')).toBeTruthy();
    expect(screen.getByText('Daily Summary')).toBeTruthy();
    expect(screen.getByText('What This Means For Your Farm')).toBeTruthy();
    expect(screen.getByText(/^H:-?\d+° L:-?\d+°$/)).toBeTruthy();
  });

  it('does not repeat information the page already shows elsewhere', async () => {
    renderScreen(date);
    await screen.findByText('Chance of Rain');

    // These duplicated the "Rain Total" card and the hero high/low
    // respectively. Asserted as absent so the cleanup can't quietly regress
    // the next time someone adds a stat to this page.
    expect(screen.queryByText('Conditions through the day')).toBeNull();
    expect(screen.queryByText('Min / Max')).toBeNull();
    expect(screen.queryByText('Rainfall total')).toBeNull();
  });

  it('lets the pill switch which measure the chart plots', async () => {
    renderScreen(date);
    await screen.findByText('Chance of Rain');

    // Starts on Conditions, so the Actual/Feels Like pair belongs to it.
    expect(screen.getByText('Actual')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Chart measure: Conditions. Choose another.'));
    fireEvent.press(screen.getByText('Precipitation'));

    // The sub-mode control re-labels itself for the chosen measure, rather
    // than leaving a temperature toggle above a rainfall chart.
    expect(screen.getByText('Chance')).toBeTruthy();
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.queryByText('Feels Like')).toBeNull();

    // A measure with a single reading shows no toggle at all, rather than
    // one dead segment.
    fireEvent.press(screen.getByLabelText('Chart measure: Precipitation. Choose another.'));
    // "Humidity" is also the Wind & Humidity tile further down the page; the
    // menu row comes first in the tree.
    fireEvent.press(screen.getAllByText('Humidity')[0]);

    expect(screen.queryByText('Chance')).toBeNull();
    expect(screen.getByText(/disease pressure/)).toBeTruthy();
  });

  it('offers both temperature readings', async () => {
    renderScreen(date);
    await screen.findByText('Chance of Rain');

    expect(screen.getByText('Actual')).toBeTruthy();
    expect(screen.getByText('Feels Like')).toBeTruthy();
    expect(screen.getByText('The actual air temperature.')).toBeTruthy();

    fireEvent.press(screen.getByText('Feels Like'));

    expect(screen.getByText('How warm it feels once humidity and wind are accounted for.')).toBeTruthy();
  });
});
