/** Formats a Celsius value for display. Metric-only app — there is no unit
 * parameter, deliberately, so a Fahrenheit value never sneaks in by accident. */
export function formatTemperature(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value)}°C`;
}

/**
 * Degrees without the unit, for dense rows where the unit is already
 * established — the week strip on Home fits seven columns on a 360dp screen,
 * and "28°C" in each of them does not.
 *
 * Separate from `formatTemperature` rather than a parameter on it, so the
 * no-unit case is a deliberate choice at the call site and the default stays
 * the unambiguous one.
 */
export function formatDegrees(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value)}°`;
}
