import type { AlertSeverity } from './alertSeverity';

/**
 * A published agro-advisory. Mirrors the shape of the backend's
 * `weekly_advisories` table (backend/app/domain.py `serialize_advisory`) —
 * title/summary/farmerActions/districts/crops — so a real
 * GET /api/weekly-advisories integration is close to a field rename, not a
 * reshape. `severity` reuses AlertSeverity so advisories render through the
 * same SeverityBadge component as weather alerts — one implementation, not
 * two near-identical ones.
 */
export type AgroAdvisory = {
  id: string;
  title: string;
  districts: string[];
  crops: string[];
  publishedAt: string; // ISO 8601
  validUntil: string; // ISO 8601
  summary: string;
  farmerActions: string[]; // short, action-oriented, e.g. "Delay fertilizer application until rainfall reduces."
  severity: AlertSeverity;
  /** Additive discriminant (not a type split) — 'crop-specific' records
   * populate crop/growthStage/district for filtering in the future Advisory
   * Centre; 'general' records leave them unset. A single shape stays
   * lower-friction than a parallel CropAdvisory type for content that only
   * differs in what's populated, not in structure. */
  kind: 'general' | 'crop-specific';
  crop?: string;
  growthStage?: string;
  district?: string;
};
