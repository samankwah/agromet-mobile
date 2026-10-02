import { useAuthStore } from '../state/authStore';
import { postJson } from './http';

/** Which AI feature produced the answer being reported. */
export type AiReportKind = 'chat' | 'diagnosis';

/** Why the farmer is reporting it. Mirrors `AiReportRequest.reason` in
 * `backend/app/schemas.py`; the server rejects anything else. */
export type AiReportReason = 'wrong' | 'harmful' | 'offensive' | 'other';

/** The choices the report sheet offers, in the order it offers them. Worded
 * for the farmer, not for the moderator who reads the row. */
export const AI_REPORT_REASONS: { id: AiReportReason; label: string }[] = [
  { id: 'wrong', label: 'The answer is wrong' },
  { id: 'harmful', label: 'It could cause harm' },
  { id: 'offensive', label: 'It is rude or offensive' },
  { id: 'other', label: 'Something else' },
];

/** The server's own cap on the reported text. Trimmed here so a long answer
 * is still reported rather than refused. */
const MAX_TEXT = 4000;

type AiReportDto = { success?: boolean; reference?: number };

/**
 * Flags an AI answer for review, without leaving the app.
 *
 * Google Play requires apps with generated content to let people report it
 * in place, and this is that path for AgroMet AI and the diagnosis
 * explanation. The device id travels the same way the chat sends it, so a run
 * of reports from one phone can be read together.
 */
export async function reportAiAnswer(input: { kind: AiReportKind; text: string; reason: AiReportReason }): Promise<number | undefined> {
  const dto = await postJson<AiReportDto>(
    '/api/ai-reports',
    { kind: input.kind, reason: input.reason, text: input.text.trim().slice(0, MAX_TEXT) },
    { headers: { 'X-Device-Id': useAuthStore.getState().guestId } },
  );

  return dto?.reference;
}
