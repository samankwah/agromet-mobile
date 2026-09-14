import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { submitDiagnosis } from '../../../shared/api/diagnosisService';
import type { DiagnosisRequest, DiagnosisResult, DiagnosisUnavailable } from '../../../shared/domain/diagnosis';
import { isDiagnosisUnavailable } from '../../../shared/domain/diagnosis';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { recordDiagnosis } from '../../../shared/storage/diagnosisHistory';
import { diagnoseOffline, isCropSupportedOffline } from './localModel';
import {
  enqueueDiagnosisSubmission,
  listQueuedSubmissions,
  listUnsentSubmissions,
  MAX_QUEUE_ATTEMPTS,
  reclaimOrphanedSubmissions,
  removeQueuedSubmission,
  updateQueuedSubmission,
} from '../../../shared/storage/diagnosisQueue';

/**
 * Owns the submit-or-queue decision and the offline queue's auto-retry.
 * DiagnoseScreen only calls `submit()`; it does not need to know whether that
 * produced an answer now or a submission that will sync later.
 *
 * The sweep runs only while this hook is mounted, so a queued submission syncs
 * on the farmer's next visit to the screen rather than in the background.
 * Genuine background sync needs a task runner, which is a larger change than
 * this feature justifies.
 */
export function useDiagnose() {
  const { isOnline } = useNetworkStatus();
  const preferOfflineDiagnosis = useSettingsStore((state) => state.preferOfflineDiagnosis);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [unavailable, setUnavailable] = useState<DiagnosisUnavailable | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [abandonedCount, setAbandonedCount] = useState(0);
  /** What the most recent submit() resolved to, so the screen can tell "queued
   * for later" apart from "here is your answer" without inferring it from
   * queue-count deltas. */
  const [lastOutcome, setLastOutcome] = useState<'result' | 'queued' | 'unavailable' | null>(null);

  const mutation = useMutation({ mutationFn: submitDiagnosis });

  const refreshQueueCount = useCallback(async () => {
    const queue = await listQueuedSubmissions();
    // `syncing` is excluded because it is in flight right now, not waiting.
    setQueuedCount(queue.filter((item) => item.status === 'pending' || item.status === 'failed').length);
    setAbandonedCount(queue.filter((item) => item.status === 'abandoned').length);
  }, []);

  const syncQueue = useCallback(async () => {
    // Anything left `syncing` by a previous run was interrupted, not sent.
    await reclaimOrphanedSubmissions();

    for (const item of await listUnsentSubmissions()) {
      if (item.status === 'syncing') continue;

      const attempts = item.attempts + 1;
      await updateQueuedSubmission(item.localId, { status: 'syncing', attempts });

      try {
        const outcome = await submitDiagnosis(item.request);

        // An answer the farmer never sees is the same as no answer, which is
        // what this queue used to deliver: it resolved a result and discarded
        // it. Writing to history is what makes a queued submission worth
        // making.
        if (!isDiagnosisUnavailable(outcome)) {
          await recordDiagnosis(outcome);
        }
        await removeQueuedSubmission(item.localId);
      } catch {
        // Give up eventually. Retrying forever leaves a badge lit over work
        // that is never going to succeed, with nothing said about it.
        await updateQueuedSubmission(item.localId, {
          status: attempts >= MAX_QUEUE_ATTEMPTS ? 'abandoned' : 'failed',
        });
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
    // Sweep whenever connectivity returns, same rationale (NetInfo).
    if (isOnline) {
      syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const acceptResult = useCallback(async (outcome: DiagnosisResult) => {
    setResult(outcome);
    setLastOutcome('result');
    await recordDiagnosis(outcome);
  }, []);

  /**
   * Try the phone's own model, and say whether it produced anything.
   *
   * Returns false for every reason the on-device path can decline: the crop is
   * not cassava, the score was too low to report, the model would not load.
   * Each of those means the caller still has a photo and no answer, and should
   * queue it rather than leave the farmer with nothing.
   */
  const tryOffline = useCallback(
    async (request: DiagnosisRequest): Promise<boolean> => {
      if (!isCropSupportedOffline(request.crop)) return false;

      const outcome = await diagnoseOffline(request);
      if (isDiagnosisUnavailable(outcome)) return false;

      await acceptResult(outcome);
      return true;
    },
    [acceptResult],
  );

  const submit = useCallback(
    async (request: DiagnosisRequest) => {
      setResult(null);
      setUnavailable(null);
      setLastOutcome(null);

      // The farmer asked for the on-device model explicitly. Honour it even on
      // a good connection: that is the whole point of the setting, and it is
      // also how the two engines get run over the same photograph for
      // comparison.
      if (preferOfflineDiagnosis && (await tryOffline(request))) {
        return;
      }

      if (!isOnline) {
        // Cassava gets an answer now instead of a promise of one later. The
        // submission is deliberately not also queued: a queued copy would come
        // back with the provider's answer and write a second, possibly
        // different, diagnosis of the same photo into history, which is worse
        // than one clear answer the farmer can act on today.
        if (await tryOffline(request)) return;

        await enqueueDiagnosisSubmission(request);
        await refreshQueueCount();
        setLastOutcome('queued');
        return;
      }

      try {
        const outcome = await mutation.mutateAsync(request);

        // "The provider could not answer" is a settled outcome, not a failure
        // to retry: sending the same photo again produces the same nothing.
        // The on-device model is not consulted here either. The stronger engine
        // has already declined, and letting the weaker one answer over the top
        // of it would be shopping for the reply we preferred.
        if (isDiagnosisUnavailable(outcome)) {
          setUnavailable(outcome);
          setLastOutcome('unavailable');
          return;
        }

        await acceptResult(outcome);
      } catch {
        // Appeared online but the request failed anyway (a timeout, a dropped
        // connection mid-upload). The phone can still answer for cassava.
        if (await tryOffline(request)) return;

        // Queue it rather than lose the farmer's work.
        await enqueueDiagnosisSubmission(request);
        await refreshQueueCount();
        setLastOutcome('queued');
      }
    },
    [acceptResult, isOnline, mutation, preferOfflineDiagnosis, refreshQueueCount, tryOffline],
  );

  /** Back to a blank form. The queue is untouched: a queued submission is still
   * going to send, and clearing the screen must not cancel it. */
  const reset = useCallback(() => {
    setResult(null);
    setUnavailable(null);
    setLastOutcome(null);
  }, []);

  return {
    submit,
    reset,
    result,
    unavailable,
    lastOutcome,
    isSubmitting: mutation.isPending,
    queuedCount,
    abandonedCount,
  };
}
