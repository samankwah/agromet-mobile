import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { fetchDiagnosisExplanation, submitDiagnosis } from '../../../shared/api/diagnosisService';
import type { DiagnosisRequest, DiagnosisResult, DiagnosisUnavailable } from '../../../shared/domain/diagnosis';
import { isDiagnosisUnavailable } from '../../../shared/domain/diagnosis';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { recordDiagnosis, updateDiagnosis } from '../../../shared/storage/diagnosisHistory';
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
  /** True while the AI explanation for the result on screen is on its way. */
  const [isExplaining, setIsExplaining] = useState(false);

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
   * Swap the on-device answer's bundled advice for the AI's plain-words
   * version, if it arrives.
   *
   * Not awaited by `submit`: the farmer reads the knowledge-base answer
   * straight away and the explanation replaces it when it lands. The id check
   * stops a slow reply for one photo from overwriting the answer to the next.
   */
  const explain = useCallback(async (outcome: DiagnosisResult, request: DiagnosisRequest) => {
    setIsExplaining(true);
    try {
      const extra = await fetchDiagnosisExplanation(outcome, request);
      if (!extra) return;

      const enriched = { ...outcome, ...extra };
      setResult((current) => (current?.id === outcome.id ? enriched : current));
      await updateDiagnosis(enriched);
    } finally {
      setIsExplaining(false);
    }
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
    async (request: DiagnosisRequest): Promise<DiagnosisResult | null> => {
      if (!isCropSupportedOffline(request.crop)) return null;

      const outcome = await diagnoseOffline(request);
      if (isDiagnosisUnavailable(outcome)) return null;

      await acceptResult(outcome);
      return outcome;
    },
    [acceptResult],
  );

  const submit = useCallback(
    async (request: DiagnosisRequest) => {
      setResult(null);
      setUnavailable(null);
      setLastOutcome(null);
      setIsExplaining(false);

      const onPhone = isCropSupportedOffline(request.crop);

      // Cassava is always checked on the phone first, whatever the network.
      // This is the pipeline the on-device model exists for: the CNN names the
      // disease, and when there is a connection the backend's language model
      // explains it in plain words. Kindwise is the fallback for when the
      // phone will not commit to an answer, not the other way round.
      if (onPhone) {
        const offline = await tryOffline(request);
        if (offline) {
          if (isOnline && !preferOfflineDiagnosis) void explain(offline, request);
          return;
        }
      }

      if (!isOnline) {
        // Nothing on the phone could answer, so keep the photo for later. A
        // cassava photo only gets here when the model declined, and sending it
        // to the provider once the connection returns is the right next try.
        await enqueueDiagnosisSubmission(request);
        await refreshQueueCount();
        setLastOutcome('queued');
        return;
      }

      try {
        const outcome = await mutation.mutateAsync(request);

        // "The provider could not answer" is a settled outcome, not a failure
        // to retry: sending the same photo again produces the same nothing.
        // For cassava the phone has already declined too, so there is nobody
        // left to ask.
        if (isDiagnosisUnavailable(outcome)) {
          setUnavailable(outcome);
          setLastOutcome('unavailable');
          return;
        }

        await acceptResult(outcome);
      } catch {
        // Appeared online but the request failed anyway (a timeout, a dropped
        // connection mid-upload). Cassava already had its turn on the phone,
        // so there is no second on-device try to make. Queue it rather than
        // lose the farmer's work.
        await enqueueDiagnosisSubmission(request);
        await refreshQueueCount();
        setLastOutcome('queued');
      }
    },
    [acceptResult, explain, isOnline, mutation, preferOfflineDiagnosis, refreshQueueCount, tryOffline],
  );

  /** Back to a blank form. The queue is untouched: a queued submission is still
   * going to send, and clearing the screen must not cancel it. */
  const reset = useCallback(() => {
    setResult(null);
    setUnavailable(null);
    setLastOutcome(null);
    setIsExplaining(false);
  }, []);

  return {
    submit,
    reset,
    result,
    unavailable,
    lastOutcome,
    isSubmitting: mutation.isPending,
    isExplaining,
    queuedCount,
    abandonedCount,
  };
}
