import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { AlertPopup } from '../../features/advisories/weather-alerts/components/AlertPopup';
import type { WeatherAlert } from '../../shared/domain/weatherAlert';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const push = router.push as jest.Mock;

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const onDismiss = jest.fn();

function alert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    id: 'hazard:eastern:flood',
    headline: 'Extreme flood risk in Eastern',
    region: 'Eastern',
    hazardType: 'Flood',
    severity: 'emergency',
    issuedAt: '2026-08-23T11:13:00.000Z',
    expiresAt: '2026-08-24T11:13:00.000Z',
    urgency: 'immediate',
    certainty: 'possible',
    provenance: 'computed',
    evidence: [],
    farmerActions: [
      'Follow NADMO instructions for your district.',
      'Move people and livestock to higher ground.',
      'Do not enter flooded fields.',
      'Keep drinking water separate from floodwater.',
    ],
    source: 'AgroMet hazard model (Open-Meteo, GloFAS v4)',
    ...overrides,
  };
}

function renderPopup(overrides: Partial<WeatherAlert> = {}) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <AlertPopup alert={alert(overrides)} onDismiss={onDismiss} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  onDismiss.mockClear();
  push.mockClear();
});

describe('AlertPopup', () => {
  it('leads with the severity word, not just a colour', () => {
    renderPopup();
    expect(screen.getByText('EMERGENCY')).toBeTruthy();
    expect(screen.getByText('Extreme flood risk in Eastern')).toBeTruthy();
  });

  it('names the region alone when no district pins the reading', () => {
    renderPopup();
    expect(screen.getByText('Eastern · Flood')).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  /* On the popup this line does the most work of anything on screen: it is what
     separates a forecaster's bulletin from a model reading at the moment the
     reader is deciding whether to act. */
  it('says who is behind the alert', () => {
    renderPopup();
    expect(screen.getByText('Happening now · possible · AgroMet hazard model')).toBeTruthy();

    screen.unmount();

    renderPopup({
      provenance: 'issued',
      certainty: undefined,
      source: 'Ghana Meteorological Agency (GMet)',
    });
    expect(screen.getByText('Happening now · Ghana Meteorological Agency (GMet)')).toBeTruthy();
  });

  it('shows the first three actions, not all of them', () => {
    // Five bullets in a modal is a wall of text at the moment someone needs to
    // decide something.
    renderPopup();
    expect(screen.getByText('Follow NADMO instructions for your district.')).toBeTruthy();
    expect(screen.getByText('Do not enter flooded fields.')).toBeTruthy();
    expect(screen.queryByText('Keep drinking water separate from floodwater.')).toBeNull();
  });

  it('dismisses before navigating, so the modal cannot sit over the details screen', () => {
    renderPopup();
    fireEvent.press(screen.getByText('See the full alert'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/alert/hazard:eastern:flood');
  });

  it('offers a labelled way out', () => {
    // Deliberately a button and not a backdrop tap: a backdrop tap is how people
    // close a sheet they did not mean to open, and dismissing a flood warning
    // should be a decision.
    renderPopup();
    fireEvent.press(screen.getByLabelText('Dismiss this alert'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
