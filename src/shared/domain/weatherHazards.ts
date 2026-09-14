import type { OpenMeteoBundle } from '../api/openMeteo';
import { ALERT_SEVERITY_ORDER, type AlertSeverity } from './alertSeverity';
import type { WeatherAlert } from './weatherAlert';

/**
 * The day's likely severe weather, as alerts.
 *
 * Pure — reads one Open-Meteo bundle and today's / tomorrow's numbers out of it,
 * no I/O — so the whole mapping is unit-testable against a fixture. This is what
 * feeds the banner on Home and Advisories.
 *
 * It replaces the flood/drought index on those surfaces. That index is a
 * seasonal river-and-rainfall *stress* score: in Ghana's rains it holds several
 * regions at "severe" flood every day by design, so surfacing it as a
 * CAP-style event alert lit the banner permanently. It still lives, in full, on
 * the Flood & Drought screen. What a farmer opening the app wants to know is
 * whether a storm, a downpour, dangerous heat or damaging wind is coming in the
 * next day — which is what this reads off the deterministic forecast.
 *
 * Four hazards, today and tomorrow. Thresholds are named constants and are the
 * first thing to tune if forecasters say it cries wolf or stays too quiet.
 */

/** WMO weather codes 95-99 are all thunderstorm; 96 and 99 add hail. */
const STORM_MIN_CODE = 95;
const STORM_HAIL_CODES = new Set([96, 99]);

/** A day's rain total. 30 mm stops field work; 60 mm is the kind of downpour
 * that floods compounds and washes out roads. Both gated on the chance being
 * more than even, so a low-probability outlier does not raise an alert. */
const HEAVY_RAIN_MM = 30;
const TORRENTIAL_RAIN_MM = 60;
const RAIN_PROBABILITY_FLOOR = 60;

/** Feels-like daily high. 40 °C is heat a working day has to be planned around;
 * 43 °C is dangerous for anyone outside through the afternoon. */
const EXTREME_HEAT_C = 40;
const DANGEROUS_HEAT_C = 43;

/** Peak wind gust. 60 km/h tears drying racks and loose roofing; 85 km/h brings
 * down branches and unsecured structures. */
const STRONG_GUST_KPH = 60;
const DAMAGING_GUST_KPH = 85;

type Place = { locationId: string; locationName: string; region: string };

type HazardKey = 'thunderstorm' | 'heavy-rain' | 'extreme-heat' | 'strong-wind';

const HAZARD_TYPE: Record<HazardKey, string> = {
  thunderstorm: 'Thunderstorm',
  'heavy-rain': 'Heavy rain',
  'extreme-heat': 'Extreme heat',
  'strong-wind': 'Strong wind',
};

/** Which hazard leads when two share a severity on the same day. A storm is the
 * one a farmer can least afford to miss. */
const HAZARD_PRIORITY: HazardKey[] = ['thunderstorm', 'heavy-rain', 'strong-wind', 'extreme-heat'];

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Open-Meteo stamps `current.time` local ("2026-09-10T12:00") when
 * `timezone=Africa/Accra` is asked for. Ghana is UTC+0 with no DST, so adding
 * the zone explicitly is both correct and what keeps a phone in another
 * timezone from shifting the stamp. Mirrors `toUtcIso` in `api/openMeteo.ts`.
 */
function stampUtc(localTime: string): string {
  if (localTime.endsWith('Z')) return localTime;
  const withSeconds = localTime.length === 16 ? `${localTime}:00` : localTime;
  return `${withSeconds}.000Z`;
}

function dailyAt(daily: OpenMeteoBundle['daily'], field: string, index: number): number | null {
  return toNumber(daily?.[field]?.[index]);
}

