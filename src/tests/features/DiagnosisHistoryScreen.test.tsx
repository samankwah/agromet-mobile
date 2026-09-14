import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DiagnosisHistoryScreen } from '../../features/farm-tools/diagnose/DiagnosisHistoryScreen';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import type { DiagnosisResult } from '../../shared/domain/diagnosis';

// See HomeScreen.test.tsx for why initialMetrics is required.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// The screen re-fetches on every focus rather than on mount — see its own
// docblock — so a bare render needs a working useFocusEffect, unlike
// HomeScreen.test.tsx/CityCarousel.test.tsx's no-op mock.
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect } = require('react');
  return { useFocusEffect: useEffect };
});

let mockHistory: DiagnosisResult[] = [];

jest.mock('../../shared/storage/diagnosisHistory', () => ({
  listDiagnosisHistory: () => Promise.resolve(mockHistory),
}));

function entry(id: string, likelyIssue: string): DiagnosisResult {
  return {
    id,
    likelyIssue,
    plant: 'Cassava',
    confidenceBand: 'high',
    confidenceRangePct: [70, 100],
    immediateActions: [],
    preventionGuidance: [],
    remedy: 'Plant a resistant variety.',
    evidence: [],
    disclaimer: 'Decision support only.',
    diagnosedAt: '2026-08-30T00:00:00.000Z',
    source: 'provider',
  };
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <DiagnosisHistoryScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('DiagnosisHistoryScreen', () => {
  it('shows the empty state with no history', async () => {
    mockHistory = [];
    renderScreen();

    expect(await screen.findByText('No diagnoses yet')).toBeTruthy();
  });

  it('lists every past diagnosis, not just the first screenful', async () => {
    mockHistory = [entry('1', 'Cassava Mosaic Disease'), entry('2', 'Fall Armyworm'), entry('3', 'Leaf Rust')];
    renderScreen();

    expect(await screen.findByText('Cassava Mosaic Disease')).toBeTruthy();
    expect(screen.getByText('Fall Armyworm')).toBeTruthy();
    expect(screen.getByText('Leaf Rust')).toBeTruthy();
  });

  it('opens a diagnosis on tap and returns to the list from it', async () => {
    mockHistory = [entry('1', 'Cassava Mosaic Disease')];
    renderScreen();

    fireEvent.press(await screen.findByLabelText(/Cassava Mosaic Disease/));
    expect(screen.getByText('All diagnoses')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Back to all diagnoses'));
    expect(await screen.findByText('Cassava Mosaic Disease')).toBeTruthy();
  });
});
