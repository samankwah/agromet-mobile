import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertBanner, alertBannerHasContent } from '../../features/advisories/weather-alerts/components/AlertBanner';
import { NetworkError } from '../../shared/api/http';
import type { WeatherAlert } from '../../shared/domain/weatherAlert';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

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
        <AlertBanner alerts={[]} status="success" onRetry={onRetry} hasSavedDistricts={false} {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function alert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    id: 'hazard:northern:flood',
    headline: 'Severe flood risk in Northern',
    region: 'Northern',
    hazardType: 'Flood',
    severity: 'warning',
    issuedAt: '2026-08-20T06:00:00.000Z',
    expiresAt: '2026-08-21T06:00:00.000Z',
    urgency: 'expected',
    certainty: 'possible',
    provenance: 'computed',
    evidence: [],
    farmerActions: ['Move livestock to higher ground now.'],
    source: 'AgroMet hazard model (Open-Meteo, GloFAS v4)',
    ...overrides,
  };
}

beforeEach(() => {
  onRetry.mockClear();
});

describe('AlertBanner', () => {
  /* Alerts are the one thing on Home with no fallback — hazardsService turns an
     empty response into an error on purpose, so a stale snapshot is never
     overwritten with nothing. That is right. What was wrong was showing it as a
     full-width "Couldn't load this" panel above a screen whose weather had
     loaded fine. */
  it('reports a failure in one line, not a panel', () => {
    renderBanner({ status: 'error', error: new NetworkError('Could not reach the AgroMet server.') });

    expect(screen.getByText(/Alerts need a connection to the AgroMet server/)).toBeTruthy();
    // The loud AsyncStateView panel must not appear here.
    expect(screen.queryByText("Couldn't load this")).toBeNull();
  });

  it('says the rest of the page is still current, because it is', () => {
    // The weather beneath comes from Open-Meteo directly and survives the
    // AgroMet backend being down. Saying so is the difference between "one
    // section is missing" and "the app is broken".
    renderBanner({ status: 'error', error: new NetworkError('nope') });

    expect(screen.getByText(/The weather below is up to date/)).toBeTruthy();
  });

  it('still offers a way back', () => {
    renderBanner({ status: 'error', error: new NetworkError('nope') });

    fireEvent.press(screen.getByLabelText('Retry loading alerts'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('never claims there is nothing to report', () => {
    // The calm "No active alerts" card is gone from every surface. A computed
    // reading stands for ten minutes against a six-hourly model, so that card
    // was what both Home and Advisories showed nearly all the time — a
    // permanent, prominent report of no news.
    renderBanner({ status: 'success', alerts: [], hasSavedDistricts: true });
    expect(screen.queryByText(/No active alerts/)).toBeNull();
  });

  /* No test rendered a populated card until now, which is exactly why the
     unguarded `${alert.district}` below went unnoticed: these readings are
     regional, so most alerts have no district and the card read "undefined,
     Northern" to every farmer who had not saved one. */
  it('names the region alone when the reading is not pinned to a district', () => {
    renderBanner({ status: 'success', alerts: [alert()] });

    expect(screen.getByText('Northern')).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  it('names both when a saved district pins the reading', () => {
    renderBanner({ status: 'success', alerts: [alert({ district: 'Tamale Metropolitan' })], hasSavedDistricts: true });

    expect(screen.getByText('Tamale Metropolitan, Northern')).toBeTruthy();
  });

  /* The CAP triple, on the card rather than one tap away. A model index and a
     forecaster's bulletin call for different responses, and telling them apart
     must not require opening anything. */
  it('says on the card whether a model computed this or a forecaster issued it', () => {
    renderBanner({ status: 'success', alerts: [alert()] });
    expect(screen.getByText('Expected · possible · AgroMet hazard model')).toBeTruthy();

    screen.unmount();

    renderBanner({
      status: 'success',
      alerts: [
        alert({
          headline: 'Bagre spillage under way',
          severity: 'emergency',
          urgency: 'immediate',
          certainty: undefined,
          provenance: 'issued',
          source: 'Ghana Meteorological Agency (GMet)',
        }),
      ],
    });
    expect(screen.getByText('Happening now · Ghana Meteorological Agency (GMet)')).toBeTruthy();
    expect(screen.queryByText(/AgroMet hazard model/)).toBeNull();
  });

  it('carries the same provenance into the accessibility label', () => {
    // A screen-reader user gets the card as one string, so the distinction has
    // to survive into it — not just into the visible caption.
    renderBanner({ status: 'success', alerts: [alert()] });

    const label = screen.getByLabelText(/Severe flood risk in Northern/).props.accessibilityLabel;
    expect(label).toContain('AgroMet hazard model');
    expect(label).not.toContain('undefined');
  });

  /* Nothing to raise, so nothing rendered. `alertBannerHasContent` is the
     shared predicate AdvisoriesScreen also reads, so its heading and this card
     can never disagree about whether the section exists. */
  describe('when there is nothing to raise', () => {
    it('renders nothing at all', () => {
      renderBanner({ status: 'success', alerts: [], hasSavedDistricts: true });
      expect(alertBannerHasContent({ status: 'success', alerts: [], hasSavedDistricts: true })).toBe(false);
      expect(screen.queryByText(/alert/i)).toBeNull();
    });

    it('renders nothing while the alerts are still loading', () => {
      // The skeleton goes too. A placeholder promises content, and here the
      // content usually never comes — a card-shaped shimmer that collapses a
      // second later is a worse flicker than the card it stood in for.
      renderBanner({ status: 'pending', alerts: [], hasSavedDistricts: true });
      expect(screen.queryByText(/alert/i)).toBeNull();
      expect(screen.queryByLabelText('Loading')).toBeNull();
    });

    it('still shows an alert when there is one', () => {
      renderBanner({ status: 'success', alerts: [alert()], hasSavedDistricts: true });
      expect(screen.getByText('Severe flood risk in Northern')).toBeTruthy();
    });

    it('still reports a failure, because not knowing is not the same as nothing', () => {
      renderBanner({ status: 'error', error: new NetworkError('nope'), hasSavedDistricts: true });
      expect(screen.getByText(/Alerts need a connection/)).toBeTruthy();
      expect(alertBannerHasContent({ status: 'error', alerts: [], hasSavedDistricts: true })).toBe(true);
    });
  });

  /* The one empty state left. No saved districts is not an absence of news — it
     is the reason there will be none, and the only thing worth the space. */
  it('points a farmer with no saved districts at the place to set them', () => {
    renderBanner({ status: 'success', alerts: [], hasSavedDistricts: false });

    expect(screen.getByText(/Save your districts/)).toBeTruthy();
    expect(screen.queryByText(/No active alerts/)).toBeNull();
    expect(alertBannerHasContent({ status: 'success', alerts: [], hasSavedDistricts: false })).toBe(true);
  });
});
