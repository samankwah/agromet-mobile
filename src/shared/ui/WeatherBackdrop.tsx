import React, { useMemo } from 'react';
import { View } from 'react-native';

import { skyScene, type CloudCover } from '../domain/skyScene';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED } from './PhotoBackdrop';
import { AnimatedSky } from './sky/AnimatedSky';
import { SkyTintContext } from './sky/SkyTint';

type Props = {
  /** WMO code of the current reading: decides rain and lightning. */
  weatherCode: number;
  /** With the clock, decides dawn, day, dusk or night. */
  isDay: boolean;
  observedAt: string;
  /** Percent of sky covered, by height. Decides how much cloud is drawn. */
  cloudCover?: CloudCover;
  /** Metres. Decides the haze. */
  visibilityM?: number;
  children: React.ReactNode;
};

/**
 * The Daily and Weekly view's backdrop: the sky as it is now, drawn from the
 * real cloud cover and drifting slowly, with the forecast on top. The cards
 * inside take their glass colour from it. See `sky/AnimatedSky.tsx`.
 */
export function WeatherBackdrop({ weatherCode, isDay, observedAt, cloudCover, visibilityM, children }: Props) {
  const total = cloudCover?.total;
  const low = cloudCover?.low;
  const mid = cloudCover?.mid;
  const high = cloudCover?.high;
  // Keyed on the figures rather than the object, so a refetch that brings the
  // same cover in a new object does not rebuild the scene.
  const scene = useMemo(
    () =>
      skyScene({
        weatherCode,
        isDay,
        observedAt,
        cloudCover:
          total === undefined || low === undefined || mid === undefined || high === undefined ? undefined : { total, low, mid, high },
        visibilityM,
      }),
    [weatherCode, isDay, observedAt, total, low, mid, high, visibilityM],
  );
  return (
    <SkyTintContext.Provider value={scene.glass}>
      <View style={{ flex: 1 }}>
        <AnimatedSky scene={scene} />
        {children}
      </View>
    </SkyTintContext.Provider>
  );
}

/** Re-exported so the screens drawing text on the backdrop keep one import. */
export { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED };
