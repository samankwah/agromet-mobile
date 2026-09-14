import { getDistrictById } from '../data/districts';
import { formatDriverMeasurement } from './hazard';
import type { HazardBlock, HazardKind, HazardRegion, HazardSummary } from './hazard';
import { alertSeverityForBand, getHazardBandMeta, HAZARD_BAND_MIN_SCORE } from './hazardBand';
import { ALERT_SEVERITY_ORDER } from './alertSeverity';
import { COMPUTED_ALERT_ATTRIBUTION, type WeatherAlert } from './weatherAlert';

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
 * How long a computed reading stands before it comes off the banner.
 *
 * Ten minutes, at the user's explicit instruction after being shown what it
 * costs. **Read the next paragraph before changing this back or tuning it.**
 *
 * The trade is severe and was made with open eyes. `issuedAt` for a computed
 * reading is `summary.computedAt` — the model run time — and the backend
 * refreshes that every six hours (`CACHE_TTL_SECONDS` in
 * `backend/app/hazard_runtime.py`). So a ten-minute window means an emergency
 * flood reading is on the banner for ten minutes out of every three hundred and
 * sixty: a farmer opening the app during an extreme-band event sees it roughly
 * 3% of the time. The alternative offered was to run the ten minutes from when
 * each reader first saw it, which is cadence-independent; the literal reading
 * was chosen instead.
 *
 * Nothing is deleted by this — Flood & Drought still shows every region at every
 * band, and `/alert/[id]` still resolves for a saved reminder's deep link. What
 * lapses is the interruption.
 *
 * Deliberately NOT applied to a published bulletin that states its own
 * `effectiveTo`: a forecaster's warning period is the forecaster's to set, and
 * overriding a six-hour GMet bulletin with ten minutes would be the app
 * second-guessing a human alerting authority — the one thing `provenance`
 * exists to prevent.
 */
export const HAZARD_ALERT_VALIDITY_MINUTES = 10;

/**
 * How long a published bulletin stands when it states no end.
 *
 * `hazard_overrides.effective_to` is nullable, and a bulletin with an open-ended
 * window must not inherit the ten-minute rule above — a forecaster who declined
 * to set an end did not mean "ten minutes". A day is the same honest outer bound
 * this constant's predecessor used for everything.
 */
export const BULLETIN_FALLBACK_VALIDITY_HOURS = 24;

/**
 * How far into its band a score must sit before the reading is called `likely`
 * rather than `possible`.
 *
 * Bands are twenty points wide, so ten is the halfway line: a score in the
 * lower half of its band is one revision away from dropping out of it, and
 * calling that `likely` would claim more than a 0-100 index can support.
 *
 * A judgement call, and the first thing to tune if forecasters say the app
 * either cries wolf or hedges too much.
 */
const CERTAINTY_DEPTH_POINTS = 10;

/**
 * How many contributing measurements must agree before the reading is called
 * `likely`.
 *
 * One driver can carry a score alone — flood weights river discharge at 0.4 —
 * and a single-source reading is exactly the case CAP's `possible` exists for.
 * Two independent measurements pointing the same way is the cheapest available
 * check that the score is not an artefact of one feed.
 */
const CERTAINTY_MIN_AGREEING_DRIVERS = 2;

/** A driver counts as elevated at the score the band scale itself calls
 * `moderate`. One threshold, one meaning. */
const DRIVER_ELEVATED_SCORE = HAZARD_BAND_MIN_SCORE.moderate;

