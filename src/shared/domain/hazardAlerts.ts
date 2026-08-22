import { getDistrictById } from '../data/districts';
import type { HazardBlock, HazardKind, HazardRegion, HazardSummary } from './hazard';
import { alertSeverityForBand, getHazardBandMeta } from './hazardBand';
import { ALERT_SEVERITY_ORDER } from './alertSeverity';
import type { WeatherAlert } from './weatherAlert';

/**
 * Turns hazard readings into weather alerts.
 *
 * Pure — no I/O, no hooks — so the whole mapping is unit-testable against a
 * fixture summary. This is what replaced `mockAlerts.ts`.
 *
 * The important judgement here is what NOT to emit. Every region carries a band
 * every day, so publishing all of them would leave the banner permanently lit
 * and teach farmers to ignore it. Only moderate-and-above becomes an alert,
 * which is also the backend's own definition of "needs attention".
 */

/**
 * How long a computed reading stands for.
 *
 * The backend attaches no expiry to a computed reading (only a published GMet
 * bulletin carries `effectiveTo`), and the runtime refreshes a few times a day.
 * Twenty-four hours is the honest outer bound, and it stops a cached snapshot
 * presenting a stale reading as current indefinitely.
 *
 * This is not cosmetic: `AlertDetailsScreen`'s RemindMeButton schedules from
 * `expiresAt`, so this constant decides when a farmer's reminder can still
 * fire.
 */
export const HAZARD_ALERT_VALIDITY_HOURS = 24;

const HAZARD_LABEL: Record<HazardKind, string> = { flood: 'Flood', drought: 'Drought' };
const HAZARD_NOUN: Record<HazardKind, string> = { flood: 'flood risk', drought: 'drought stress' };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * A stable id, deliberately free of the band and the timestamp.
 *
 * Encoding either would break `/alert/[id]` deep links and any saved reminder's
 * `sourceRef.alertId` the moment conditions moved. The details screen re-derives
 * from the live summary, so it always shows the current reading anyway.
 */
export const hazardAlertId = (region: string, hazard: HazardKind) => `hazard:${slug(region)}:${hazard}`;

function buildAlert(
  region: HazardRegion,
  hazard: HazardKind,
  block: HazardBlock,
  summary: HazardSummary,
  district: string | undefined,
): WeatherAlert | null {
  const severity = alertSeverityForBand(block.band);
  if (!severity) return null;

  // An alert with nothing to do about it is noise.
  if (block.advisories.length === 0) return null;

  const issuedAt = block.overridden ? (block.issuedAt ?? summary.computedAt) : summary.computedAt;
  // Undatable means unexpirable, and an alert that never expires is worse than
  // no alert.
  if (!issuedAt) return null;

  const expiresAt =
    block.overridden && block.effectiveTo
      ? block.effectiveTo
      : new Date(new Date(issuedAt).getTime() + HAZARD_ALERT_VALIDITY_HOURS * 3600_000).toISOString();

  const bandLabel = getHazardBandMeta(block.band).label;

  return {
    id: hazardAlertId(region.region, hazard),
    // A published bulletin's own words when there is one; otherwise a plain
    // description of what was measured. Never an invented event type.
    headline: block.overridden && block.headline
      ? block.headline
      : `${bandLabel} ${HAZARD_NOUN[hazard]} in ${region.region}`,
    district,
    region: region.region,
    hazardType: HAZARD_LABEL[hazard],
    severity,
    issuedAt,
    expiresAt,
    // The drivers, stated as the measurements they are. These explain how the
    // reading was arrived at — they are NOT predictions of impact, and the UI
    // heading must not present them as such.
    evidence: block.drivers
      .filter((driver) => driver.value !== null)
      .map((driver) =>
        driver.gloss
          ? `${driver.label}: ${driver.value} ${driver.unit} — ${driver.gloss}`
          : `${driver.label}: ${driver.value} ${driver.unit}`,
      ),
    farmerActions: block.advisories,
    source: block.overridden
      ? (block.issuedBy ?? 'Ghana Meteorological Agency (GMet)')
      : `AgroMet hazard model (${summary.sources.map((entry) => entry.label).join(', ')})`,
  };
}

/**
 * Active alerts for the given saved districts, worst first.
 *
 * An empty selection returns alerts for every region, so the banner is not
 * blank before a farmer has chosen anything — the behaviour the mock had.
 */
export function synthesiseAlerts(
  summary: HazardSummary | undefined,
  districtIds: string[],
): WeatherAlert[] {
  if (!summary?.regions?.length) return [];

  // Which districts the reader saved, grouped by the region that actually
  // carries the reading.
  const districtsByRegion = new Map<string, string[]>();
  districtIds.forEach((id) => {
    const district = getDistrictById(id);
    if (!district) return;
    districtsByRegion.set(district.region, [...(districtsByRegion.get(district.region) ?? []), district.name]);
  });

  const scoped = districtIds.length === 0
    ? summary.regions
    : summary.regions.filter((region) => districtsByRegion.has(region.region));

  const alerts: WeatherAlert[] = [];

  scoped.forEach((region) => {
    const districts = districtsByRegion.get(region.region) ?? [];
    // Name a district only when exactly one of the reader's saved districts
    // falls in this region. These are regional indicators — the backend says so
    // in its own limits — and naming a district we did not measure would be a
    // false precision.
    const district = districts.length === 1 ? districts[0] : undefined;

    (['flood', 'drought'] as HazardKind[]).forEach((hazard) => {
      const alert = buildAlert(region, hazard, region[hazard], summary, district);
      if (alert) alerts.push(alert);
    });
  });

  return alerts.sort((a, b) => {
    const bySeverity =
      ALERT_SEVERITY_ORDER.indexOf(b.severity) - ALERT_SEVERITY_ORDER.indexOf(a.severity);
    if (bySeverity !== 0) return bySeverity;
    return a.region.localeCompare(b.region);
  });
}
