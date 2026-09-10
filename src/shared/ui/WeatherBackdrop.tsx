import React from 'react';

import { getWeatherBackdrop } from '../data/weatherBackdrops';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED, PhotoBackdrop } from './PhotoBackdrop';

type Props = {
  condition: string;
  observedAt: string;
  children: React.ReactNode;
};

/**
 * The Daily view's backdrop — an actual Ghanaian sky matching the current
 * condition and time of day.
 *
 * All this does now is choose the photograph; `PhotoBackdrop` paints it and
 * carries the scrim that makes white text legible over it.
 */
export function WeatherBackdrop({ condition, observedAt, children }: Props) {
  return <PhotoBackdrop source={getWeatherBackdrop(condition, observedAt).source}>{children}</PhotoBackdrop>;
}

/** The photo credit for the currently-shown backdrop. CC BY-SA obliges us
 * to display this, so it's exposed as a first-class helper rather than
 * left to each caller to remember. */
export function getBackdropCredit(condition: string, observedAt: string): string {
  const backdrop = getWeatherBackdrop(condition, observedAt);
  return `${backdrop.place} · ${backdrop.credit} (${backdrop.licence})`;
}

/** Re-exported so callers don't need to reach into the data module. */
export { getWeatherBackdrop };

/** Re-exported from their new home, so the screens already drawing text on this
 * backdrop are untouched by the split. */
export { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED };
