import { siteUrl } from '../config/links';

/**
 * The message a farmer sends when sharing the app.
 *
 * There is no native share sheet in this app and no store listing to link to —
 * it is not published. So sharing follows the same route every other outward
 * link takes (`utils/buildMarketOrderText.ts`, `ShareWhatsAppButton.tsx`): a
 * pure text builder here, handed to `Linking.openURL` with a `wa.me` link by
 * the caller. WhatsApp because that is where this audience already shares.
 *
 * The site link is included only when configured; without it the message still
 * says something useful rather than trailing off into an empty line.
 */
export function buildAppShareText(): string {
  const site = siteUrl();

  return [
    'AgroMet Ghana',
    '',
    'Free weather forecasts, crop advisories and market prices for Ghanaian farmers, from the Ghana Meteorological Agency.',
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
