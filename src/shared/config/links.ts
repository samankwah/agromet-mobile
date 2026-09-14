/**
 * Outward-facing destinations: the public site, and the ways to reach a human.
 *
 * All of these live outside the app, so all of them come from
 * `EXPO_PUBLIC_*` env vars rather than being hardcoded — the site moves, the
 * contact desk changes, and neither should need a rebuild of a screen. This
 * follows `utils/buildMarketOrderText.ts`: each getter returns null when its
 * var is unset, and the caller is expected to say so rather than opening a
 * broken link.
 *
 * These values previously existed only in the sibling web app
 * (`frontend/src/pages/Contact.jsx`). Reading them from the environment keeps
 * one source of truth instead of a second copy that drifts.
 */

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The public site, with any trailing slash removed so paths can be appended. */
export function siteUrl(): string | null {
  const raw = clean(process.env.EXPO_PUBLIC_SITE_URL);
  return raw ? raw.replace(/\/+$/, '') : null;
}

/** A path on the public site, or null when the site is not configured. */
export function sitePage(path: string): string | null {
  const base = siteUrl();
  return base ? `${base}/${path.replace(/^\/+/, '')}` : null;
}

export function contactEmail(): string | null {
  return clean(process.env.EXPO_PUBLIC_CONTACT_EMAIL);
}

export function contactPhone(): string | null {
  return clean(process.env.EXPO_PUBLIC_CONTACT_PHONE);
}

/**
 * Prefers email over phone: a mail client keeps the farmer's question and our
 * reply in one thread, where a call leaves no record either side can re-read.
 * Falls back to `tel:` where only a number is configured.
 */
export function contactUrl(): string | null {
  const email = contactEmail();
  if (email) return `mailto:${email}?subject=${encodeURIComponent('AgroMet Ghana')}`;

  const phone = contactPhone();
  return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
}
