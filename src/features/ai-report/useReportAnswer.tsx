import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { AI_REPORT_REASONS, reportAiAnswer, type AiReportKind, type AiReportReason } from '../../shared/api/aiReportService';
import { NetworkError } from '../../shared/api/http';
import { OptionSheet } from '../../shared/ui/OptionSheet';

/**
 * Lets a farmer flag an AI answer as wrong, harmful or offensive, in place.
 *
 * Returns the trigger and the reason sheet separately so a screen mounts one
 * sheet however many answers it shows: the chat transcript can hold a couple of
 * hundred, and a modal per bubble would be a modal per turn (the same reason
 * `MessageList` keeps one actions sheet).
 *
 * The outcome is an `Alert`, like the menu's other one-line confirmations. A
 * failure says so plainly and nothing is retried behind the farmer's back: a
 * report is worth sending once, deliberately.
 */
export function useReportAnswer(kind: AiReportKind) {
  const [pendingText, setPendingText] = useState<string | null>(null);

  const requestReport = useCallback((text: string) => setPendingText(text), []);

  const send = useCallback(
    (reason: string) => {
      const text = pendingText;
      setPendingText(null);
      if (!text) return;

      reportAiAnswer({ kind, text, reason: reason as AiReportReason })
        .then(() => Alert.alert('Thank you', 'We will look at this answer.'))
        .catch((error: unknown) =>
          Alert.alert(
            'Report not sent',
            error instanceof NetworkError
              ? 'Could not reach the AgroMet server. Check your connection and try again.'
              : 'Something went wrong. Please try again later.',
          ),
        );
    },
    [kind, pendingText],
  );

  const sheet = (
    <OptionSheet
      visible={pendingText !== null}
      options={AI_REPORT_REASONS}
      selectedId=""
      onSelect={send}
      onClose={() => setPendingText(null)}
      title="What is wrong with this answer?"
    />
  );

  return { requestReport, sheet };
}
