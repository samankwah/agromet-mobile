/** Formats a Celsius value for display. Metric-only app — there is no unit
 * parameter, deliberately, so a Fahrenheit value never sneaks in by accident. */
export function formatTemperature(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value)}°C`;
}
