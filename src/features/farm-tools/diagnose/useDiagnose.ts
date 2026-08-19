import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { submitDiagnosis } from '../../../shared/api/diagnosisService';
import type { DiagnosisRequest, DiagnosisResult } from '../../../shared/domain/diagnosis';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import {
  enqueueDiagnosisSubmission,
  listQueuedSubmissions,
  removeQueuedSubmission,
  updateQueuedSubmission,
} from '../../../shared/storage/diagnosisQueue';

/**
 * Owns the submit-or-queue decision and the offline queue's auto-retry.
 * DiagnoseScreen only ever calls `submit()` — it doesn't need to know
 * whether that resulted in an immediate result or a queued submission that
 * will sync later.
 */
export function useDiagnose() {
  const { isOnline } = useNetworkStatus();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  /** What the most recent submit() call resolved to — lets the screen tell
   * the farmer "queued for later" apart from "here's your result" without
   * guessing from queue-count deltas. */
  const [lastOutcome, setLastOutcome] = useState<'result' | 'queued' | null>(null);

  const mutation = useMutation({ mutationFn: submitDiagnosis });

  const refreshQueueCount = useCallback(async () => {
    const queue = await listQueuedSubmissions();
    setQueuedCount(queue.filter((item) => item.status !== 'syncing').length);
  }, []);

  const syncQueue = useCallback(async () => {
    const queue = await listQueuedSubmissions();
    for (const item of queue.filter((entry) => entry.status === 'pending')) {
      await updateQueuedSubmission(item.localId, { status: 'syncing', attempts: item.attempts + 1 });
      try {
        await submitDiagnosis(item.request);
        await removeQueuedSubmission(item.localId);
      } catch {
        await updateQueuedSubmission(item.localId, { status: 'failed' });
      }
    }
    await refreshQueueCount();
  }, [refreshQueueCount]);

  useEffect(() => {
    // Synchronizing with an external system (AsyncStorage) on mount, per
    // React's own guidance on valid effect use.
    refreshQueueCount();
  }, [refreshQueueCount]);

  useEffect(() => {
    // Sweep the queue whenever connectivity comes back — synchronizing
    // with an external system (NetInfo), same rationale as above.
    if (isOnline) {
      syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const submit = useCallback(
    async (request: DiagnosisRequest) => {
      setResult(null);
      setLastOutcome(null);

      if (!isOnline) {
        await enqueueDiagnosisSubmission(request);
        await refreshQueueCount();
        setLastOutcome('queued');
        return;
      }

      try {
        const diagnosis = await mutation.mutateAsync(request);
        setResult(diagnosis);
        setLastOutcome('result');
      } catch {
        // Appeared online but the request still failed (e.g. it timed out)
        // — queue it instead of losing the farmer's input.
        await enqueueDiagnosisSubmission(request);
        await refreshQueueCount();
        setLastOutcome('queued');
      }
    },
    [isOnline, mutation, refreshQueueCount],
  );

  return {
    submit,
    result,
    lastOutcome,
    isSubmitting: mutation.isPending,
    queuedCount,
  };
}
