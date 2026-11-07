import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { skyScene, type CloudCover } from '../domain/skyScene';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED } from './PhotoBackdrop';
import { AnimatedSky } from './sky/AnimatedSky';
import { SkyTintContext } from './sky/SkyTint';

type Props = {
  /** WMO code of the current reading: decides rain and lightning. */
  weatherCode: number;
  /** Where the reading is for: the sunrise and sunset that decide dawn, day,
   * dusk and night are worked out for this place and the time now. */
  lat: number;
  lng: number;
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
/** The current time, moved on once a minute so the sky turns over at dusk
 * while the screen is open. */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function WeatherBackdrop({ weatherCode, lat, lng, cloudCover, visibilityM, children }: Props) {
  const now = useMinute();
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
        at: now,
        lat,
        lng,
        cloudCover:
          total === undefined || low === undefined || mid === undefined || high === undefined ? undefined : { total, low, mid, high },
        visibilityM,
      }),
    [weatherCode, now, lat, lng, total, low, mid, high, visibilityM],
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