/**
 * How long before an alert's onset it starts showing.
 *
 * A met service does not put a warning on screen the moment it is drafted; it
 * appears as the hazard approaches and comes down once the system has passed.
 * This is the lead edge of that window.
 *
 * **It cannot bite on today's data, and that is not an oversight.** Two things
 * would have to change first:
 *
 *   1. The flood/drought index has no onset. It is a multi-day condition index
 *      built from 7-day rainfall, GloFAS discharge and 90-day soil moisture —
 *      there is no minute at which "the event occurs", so `onset` is left unset
 *      and this window never applies.
 *   2. A human bulletin does have one (`effective_from`), but `_active_overrides`
 *      in `backend/app/main.py` filters to `effective_from <= CURRENT_TIMESTAMP`
 *      before the client sees anything. A bulletin is therefore never visible
 *      *before* it is in force, so there is nothing for a lead time to hold back.
 *
 * A fifteen-minute lead belongs to a nowcast — convective storms and lightning,
 * where a met service does warn minutes ahead. Open-Meteo's `minutely_15` series
 * could feed one; nothing in this repo does yet. The mechanism is here and
 * tested so that populating `onset` is the only work left when it is.
 */
export const ALERT_LEAD_TIME_MINUTES = 15;

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

/**
 * When an alert stops standing.
 *
 * Three cases, and the ordering matters: a bulletin's own stated end wins over
 * everything; a bulletin without one gets a day; a computed reading gets the ten
 * minutes described on `HAZARD_ALERT_VALIDITY_MINUTES`.
 */
function expiryFor(block: HazardBlock, issuedAt: string): string {
  if (block.overridden) {
    if (block.effectiveTo) return block.effectiveTo;
    return new Date(new Date(issuedAt).getTime() + BULLETIN_FALLBACK_VALIDITY_HOURS * 3600_000).toISOString();
  }
  return new Date(new Date(issuedAt).getTime() + HAZARD_ALERT_VALIDITY_MINUTES * 60_000).toISOString();
}

/**
 * One driver, as a line a farmer can read.
 *
 * The gloss wins outright when there is one. The backend writes it for exactly
 * this purpose and it already carries the figure in readable form — "27 mm in a
 * day, against 17 mm for a heavy day here at this time of year" — so prefixing
 * the raw value said the number twice, rounded differently each time ("Heaviest
 * forecast day: 26.9 mm — 27 mm in a day"). It also printed units nobody reads:
 * "Soil saturation: 0.96 fraction".
 *
 * Nothing is lost by dropping the raw figure. River discharge in m³/s is the one
 * driver whose gloss omits its own value, and 6667.07 m³/s tells a farmer less
 * than "higher than 94% of daily flows on this reach since 1995" does. The
 * monitoring screen (`HazardDrivers`) still shows every raw value beside its
 * gloss for anyone who wants it.
 */
function evidenceLine(driver: HazardBlock['drivers'][number]): string {
  if (driver.gloss) return `${driver.label}: ${driver.gloss}`;

  return `${driver.label}: ${formatDriverMeasurement(driver.value as number, driver.unit).text}`;
}

/**
 * CAP `certainty` for a computed reading.
 *
 * Never called for a bulletin: `hazard_overrides` carries no certainty, and
 * guessing one from a forecaster's wording would be invention.
 */
function certaintyFor(block: HazardBlock): 'likely' | 'possible' {
  const floor = HAZARD_BAND_MIN_SCORE[getHazardBandMeta(block.band).band];
  const deepInBand = block.score >= floor + CERTAINTY_DEPTH_POINTS;
  // A driver with a null value contributed nothing measured, whatever score the
  // backend gave it.
  const agreeing = block.drivers.filter(
    (driver) => driver.value !== null && driver.score >= DRIVER_ELEVATED_SCORE,
  ).length;

  return deepInBand && agreeing >= CERTAINTY_MIN_AGREEING_DRIVERS ? 'likely' : 'possible';
}

/**
 * CAP `web`. The primary dataset behind the reading, when it publishes a page.
 *
 * A bulletin gets none: nothing in `hazard_overrides` holds a link, and
 * pointing a reader at Open-Meteo for a human-issued warning would attribute it
 * to the wrong body.
 */
