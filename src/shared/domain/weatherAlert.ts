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
 *
 * The CAP fields below (`urgency`, `certainty`, `provenance`, `sourceUrl`) were
 * added so the alert surfaces can read the way a met service's do. Every one is
 * derived from data that already arrives; none is invented. What is deliberately
 * NOT here matters as much:
 *
 *   - **No `observed` certainty.** A forecast-driven index has observed nothing.
 *     Reserving the value keeps it meaningful if a real feed ever supplies it.
 *   - **No `certainty` on an issued bulletin.** `hazard_overrides` has no
 *     certainty column, so inferring one from a human's headline would be
 *     invention. The issuer's name is the stronger signal anyway.
 *   - **No `future`/`past` urgency.** Both need a CAP `onset`, and the backend
 *     attaches none to a computed reading. Do not synthesise one.
 *   - **No `msgType`/`references`/per-message `identifier`.** Those need message
 *     history, and there is none: `synthesiseAlerts` is a pure function of the
 *     current snapshot, recomputed on every render. There is nothing to update,
 *     cancel or reference.
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
  /**
   * CAP `onset` — when the hazard itself is expected to begin, as distinct from
   * when the message was issued.
   *
   * Optional because almost nothing here has one. A computed reading is a
   * multi-day condition index with no onset at all, and the backend only serves
   * a bulletin once `effective_from` has already passed. `isCurrent` honours it
   * whenever it is set, so a nowcast feed that does supply one needs no change
   * beyond populating this field.
   */
  onset?: string; // ISO 8601
  /** CAP `urgency`, narrowed to the two values this data can support. */
  urgency: 'immediate' | 'expected';
  /** CAP `certainty`. Absent on an issued bulletin — see the note above. */
  certainty?: 'likely' | 'possible';
  /**
   * Where the alert came from, and the one distinction the UI must never lose.
   *
   * `issued` is a human bulletin in `hazard_overrides`; `computed` is a 0-100
   * model index with nobody in the loop. Dressing the second in the first's
   * clothing would make automated guidance look like a GMet warning.
   */
  provenance: 'issued' | 'computed';
  /** CAP `web` — where the reading's data comes from, when there is a page for
   * it. */
  sourceUrl?: string;
  /** The measurements behind the reading. Evidence, not predicted impact. */
  evidence: string[];
  farmerActions: string[]; // short, action-oriented
  source: string; // e.g. "Ghana Meteorological Agency (GMet)"
};

/**
 * What a computed reading is attributed to, everywhere it is named.
 *
 * Lives here rather than in `hazardAlerts.ts` because both the builder and the
 * formatters below need it, and this module is the leaf of that pair — putting
 * it the other way round would make the import cycle.
 */
export const COMPUTED_ALERT_ATTRIBUTION = 'AgroMet hazard model';

/**
 * Who is answerable for the alert, short enough for a caption.
 *
 * A bulletin credits its issuer verbatim ("Ghana Meteorological Agency
 * (GMet)"). A computed reading credits its own model, never GMet — the flood
 * index says "AgroMet hazard model", the severe-weather forecast says "AgroMet
 * forecast". Both live in `alert.source` with a data-source parenthetical
 * ("... (Open-Meteo, GloFAS v4)") that is too long for a caption, so it is
 * trimmed here.
 */
export function alertAttribution(alert: WeatherAlert): string {
  if (alert.provenance === 'issued') return alert.source;
  return alert.source.replace(/\s*\([^)]*\)\s*$/, '');
}

/** CAP `urgency`, in the words a farmer reads rather than CAP's vocabulary. */
export function alertUrgencyLabel(alert: WeatherAlert): string {
  return alert.urgency === 'immediate' ? 'Happening now' : 'Expected';
}

/**
 * The CAP triple on one line: urgency, certainty when there is one, and who it
 * came from.
 *
 * Provenance belongs in this line rather than buried at the foot of the details
 * screen, because "expected · possible · AgroMet hazard model" and "happening
 * now · Ghana Meteorological Agency (GMet)" call for different responses and a
 * reader should not have to open anything to tell them apart.
 */
export function alertProvenanceLine(alert: WeatherAlert): string {
  const parts: string[] = [alertUrgencyLabel(alert)];
  if (alert.certainty) parts.push(alert.certainty);
  parts.push(alertAttribution(alert));
  return parts.join(' · ');
}