/** Whole days from `now`'s calendar date (Africa/Accra = UTC) to `date`. */
function dayOffset(date: string, now: Date): number {
  const target = Date.parse(`${date}T00:00:00.000Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (Number.isNaN(target)) return NaN;
  return Math.round((target - today) / 86_400_000);
}

/**
 * The earliest hour on `date` that reads as a storm, as a 24h number, or null.
 * Used to say "this afternoon" rather than just "today".
 */
function stormHour(hourly: OpenMeteoBundle['hourly'], date: string): number | null {
  const times = (hourly?.time ?? []) as string[];
  for (let i = 0; i < times.length; i += 1) {
    if (!times[i]?.startsWith(date)) continue;
    const code = toNumber(hourly?.weather_code?.[i]);
    const cape = toNumber(hourly?.cape?.[i]);
    if ((code !== null && code >= STORM_MIN_CODE) || (cape !== null && cape >= 1500)) {
      return Number(times[i].slice(11, 13));
    }
  }
  return null;
}

function whenPhrase(offset: number, hour: number | null): string {
  if (offset !== 0) return 'tomorrow';
  if (hour === null) return 'today';
  if (hour < 11) return 'this morning';
  if (hour < 16) return 'this afternoon';
  if (hour < 20) return 'this evening';
  return 'tonight';
}

const STORM_ACTIONS = [
  'Bring livestock under cover and secure loose roofing and materials.',
  'Stay away from tall trees and metal fences while the storm is overhead.',
  'Hold off on field work until it has passed.',
];
const HEAVY_RAIN_ACTIONS = [
  'Clear drainage channels and lift stored produce off the ground.',
  'Keep harvested crops covered; field work will stop.',
  'Do not cross streams or low-lying paths at the height of the rain.',
];
const HEAT_ACTIONS = [
  'Work the early morning and late afternoon, and rest through midday.',
  'Keep drinking water within reach and watch livestock for heat stress.',
  'Shade young seedlings and anything transplanted in the last week.',
];
const WIND_ACTIONS = [
  'Secure loose roofing, drying racks and light structures.',
  'Stake or tie tall crops that are close to harvest.',
  'Delay spraying; drift will be heavy.',
];

type Finding = {
  hazard: HazardKey;
  severity: AlertSeverity;
  headline: string;
  evidence: string[];
  farmerActions: string[];
  onsetHour: number | null;
};

function evaluateDay(
  daily: OpenMeteoBundle['daily'],
  hourly: OpenMeteoBundle['hourly'],
  index: number,
  offset: number,
): Finding[] {
  const date = String(daily?.time?.[index] ?? '');
  const findings: Finding[] = [];

  // Thunderstorm
  const code = dailyAt(daily, 'weather_code', index);
  if (code !== null && code >= STORM_MIN_CODE) {
    const hail = STORM_HAIL_CODES.has(code);
    const hour = offset === 0 ? stormHour(hourly, date) : null;
    findings.push({
      hazard: 'thunderstorm',
      severity: hail ? 'emergency' : 'warning',
      headline: `Thunderstorms likely ${whenPhrase(offset, hour)}${hail ? ', with hail possible' : ''}`,
      evidence: [`Forecast: thunderstorms (weather code ${code})`],
      farmerActions: STORM_ACTIONS,
      onsetHour: hour,
    });
  }

  // Heavy rain
  const rainMm = dailyAt(daily, 'precipitation_sum', index);
  const rainProb = dailyAt(daily, 'precipitation_probability_max', index) ?? 100;
  if (rainMm !== null && rainMm >= HEAVY_RAIN_MM && rainProb >= RAIN_PROBABILITY_FLOOR) {
    findings.push({
      hazard: 'heavy-rain',
      severity: rainMm >= TORRENTIAL_RAIN_MM ? 'emergency' : 'warning',
      headline: `Heavy rain expected ${whenPhrase(offset, null)}, around ${Math.round(rainMm)} mm`,
      evidence: [`Rain total: about ${Math.round(rainMm)} mm`, `Chance of rain: ${Math.round(rainProb)}%`],
      farmerActions: HEAVY_RAIN_ACTIONS,
      onsetHour: null,
    });
  }

  // Extreme heat — feels-like where available, air temperature otherwise
  const feels = dailyAt(daily, 'apparent_temperature_max', index);
  const airMax = dailyAt(daily, 'temperature_2m_max', index);
  const heat = feels ?? airMax;
  if (heat !== null && heat >= EXTREME_HEAT_C) {
    const usingFeels = feels !== null;
    findings.push({
      hazard: 'extreme-heat',
      severity: heat >= DANGEROUS_HEAT_C ? 'emergency' : 'warning',
      headline: `Extreme heat ${whenPhrase(offset, null)}, ${usingFeels ? 'feels like ' : 'up to '}${Math.round(heat)}°C`,
      evidence: usingFeels
        ? [`Feels-like high: ${Math.round(heat)}°C`, airMax !== null ? `Air temperature high: ${Math.round(airMax)}°C` : '']
        : [`Air temperature high: ${Math.round(heat)}°C`],
      farmerActions: HEAT_ACTIONS,
      onsetHour: null,
    });
  }

  // Strong wind — gusts where available, sustained wind otherwise
  const gust = dailyAt(daily, 'wind_gusts_10m_max', index);
  const meanWind = dailyAt(daily, 'wind_speed_10m_max', index);
  const wind = gust ?? meanWind;
  if (wind !== null && wind >= STRONG_GUST_KPH) {
    const usingGust = gust !== null;
    findings.push({
      hazard: 'strong-wind',
      severity: wind >= DAMAGING_GUST_KPH ? 'emergency' : 'warning',
      headline: `Strong winds ${whenPhrase(offset, null)}, ${usingGust ? 'gusts to ' : 'winds to '}${Math.round(wind)} km/h`,
      evidence: usingGust
        ? [`Peak gusts: ${Math.round(wind)} km/h`, meanWind !== null ? `Sustained wind: ${Math.round(meanWind)} km/h` : '']
        : [`Sustained wind: ${Math.round(wind)} km/h`],
      farmerActions: WIND_ACTIONS,
      onsetHour: null,
    });
  }

  return findings;
}

export function synthesiseWeatherAlerts(
  bundle: OpenMeteoBundle,
  place: Place,
  now: Date = new Date(),
): WeatherAlert[] {
  const daily = bundle.daily;
  const dates = (daily?.time ?? []) as string[];
  if (dates.length === 0) return [];

  const issuedAt = stampUtc(String(bundle.current?.time ?? now.toISOString()));
  const alerts: WeatherAlert[] = [];

  dates.forEach((date, index) => {
    const offset = dayOffset(date, now);
    if (offset !== 0 && offset !== 1) return;

    evaluateDay(daily, bundle.hourly, index, offset).forEach((finding) => {
      const immediate = offset === 0 && finding.severity === 'emergency';
      alerts.push({
        id: `weather:${place.locationId}:${finding.hazard}:${date}`,
        headline: finding.headline,
        district: place.locationName,
        region: place.region,
        hazardType: HAZARD_TYPE[finding.hazard],
        severity: finding.severity,
        issuedAt,
        // Ghana is UTC+0, so the local day boundary is the UTC one.
        expiresAt: `${date}T23:59:59.000Z`,
        onset:
          finding.onsetHour !== null
            ? `${date}T${String(finding.onsetHour).padStart(2, '0')}:00:00.000Z`
            : undefined,
        urgency: immediate ? 'immediate' : 'expected',
        certainty: offset === 0 ? 'likely' : 'possible',
        provenance: 'computed',
        sourceUrl: 'https://open-meteo.com/',
        evidence: finding.evidence.filter(Boolean),
        farmerActions: finding.farmerActions,
        source: 'AgroMet forecast (Open-Meteo)',
      });
    });
  });

  return alerts.sort((a, b) => {
    const bySeverity =
      ALERT_SEVERITY_ORDER.indexOf(b.severity) - ALERT_SEVERITY_ORDER.indexOf(a.severity);
    if (bySeverity !== 0) return bySeverity;
    const byDay = a.expiresAt.localeCompare(b.expiresAt);
    if (byDay !== 0) return byDay;
    return hazardRank(a) - hazardRank(b);
  });
}

function hazardRank(alert: WeatherAlert): number {
  const key = alert.id.split(':')[2] as HazardKey;
  const rank = HAZARD_PRIORITY.indexOf(key);
  return rank === -1 ? HAZARD_PRIORITY.length : rank;
}
