import { classifyActivity } from './classifyActivity';

/**
 * Activity colours come from the fill of a cell in an uploaded spreadsheet.
 * The theme does not control them, and they are not sanitised on the way in
 * — `#FFFFFF` and `#000000` are both real values in the current data. These
 * helpers keep an arbitrary palette legible without discarding it, because
 * a farmer who already knows the printed calendar recognises "the red row".
 */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export type Rgb = { r: number; g: number; b: number };

export function parseHex(input: string | null | undefined): Rgb | null {
  if (!input) return null;
  const match = HEX.exec(input.trim());
  if (!match) return null;

  let hex = match[1];
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(color: string): number {
  const rgb = parseHex(color);
  if (!rgb) return 0.5;

  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Whichever of the two inks reads against `background`. */
export function readableInkOn(background: string, darkInk: string, lightInk: string): string {
  return relativeLuminance(background) > 0.45 ? darkInk : lightInk;
}

/**
 * Fits a spreadsheet colour to the current scheme.
 *
 * Only lightness is adjusted, never hue: a near-black fill is lifted so it
 * can't vanish into a dark background, and a near-white one is dropped so
 * it can't vanish into a light one. Re-hueing would break recognition of
 * the printed calendar this is derived from.
 */
export function fitSwatchToScheme(color: string | null | undefined, scheme: 'light' | 'dark', fallback: string): string {
  const rgb = parseHex(color);
  if (!rgb) return fallback;

  const luminance = relativeLuminance(toHex(rgb));

  if (scheme === 'dark' && luminance < 0.05) {
    const lift = (value: number) => value + (255 - value) * 0.4;
    return toHex({ r: lift(rgb.r), g: lift(rgb.g), b: lift(rgb.b) });
  }

  if (scheme === 'light' && luminance > 0.92) {
    const drop = (value: number) => value * 0.82;
    return toHex({ r: drop(rgb.r), g: drop(rgb.g), b: drop(rgb.b) });
  }

  return toHex(rgb);
}

/**
 * The colour an activity gets when the spreadsheet supplied none.
 *
 * Ported from the web app's `SmartCalendarRenderer.getActivityColor`, which
 * is the map farmers actually see there — so an unstyled calendar looks the
 * same on both. Keyed on meaning rather than exact wording, since the names
 * come from free text typed into a spreadsheet.
 */
const FALLBACK_BY_KIND: Record<string, string> = {
  planting: '#228B22',
  land: '#BF9000',
  fertilizer: '#FFFF00',
  weeding: '#FF6347',
  pest: '#DC143C',
  harvest: '#008000',
  storage: '#993366',
  water: '#4169E1',
  brooding: '#FFB6C1',
  feeding: '#F0E68C',
  vaccination: '#FF6347',
  biosecurity: '#1F497D',
  monitoring: '#00B0F0',
};

export function fallbackActivityColor(activityName: string, fallback: string): string {
  return FALLBACK_BY_KIND[classifyActivity(activityName)] ?? fallback;
}
