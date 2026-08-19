import type { Ionicons } from '@expo/vector-icons';

/**
 * The four severity levels used across the app, shared by both weather
 * alerts (weatherAlert.ts) and advisories (advisory.ts) so there is exactly
 * one severity-rendering component (SeverityBadge) anywhere in the app.
 *
 * No real alert pipeline exists anywhere in the AgroMet codebase yet — the
 * web app's Alert Status card hardcodes "Normal" and its CAP-alert wiring
 * (the icon asset is literally named CAP.png, for the Common Alerting
 * Protocol) is stubbed to null. This type is a fresh design, built against
 * mock data, but shaped to align with CAP so a real GMet/CAP feed can
 * populate it later without a rename:
 *
 *   normal    — no active CAP alert
 *   watch     — CAP severity "Moderate"
 *   warning   — CAP severity "Severe"
 *   emergency — CAP severity "Extreme"
 */
export type AlertSeverity = 'normal' | 'watch' | 'warning' | 'emergency';

export const ALERT_SEVERITY_ORDER: AlertSeverity[] = ['normal', 'watch', 'warning', 'emergency'];

export type SeverityMeta = {
  severity: AlertSeverity;
  label: string;
  description: string;
  /** Key into theme.severityColors — resolved to an actual color by the
   * component, so this module stays free of any color literal. */
  colorToken: AlertSeverity;
  icon: keyof typeof Ionicons.glyphMap;
  a11yLabel: string;
};

const SEVERITY_META: Record<AlertSeverity, SeverityMeta> = {
  normal: {
    severity: 'normal',
    label: 'Normal',
    description: 'No active weather hazard',
    colorToken: 'normal',
    icon: 'checkmark-circle',
    a11yLabel: 'Weather conditions normal, no active alert',
  },
  watch: {
    severity: 'watch',
    label: 'Watch',
    description: 'Conditions favorable for a hazard to develop',
    colorToken: 'watch',
    icon: 'eye',
    a11yLabel: 'Weather watch in effect',
  },
  warning: {
    severity: 'warning',
    label: 'Warning',
    description: 'Hazardous conditions expected or occurring',
    colorToken: 'warning',
    icon: 'warning',
    a11yLabel: 'Weather warning in effect, take precautions',
  },
  emergency: {
    severity: 'emergency',
    label: 'Emergency',
    description: 'Severe hazard requiring immediate action',
    colorToken: 'emergency',
    icon: 'alert-circle',
    a11yLabel: 'Weather emergency in effect, take action now',
  },
};

/** Pure lookup — the single place severity → label/color/icon is decided. */
export function getSeverityMeta(severity: AlertSeverity): SeverityMeta {
  const meta = SEVERITY_META[severity];
  if (!meta) {
    // Exhaustive-switch guard: any future AlertSeverity member that isn't
    // added to SEVERITY_META fails loudly here instead of rendering blank.
    throw new Error(`getSeverityMeta: unknown severity "${severity}"`);
  }
  return meta;
}

/** Highest-severity item first — used to pick which alert a banner shows
 * when several are active for the user's saved districts. */
export function compareSeverityDesc(a: AlertSeverity, b: AlertSeverity): number {
  return ALERT_SEVERITY_ORDER.indexOf(b) - ALERT_SEVERITY_ORDER.indexOf(a);
}
