import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useDiagnose } from '../../features/farm-tools/diagnose/useDiagnose';
import type { DiagnosisRequest, DiagnosisResult } from '../../shared/domain/diagnosis';
import { useSettingsStore } from '../../shared/state/settingsStore';

/**
 * Which engine answers, and what happens when neither can.
 *
 * There are two of them now, they produce the same shape, and the choice
 * between them is invisible in the result. That makes the routing exactly the
 * kind of logic that can drift into being wrong without any test noticing, so
 * each case below is one row of the decision table rather than a happy path.
 *
 * The rule underneath all of it: the farmer's photo is never lost. Every branch
 * ends in an answer or a queued submission.
 */

let isOnline = true;

jest.mock('../../shared/net/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline() }),
}));

jest.mock('../../shared/api/diagnosisService', () => ({
  submitDiagnosis: jest.fn(),
  fetchDiagnosisExplanation: jest.fn(async () => null),
}));

jest.mock('../../features/farm-tools/diagnose/localModel', () => ({
  diagnoseOffline: jest.fn(),
  // Not mocked away: the crop gate is part of the routing decision under test,
  // and stubbing it would let a broken gate pass.
  isCropSupportedOffline: (crop?: string) => (crop ?? '').trim().toLowerCase() === 'cassava',
}));

jest.mock('../../shared/storage/diagnosisHistory', () => ({
  recordDiagnosis: jest.fn(async () => undefined),
  updateDiagnosis: jest.fn(async () => undefined),
}));

jest.mock('../../shared/storage/diagnosisQueue', () => ({
  enqueueDiagnosisSubmission: jest.fn(async () => undefined),
  listQueuedSubmissions: jest.fn(async () => []),
  listUnsentSubmissions: jest.fn(async () => []),
  reclaimOrphanedSubmissions: jest.fn(async () => undefined),
  removeQueuedSubmission: jest.fn(async () => undefined),
  updateQueuedSubmission: jest.fn(async () => undefined),
  MAX_QUEUE_ATTEMPTS: 5,
}));

function mockIsOnline() {
  return isOnline;
}
(globalThis as Record<string, unknown>).mockIsOnline = mockIsOnline;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { submitDiagnosis, fetchDiagnosisExplanation } = require('../../shared/api/diagnosisService');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { diagnoseOffline } = require('../../features/farm-tools/diagnose/localModel');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { enqueueDiagnosisSubmission } = require('../../shared/storage/diagnosisQueue');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { recordDiagnosis, updateDiagnosis } = require('../../shared/storage/diagnosisHistory');

function cassavaRequest(overrides: Partial<DiagnosisRequest> = {}): DiagnosisRequest {
  return {
    crop: 'cassava',
    growthStage: 'vegetative',
    symptoms: 'yellow mottling',
    imageUri: 'file:///leaf.jpg',
    ...overrides,
  };
}

function result(source: DiagnosisResult['source']): DiagnosisResult {
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
    disclaimer: 'Decision support only.',
    diagnosedAt: '2026-08-30T00:00:00.000Z',
    source,
  };
}

const UNAVAILABLE = { status: 'unavailable' as const, reason: 'Not confident enough.' };

/** Clients created per test, torn down after it so jest can exit. */
const clients: QueryClient[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  fetchDiagnosisExplanation.mockResolvedValue(null);
  isOnline = true;
  useSettingsStore.setState({ preferOfflineDiagnosis: false });
});

afterEach(() => {
  // An undisposed QueryClient keeps a garbage-collection timer alive, and jest
  // then reports the run as passed but never exits, which reads as a hang in
  // CI rather than as a leak.
  clients.forEach((client) => client.clear());
  clients.length = 0;
});

const EXPLANATION = {
  explanation: 'Your cassava most likely has mosaic disease, a virus.',
  immediateActions: ['Pull out the sick plants today.'],
  preventionGuidance: ['Plant clean cuttings next time.'],
  adviceSource: 'ai' as const,
};

describe('online, cassava', () => {
  it('answers on the phone first and leaves the provider alone', async () => {
    diagnoseOffline.mockResolvedValue(result('offline-model'));

    const { rendered } = await submit(cassavaRequest());

    // The CNN is the primary engine for the crop it was trained on.
    expect(submitDiagnosis).not.toHaveBeenCalled();
    expect(rendered.current.lastOutcome).toBe('result');
    expect(rendered.current.result?.source).toBe('offline-model');
  });

  it('swaps in the AI explanation when it arrives, on screen and in history', async () => {
    diagnoseOffline.mockResolvedValue(result('offline-model'));
    fetchDiagnosisExplanation.mockResolvedValue(EXPLANATION);

    const { rendered } = await submit(cassavaRequest());

    await waitFor(() => expect(rendered.current.result?.explanation).toBe(EXPLANATION.explanation));
    expect(rendered.current.result?.immediateActions).toEqual(EXPLANATION.immediateActions);
    // The disease name is the phone's, never the language model's.
    expect(rendered.current.result?.likelyIssue).toBe('Cassava Mosaic Disease');
    expect(updateDiagnosis).toHaveBeenCalledWith(expect.objectContaining({ id: 'diagnosis-1', adviceSource: 'ai' }));
    await waitFor(() => expect(rendered.current.isExplaining).toBe(false));
  });

  it('keeps the phone answer as it is when no explanation comes back', async () => {
    diagnoseOffline.mockResolvedValue(result('offline-model'));

    const { rendered } = await submit(cassavaRequest());

    await waitFor(() => expect(fetchDiagnosisExplanation).toHaveBeenCalled());
    await waitFor(() => expect(rendered.current.isExplaining).toBe(false));
    expect(rendered.current.result?.explanation).toBeUndefined();
    expect(rendered.current.result?.immediateActions).toEqual(['Uproot severely stunted plants']);
    expect(updateDiagnosis).not.toHaveBeenCalled();
  });

  it('goes to the provider when the phone will not commit to an answer', async () => {
    diagnoseOffline.mockResolvedValue(UNAVAILABLE);
    submitDiagnosis.mockResolvedValue(result('provider'));

    const { rendered } = await submit(cassavaRequest());

    expect(submitDiagnosis).toHaveBeenCalled();
    expect(rendered.current.result?.source).toBe('provider');
    // The explanation step is for the phone's answer only.
    expect(fetchDiagnosisExplanation).not.toHaveBeenCalled();
  });

  it('queues when the phone declined and the provider request then fails', async () => {
    diagnoseOffline.mockResolvedValue(UNAVAILABLE);
    submitDiagnosis.mockRejectedValue(new Error('timeout'));

    const { rendered } = await submit(cassavaRequest());

    // One try on the phone, not a second one after the network fails.
    expect(diagnoseOffline).toHaveBeenCalledTimes(1);
    expect(enqueueDiagnosisSubmission).toHaveBeenCalled();
    expect(rendered.current.lastOutcome).toBe('queued');
  });
});

