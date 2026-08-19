import type { DiagnosisConfidenceBand } from '../domain/diagnosis';

const BAND_LABEL: Record<DiagnosisConfidenceBand, string> = {
  low: 'Low confidence',
  moderate: 'Moderate confidence',
  high: 'High confidence',
};

/** Always renders a range, never a single point value — an AI result
 * should never claim more precision than it has. */
export function formatConfidenceRange(band: DiagnosisConfidenceBand, range: [number, number]): string {
  const [low, high] = range;
  return `${BAND_LABEL[band]} (${low}–${high}%)`;
}