function sourceUrlFor(summary: HazardSummary): string | undefined {
  return summary.sources.find((entry) => entry.url)?.url;
}

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

  const expiresAt = expiryFor(block, issuedAt);

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
    // Extreme is the only band whose own description tells a reader to act
    // rather than to prepare (`hazardBand.ts`), so it is the only one this data
    // can honestly call immediate.
    urgency: getHazardBandMeta(block.band).band === 'extreme' ? 'immediate' : 'expected',
    certainty: block.overridden ? undefined : certaintyFor(block),
    // Only a bulletin has one. `effective_from` is when the forecaster declared
    // the warning period open, which is the nearest thing this system holds to
    // an onset; a computed reading gets none rather than a fabricated one.
    onset: block.overridden ? (block.issuedAt ?? undefined) : undefined,
    provenance: block.overridden ? 'issued' : 'computed',
    sourceUrl: block.overridden ? undefined : sourceUrlFor(summary),
    // The drivers, stated as the measurements they are. These explain how the
    // reading was arrived at — they are NOT predictions of impact, and the UI
    // heading must not present them as such.
    evidence: block.drivers.filter((driver) => driver.value !== null).map(evidenceLine),
    farmerActions: block.advisories,
    source: block.overridden
      ? (block.issuedBy ?? 'Ghana Meteorological Agency (GMet)')
      : `${COMPUTED_ALERT_ATTRIBUTION} (${summary.sources.map((entry) => entry.label).join(', ')})`,
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

/**
 * Whether an alert is loud enough for the banner on Home and Advisories.
 *
 * `synthesiseAlerts` decides what is an alert at all; this decides what
 * interrupts someone who came to the app for the weather. They are different
 * questions, and conflating them is how a warning banner becomes furniture.
 *
 * The matrix, in full:
 *
 * | band → severity        | certainty `possible` | certainty `likely` |
 * |------------------------|----------------------|--------------------|
 * | moderate → `watch`     | no                   | no                 |
 * | severe   → `warning`   | **yes**              | **yes**            |
 * | extreme  → `emergency` | **yes**              | **yes**            |
 *
 * Certainty does not discriminate inside that table, and that is deliberate
 * rather than an oversight: a *severe* reading is worth a farmer's attention
 * even when the model is only confident enough to say `possible`. Certainty
 * changes the wording the banner uses, not whether it appears. It is a
 * parameter here so the day a forecaster wants `possible` warnings held back,
 * the change is one line in a tested function.
 *
 * The rule that overrides the matrix: **an issued bulletin always shows, at any
 * severity.** A human alerting authority has decided it matters, and the app
 * does not second-guess that. This is the only place `provenance` changes
 * behaviour rather than presentation.
 *
 * Nothing is lost by filtering: Flood & Drought reads the summary directly and
 * still shows every region at every band, and `/alert/[id]` still resolves for
 * anything gated out — so a saved reminder's deep link keeps working.
 */
/**
 * Whether an alert is live *now* — past its lead edge and not yet expired.
 *
 * The expiry half was missing entirely: `buildAlert` computed `expiresAt`, the
 * details screen printed it, and nothing ever compared it to a clock. Offline
 * that mattered most, because `useCachedQuery` serves the last snapshot from
 * disk, so a lapsed flood warning stayed on screen indefinitely on exactly the
 * connection where a farmer could not check it against anything else.
 *
 * Kept out of `synthesiseAlerts` on purpose. That function is pure and its tests
 * pin exact timestamps; reading a clock inside it would make every one of them
 * depend on the day they ran. The clock is an application concern, so it is
 * applied where alerts reach a screen — `useAlerts` and `AlertDetailsScreen`,
 * whose "no longer active" empty state is already the right thing to show.
 *
 * An unparseable stamp counts as live. Hiding a warning because a date failed to
 * parse is the worse of the two failures.
 */
export function isCurrent(alert: WeatherAlert, now: number = Date.now()): boolean {
  const expires = new Date(alert.expiresAt).getTime();
  if (!Number.isNaN(expires) && now > expires) return false;

  if (alert.onset) {
    const onset = new Date(alert.onset).getTime();
    if (!Number.isNaN(onset) && now < onset - ALERT_LEAD_TIME_MINUTES * 60_000) return false;
  }

  return true;
}

export function reachesBanner(alert: WeatherAlert): boolean {
  if (alert.provenance === 'issued') return true;
  return alert.severity === 'warning' || alert.severity === 'emergency';
}
