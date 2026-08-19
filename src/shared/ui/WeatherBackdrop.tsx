import React from 'react';
import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getWeatherBackdrop } from '../data/weatherBackdrops';

type Props = {
  condition: string;
  observedAt: string;
  children: React.ReactNode;
};

/** Text and icons sitting directly on the backdrop. Fixed rather than
 * theme-derived, because the backdrop follows the weather, not light/dark
 * mode — and the scrim below guarantees these stay legible. */
export const ON_BACKDROP_COLOR = '#ffffff';
export const ON_BACKDROP_MUTED = 'rgba(255,255,255,0.82)';

/**
 * A full-bleed photographic backdrop for the Daily view — an actual
 * Ghanaian sky matching the current condition and time of day.
 *
 * The scrim is the load-bearing part. Photographs have unpredictable
 * local brightness (a pale cloud, a lit building), so white text placed
 * directly on one is legible only by luck. A dark gradient scrim over the
 * whole image forces a predictable floor of contrast regardless of which
 * photo is showing or what's in it — the standard technique for text over
 * imagery, and non-negotiable for an app used outdoors in daylight.
 */
export function WeatherBackdrop({ condition, observedAt, children }: Props) {
  const backdrop = getWeatherBackdrop(condition, observedAt);

  return (
    <ImageBackground source={backdrop.source} resizeMode="cover" style={{ flex: 1 }}>
      {/* Denser at the top, where the hero text sits, easing downward so
          the photograph still reads through the lower half. */}
      <LinearGradient
        colors={['rgba(8,20,32,0.78)', 'rgba(8,20,32,0.58)', 'rgba(8,20,32,0.72)']}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {children}
      </LinearGradient>
    </ImageBackground>
  );
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