describe('online, other crops', () => {
  it('uses the provider and never the on-device model', async () => {
    submitDiagnosis.mockResolvedValue(result('provider'));
    const { rendered } = await submit(cassavaRequest({ crop: 'maize' }));

    expect(submitDiagnosis).toHaveBeenCalled();
    expect(diagnoseOffline).not.toHaveBeenCalled();
    expect(fetchDiagnosisExplanation).not.toHaveBeenCalled();
    expect(rendered.current.lastOutcome).toBe('result');
  });

  it('reports a provider that declined to answer', async () => {
    submitDiagnosis.mockResolvedValue(UNAVAILABLE);
    const { rendered } = await submit(cassavaRequest({ crop: 'maize' }));

    expect(rendered.current.lastOutcome).toBe('unavailable');
    expect(enqueueDiagnosisSubmission).not.toHaveBeenCalled();
  });

  it('queues when the request fails', async () => {
    submitDiagnosis.mockRejectedValue(new Error('timeout'));

    const { rendered } = await submit(cassavaRequest({ crop: 'maize' }));

    expect(enqueueDiagnosisSubmission).toHaveBeenCalled();
    expect(rendered.current.lastOutcome).toBe('queued');
  });
});

describe('offline', () => {
  beforeEach(() => {
    isOnline = false;
  });

  it('answers cassava on the phone instead of promising an answer later', async () => {
    diagnoseOffline.mockResolvedValue(result('offline-model'));

    const { rendered } = await submit(cassavaRequest());

    expect(rendered.current.lastOutcome).toBe('result');
    expect(rendered.current.result?.source).toBe('offline-model');
    // Deliberately not queued as well: a queued copy would come back with the
    // provider's answer and write a second, possibly different, diagnosis of
    // the same photo into history.
    expect(enqueueDiagnosisSubmission).not.toHaveBeenCalled();
    expect(recordDiagnosis).toHaveBeenCalled();
    expect(fetchDiagnosisExplanation).not.toHaveBeenCalled();
  });

  it('queues a crop the on-device model does not cover', async () => {
    const { rendered } = await submit(cassavaRequest({ crop: 'maize' }));

    expect(diagnoseOffline).not.toHaveBeenCalled();
    expect(enqueueDiagnosisSubmission).toHaveBeenCalled();
    expect(rendered.current.lastOutcome).toBe('queued');
  });

  it('queues when the on-device model will not commit to an answer', async () => {
    diagnoseOffline.mockResolvedValue(UNAVAILABLE);

    const { rendered } = await submit(cassavaRequest());

    // A low score, a photo the decoder rejected, a model that would not load.
    // The farmer has no answer either way, so the photo must not be dropped.
    expect(enqueueDiagnosisSubmission).toHaveBeenCalled();
    expect(rendered.current.lastOutcome).toBe('queued');
  });
});

describe('with AI explanations turned off', () => {
  beforeEach(() => {
    useSettingsStore.setState({ preferOfflineDiagnosis: true });
  });

  it('keeps the phone answer and asks for no explanation', async () => {
    diagnoseOffline.mockResolvedValue(result('offline-model'));

    const { rendered } = await submit(cassavaRequest());

    expect(rendered.current.lastOutcome).toBe('result');
    expect(fetchDiagnosisExplanation).not.toHaveBeenCalled();
  });

  it('still falls through to the provider when the phone declines', async () => {
    diagnoseOffline.mockResolvedValue(UNAVAILABLE);
    submitDiagnosis.mockResolvedValue(result('provider'));

    const { rendered } = await submit(cassavaRequest());

    expect(submitDiagnosis).toHaveBeenCalled();
    expect(rendered.current.lastOutcome).toBe('result');
  });
});

/** Mount the hook, run one submission, and wait for it to settle. */
async function submit(request: DiagnosisRequest) {
  // A fresh client per test, with retries off. The app's shared client would
  // carry mutation state between cases, and its retry policy would turn the
  // "request fails" cases into multi-second waits for an outcome the test
  // already knows.
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false, gcTime: 0 } },
  });
  clients.push(client);
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);

  const rendered = renderHook(() => useDiagnose(), { wrapper }).result;

  await act(async () => {
    await rendered.current.submit(request);
  });
  await waitFor(() => expect(rendered.current.isSubmitting).toBe(false));

  return { rendered };
}
