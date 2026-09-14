import { postForm } from './http';

/**
 * Turn a recording into text.
 *
 * The transcript goes into the composer's draft rather than being sent, so the
 * farmer reads it first. Transcription of accented English over a rural
 * connection is not reliable enough to send unread, and a wrong question
 * answered confidently is worse than no question.
 */

/** Uploading audio over a rural connection needs longer than the default. */
const TRANSCRIBE_TIMEOUT_MS = 60_000;

type TranscriptDto = { success?: boolean; text?: string };

export async function transcribeRecording(uri: string): Promise<string> {
  const form = new FormData();
  // React Native's FormData takes this shape for a file rather than a Blob.
  form.append('audio', {
    uri,
    name: 'question.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  const dto = await postForm<TranscriptDto>('/api/transcribe', form, { timeoutMs: TRANSCRIBE_TIMEOUT_MS });
  return (dto.text ?? '').trim();
}
