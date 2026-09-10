import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WelcomeScreen } from '../../features/onboarding/WelcomeScreen';
import { useOnboardingStore } from '../../shared/state/onboardingStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

function renderWelcome() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <WelcomeScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  useOnboardingStore.setState({ hasSeenWelcome: false, hasHydrated: true });
});

describe('WelcomeScreen', () => {
  it('says what the app is', () => {
    renderWelcome();

    expect(screen.getByText('AgroMet Ghana')).toBeTruthy();
    expect(screen.getByText('Welcome to')).toBeTruthy();
    expect(screen.getByText(/Farm weather, hazard alerts and weekly advisories/)).toBeTruthy();
  });

  it('announces the wordmark as the heading, so it is not read as decoration', () => {
    renderWelcome();
    expect(screen.getByRole('header')).toHaveTextContent('AgroMet Ghana');
  });

  /* The backdrop is now the web app's register photograph, whose licence is
     unrecorded — unlike the weather backdrops, which each carry a credit in
     `assets/weather/CREDITS.md`. So no credit is shown, and specifically not one
     belonging to a different photograph: attributing this image to the Wikimedia
     contributor who took the old one would be worse than showing nothing. */
  it('does not credit a photographer it cannot name', () => {
    renderWelcome();
    expect(screen.queryByText(/Wikimedia Commons/)).toBeNull();
    expect(screen.queryByText(/^Photo:/)).toBeNull();
  });

  it('sets the action in capitals but speaks it normally', () => {
    renderWelcome();
    expect(screen.getByText('GET STARTED')).toBeTruthy();
    expect(screen.getByLabelText('Get started')).toBeTruthy();
  });

  /* Setting the flag is the entire action — there is no navigation to assert,
     and that is the design. The root layout renders this screen *instead of*
     the navigator, so the app appears behind nothing once the flag flips. As a
     route it had to be left by replacing the top of the stack with a route
     already below it, which rendered blank under two different hrefs. */
  it('records the screen as seen, which is the whole of leaving it', () => {
    renderWelcome();
    fireEvent.press(screen.getByText('GET STARTED'));

    expect(useOnboardingStore.getState().hasSeenWelcome).toBe(true);
  });
});
