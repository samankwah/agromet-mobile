import type { AlertSeverity } from './alertSeverity';

/**
 * A district-targeted weather hazard alert. There is no backend or CAP feed
 * producing these anywhere in the AgroMet codebase today — this shape is
 * designed so a real GMet/CAP feed can populate it later (see the CAP
 * mapping note in alertSeverity.ts) without any consumer needing to change.
 */
export type WeatherAlert = {
  id: string;
  headline: string;
  district: string;
  region: string;
  hazardType: string; // e.g. "Heavy Rainfall", "Drought"
  severity: AlertSeverity;
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  expectedImpacts: string[];
  farmerActions: string[]; // short, action-oriented
  source: string; // e.g. "Ghana Meteorological Agency (GMet)"
};
