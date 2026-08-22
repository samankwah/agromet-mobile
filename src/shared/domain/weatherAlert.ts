import type { AlertSeverity } from './alertSeverity';

/**
 * A weather hazard alert.
 *
 * Now populated for real, from the flood/drought index at `/api/hazards/*` via
 * `hazardAlerts.ts` — the mock fixtures this was designed against are gone.
 *
 * Two fields changed shape when the real data arrived, and both are worth
 * knowing about:
 *
 *   - `district` became optional. The readings are REGIONAL; a district is named
 *     only when one of the reader's saved districts unambiguously identifies it.
 *     Attaching a district to a regional measurement would be false precision.
 *   - `expectedImpacts` became `evidence`. Nothing upstream publishes expected
 *     impacts. What is available is the measurements behind the score, which
 *     explain how it was reached but say nothing about consequences — so the
 *     field is named for what it actually holds.
 */
export type WeatherAlert = {
  id: string;
  headline: string;
  /** Only set when a single saved district pins the alert to one place; these
   * readings are regional. */
  district?: string;
  region: string;
  hazardType: string; // e.g. "Heavy Rainfall", "Drought"
  severity: AlertSeverity;
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  /** The measurements behind the reading. Evidence, not predicted impact. */
  evidence: string[];
  farmerActions: string[]; // short, action-oriented
  source: string; // e.g. "Ghana Meteorological Agency (GMet)"
};
