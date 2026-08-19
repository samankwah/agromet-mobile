export function formatWind(speedKph: number): string {
  if (!Number.isFinite(speedKph)) return '—';
  return `${Math.round(speedKph)} km/h`;
}
