/**
 * Formats an ISO timestamp relative to `now` — "5 minutes ago" for the
 * past (weather updates, cache freshness) or "in 21 hours" for the future
 * (an alert's expiry time). `now` is injectable so tests are deterministic
 * instead of depending on the real clock.
 */
export function formatRelativeTime(isoString: string, now: Date = new Date()): string {
  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return '—';

  const diffMs = now.getTime() - then.getTime();
  const isPast = diffMs >= 0;
  const absMs = Math.abs(diffMs);

  // Checked before rounding to minutes — otherwise a 45+ second gap rounds
  // up to "1 minute" and never hits this branch.
  if (absMs < 45_000) return 'just now';

  const unit = pickUnit(Math.round(absMs / 60_000));
  return isPast ? `${unit} ago` : `in ${unit}`;
}

function pickUnit(absMinutes: number): string {
  if (absMinutes < 60) {
    return `${absMinutes} minute${absMinutes === 1 ? '' : 's'}`;
  }
  const hours = Math.round(absMinutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}
