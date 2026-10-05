import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DiagnosisResultCard } from '../../features/farm-tools/diagnose/components/DiagnosisResultCard';
import type { DiagnosisResult } from '../../shared/domain/diagnosis';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

/**
 * Whether the card says which engine produced the answer.
 *
 * Both engines render through this one card, which is convenient for the code
 * and misleading for the farmer if left unsaid: the online provider covers two
 * dozen crops with advice from a maintained database, the offline model is five
 * cassava classes on the handset. Identical presentation would let the weaker
 * answer borrow the stronger one's authority.
 */

function renderCard(result: DiagnosisResult, isExplaining = false) {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <ThemeProvider>
        <DiagnosisResultCard result={result} isExplaining={isExplaining} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function diagnosis(overrides: Partial<DiagnosisResult> = {}): DiagnosisResult {
  return {
    id: 'diagnosis-1',
    likelyIssue: 'Cassava Mosaic Disease',
    plant: 'Cassava',
    confidenceBand: 'high',
    confidenceRangePct: [70, 100],
    immediateActions: ['Uproot severely stunted plants'],
    preventionGuidance: ['Plant a resistant variety'],
    remedy: 'A virus carried by whiteflies and infected cuttings.',
    evidence: [],
    disclaimer: 'Decision support only. Confirm with an extension officer.',
    diagnosedAt: '2026-08-30T00:00:00.000Z',
    ...overrides,
  };
}

describe('DiagnosisResultCard', () => {
  it('says when the answer came from the phone, and what that leaves out', async () => {
    renderCard(diagnosis({ source: 'offline-model' }));

    // The limitation is stated in the same breath as the capability. A farmer
    // who photographs maize while this is on needs to know the answer could
    // only ever have been a cassava disease.
    expect(await screen.findByText(/checked on your phone/i)).toBeTruthy();
    expect(screen.getByText(/cassava diseases only/i)).toBeTruthy();
  });

  it('stays quiet about provenance for a provider answer', async () => {
    renderCard(diagnosis({ source: 'provider' }));

    // The online provider is the default path. Labelling it too would turn a
    // meaningful warning into decoration that farmers learn to skip.
    await screen.findByText('Cassava Mosaic Disease');
    expect(screen.queryByText(/checked on your phone/i)).toBeNull();
  });

  it('treats a record with no source as a provider answer', async () => {
    // History written before the offline path existed carries no `source`.
    // Those are all provider answers, and must not acquire an offline badge
    // just because the field is missing.
    renderCard(diagnosis());

    await screen.findByText('Cassava Mosaic Disease');
    expect(screen.queryByText(/checked on your phone/i)).toBeNull();
  });

  it('always shows the disclaimer', async () => {
    renderCard(diagnosis({ source: 'offline-model' }));

    // There is no prop to hide it, and the offline path is the one that most
    // needs it.
    expect(await screen.findByText(/Confirm with an extension officer/i)).toBeTruthy();
  });

  it('shows the AI explanation, labelled as AI', async () => {
    renderCard(diagnosis({ source: 'offline-model', explanation: 'Your cassava likely has mosaic disease.', adviceSource: 'ai' }));

    expect(await screen.findByText('Your cassava likely has mosaic disease.')).toBeTruthy();
    expect(screen.getByText(/explained by ai/i)).toBeTruthy();
  });

  it('says an explanation is coming while it loads, and nothing once it is not', async () => {
    const { rerender } = renderCard(diagnosis({ source: 'offline-model' }), true);
    expect(await screen.findByText(/getting a simpler explanation/i)).toBeTruthy();

    rerender(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
      >
        <ThemeProvider>
          <DiagnosisResultCard result={diagnosis({ source: 'offline-model' })} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.queryByText(/getting a simpler explanation/i)).toBeNull();
    expect(screen.queryByText(/explained by ai/i)).toBeNull();
  });
  it('lets the farmer report the AI explanation without leaving the screen', async () => {
    // Google Play's AI-generated content policy: an in-app way to flag it.
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true, reference: 3 }) } as Response);
    renderCard(diagnosis({ source: 'offline-model', explanation: 'Your cassava likely has mosaic disease.', adviceSource: 'ai' }));

    fireEvent.press(await screen.findByRole('button', { name: 'Report this answer' }));
    fireEvent.press(await screen.findByText('The answer is wrong'));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Thank you', 'We will look at this answer.'));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ kind: 'diagnosis', reason: 'wrong', text: 'Your cassava likely has mosaic disease.' });
    alert.mockRestore();
  });

  it('offers no report link when there is no AI text to report', async () => {
    renderCard(diagnosis({ source: 'offline-model' }));
    await screen.findByText(/Confirm with an extension officer/i);
    expect(screen.queryByRole('button', { name: 'Report this answer' })).toBeNull();
  });
});
