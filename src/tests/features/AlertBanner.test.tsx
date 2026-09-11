import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertBanner, alertBannerHasContent } from '../../features/advisories/weather-alerts/components/AlertBanner';
import { NetworkError } from '../../shared/api/http';
import type { WeatherAlert } from '../../shared/domain/weatherAlert';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() } }));

// `mock`-prefixed so jest's hoisted factory is allowed to close over it.
const mockOpenSettings = jest.fn();
jest.mock('../../shared/location/locationClient', () => ({
  openLocationSettings: () => mockOpenSettings(),
}));

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const onRetry = jest.fn();

function renderBanner(props: Partial<React.ComponentProps<typeof AlertBanner>> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <AlertBanner alerts={[]} status="success" onRetry={onRetry} locationPrompt={false} {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** A severe-weather alert, the only kind the banner shows now. */
function alert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    id: 'weather:kumasi:thunderstorm:2026-09-11',
    headline: 'Thunderstorms likely this afternoon',
    district: 'Kumasi',
    region: 'Ashanti',
    hazardType: 'Thunderstorm',
    severity: 'warning',
    issuedAt: '2026-09-11T06:00:00.000Z',
    expiresAt: '2026-09-11T23:59:59.000Z',
    urgency: 'expected',
    certainty: 'likely',
    provenance: 'computed',
    sourceUrl: 'https://open-meteo.com/',
    evidence: ['Forecast: thunderstorms (weather code 95)'],
    farmerActions: ['Bring livestock under cover.'],
    source: 'AgroMet forecast (Open-Meteo)',
    ...overrides,
  };
}

beforeEach(() => {
  onRetry.mockClear();
  mockOpenSettings.mockClear();
  mockPush.mockClear();
});

describe('AlertBanner', () => {
  it('reports a failure in one line, not a panel', () => {
    renderBanner({ status: 'error', error: new NetworkError('Could not reach the AgroMet server.') });

    expect(screen.getByText(/Alerts need a connection to the AgroMet server/)).toBeTruthy();
    expect(screen.queryByText("Couldn't load this")).toBeNull();
  });

  it('says the rest of the page is still current, because it is', () => {
    renderBanner({ status: 'error', error: new NetworkError('nope') });
    expect(screen.getByText(/The weather below is up to date/)).toBeTruthy();
  });

  it('still offers a way back', () => {
    renderBanner({ status: 'error', error: new NetworkError('nope') });
    fireEvent.press(screen.getByLabelText('Retry loading alerts'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the severe-weather alert and names the town it is for', () => {
    renderBanner({ status: 'success', alerts: [alert()] });
    expect(screen.getByText('Thunderstorms likely this afternoon')).toBeTruthy();
    expect(screen.getByText('Kumasi, Ashanti')).toBeTruthy();
  });

  it('opens that day in the forecast when tapped, not a separate alert screen', () => {
    renderBanner({ status: 'success', alerts: [alert()] });
    fireEvent.press(screen.getByLabelText(/Thunderstorms likely this afternoon/));
    expect(mockPush).toHaveBeenCalledWith('/forecast-day/2026-09-11');
  });

  it('renders the highest-severity alert when several are active', () => {
    renderBanner({
      status: 'success',
      alerts: [
        alert({ severity: 'emergency', headline: 'Damaging winds today', hazardType: 'Strong wind' }),
        alert({ headline: 'Heavy rain tomorrow', hazardType: 'Heavy rain' }),
      ],
    });
    expect(screen.getByText('Damaging winds today')).toBeTruthy();
    expect(screen.queryByText('Heavy rain tomorrow')).toBeNull();
  });

  describe('when there is nothing to raise', () => {
    it('renders nothing at all on a calm day', () => {
      renderBanner({ status: 'success', alerts: [] });
      expect(alertBannerHasContent({ status: 'success', alerts: [], locationPrompt: false })).toBe(false);
      expect(screen.queryByText(/likely|rain|heat|wind/i)).toBeNull();
    });

    it('renders nothing while the forecast is still loading', () => {
      renderBanner({ status: 'pending', alerts: [] });
      expect(screen.queryByLabelText('Loading')).toBeNull();
    });

    it('still reports a failure, because not knowing is not the same as nothing', () => {
      renderBanner({ status: 'error', error: new NetworkError('nope') });
      expect(screen.getByText(/Alerts need a connection/)).toBeTruthy();
      expect(alertBannerHasContent({ status: 'error', alerts: [], locationPrompt: false })).toBe(true);
    });
  });

  describe('when the banner is stuck on the default town', () => {
    it('offers to turn location on, and gives way to a real alert', () => {
      renderBanner({ status: 'success', alerts: [], locationPrompt: true, locationPermission: 'denied' });
      expect(screen.getByText(/Weather alerts are for Accra/)).toBeTruthy();

      fireEvent.press(screen.getByText(/Open settings/));
      expect(mockOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('shows the alert, not the prompt, once one exists', () => {
      renderBanner({ status: 'success', alerts: [alert()], locationPrompt: true });
      expect(screen.getByText('Thunderstorms likely this afternoon')).toBeTruthy();
      expect(screen.queryByText(/Weather alerts are for Accra/)).toBeNull();
    });

    it('does not show the prompt while location is still resolving', () => {
      renderBanner({ status: 'success', alerts: [], locationPrompt: false });
      expect(screen.queryByText(/Weather alerts are for Accra/)).toBeNull();
    });
  });
});
