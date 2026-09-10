import { File } from 'expo-file-system';

import { postJson } from './http';
import { confidenceBucket } from '../utils/confidenceBucket';
import { formatConfidenceRange } from '../utils/formatConfidenceRange';

/**
 * Ask about a photo inside the chat.
 *
 * Reuses POST /api/image-analysis, which is the same Kindwise engine the
 * Diagnose screen calls but shaped for a conversation. `/api/chat` is text
 * only, so an image question goes here rather than widening that endpoint to
 * carry pictures it cannot read.
 *
 * The reply is prose because it lands in a chat bubble. Someone who wants the
 * structured version, with the actions numbered and the photo kept on file,
 * has the Diagnose screen for that, and this answer says so.
 */

/** Same budget as the diagnosis path: an upload plus a provider round trip. */
const IMAGE_QUESTION_TIMEOUT_MS = 30_000;

type ImageAnalysisDto = {
  status?: string;
  message?: string;
  analysis?: {
    identified_disease?: string;
    confidence?: number | null;
    treatment?: string;
    plant?: string;
    disclaimer?: string;
  } | null;
};

export async function askAboutPhoto(imageUri: string, crop?: string, region?: string): Promise<string> {
  const image = await new File(imageUri).base64();

  const dto = await postJson<ImageAnalysisDto>(
    '/api/image-analysis',
    { image, analysisType: 'disease-detection', context: { crop, region } },
    { timeoutMs: IMAGE_QUESTION_TIMEOUT_MS },
  );

  return formatImageAnswer(dto);
}

/** Exported for tests: the wording is the whole product here. */
export function formatImageAnswer(dto: ImageAnalysisDto): string {
  const analysis = dto.analysis;

  // No answer is a real outcome, not an error to hide. The server explains
  // itself in `message`, and repeating that beats a generic apology.
  if (dto.status !== 'ok' || !analysis || analysis.confidence === null || analysis.confidence === undefined) {
    return dto.message?.trim() || 'I could not identify anything from that photo. Try a closer, clearer picture in daylight.';
  }

  const { band, range } = confidenceBucket(analysis.confidence);
  const lines = [
    `This looks like ${analysis.identified_disease} on ${analysis.plant}.`,
    formatConfidenceRange(band, range) + '.',
  ];

  if (analysis.treatment) lines.push('', analysis.treatment);
  // Pointing at the fuller answer rather than duplicating it here: that screen
  // keeps the photo, numbers the steps, and files the result in history.
  lines.push('', 'For the full version with the steps in order, use Diagnose a crop.');

  return lines.join('\n');
}
