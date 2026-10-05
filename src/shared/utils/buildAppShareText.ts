import { sitePage } from '../config/links';

/**
 * The message a farmer sends when sharing the app.
 *
 * There is no native share sheet in this app. Sharing follows the same route every other outward
 * link takes (`utils/buildMarketOrderText.ts`, `ShareWhatsAppButton.tsx`): a
 * pure text builder here, handed to `Linking.openURL` with a `wa.me` link by
 * the caller. WhatsApp because that is where this audience already shares.
 *
 * The link is the site's download page rather than a store listing: that page
 * sends each phone to its own store, so one message works for Android and
 * iPhone alike. It is included only when the site is configured; without it the
 * message still says something useful rather than trailing off into an empty line.
 */
export function buildAppShareText(): string {
  const site = sitePage('app');

  return [
    'AgroMet Ghana',
    '',
    'Free weather forecasts, crop advisories and market prices for farmers in Ghana.',
    site ? '' : undefined,
    site ?? undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

/** The wa.me link that opens WhatsApp with the share message ready to send. */
export function buildAppShareUrl(): string {
  // No recipient: wa.me with only `text` opens the contact picker, which is
  // what sharing means here — the farmer chooses who gets it.
  return `https://wa.me/?text=${encodeURIComponent(buildAppShareText())}`;
}
