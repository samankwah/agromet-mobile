import React, { useMemo } from 'react';
import { View } from 'react-native';

import { skyScene } from '../domain/skyScene';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED } from './PhotoBackdrop';
import { AnimatedSky } from './sky/AnimatedSky';

type Props = {
  /** WMO code of the current reading, which picks the weather drawn. */
  weatherCode: number;
  /** Open-Meteo's day flag, which with the clock picks dawn, day, dusk or night. */
  isDay: boolean;
  observedAt: string;
  children: React.ReactNode;
};

/**
 * The Daily and Weekly view's backdrop: a drawn sky that shows the weather
 * now, moving, with the forecast on top.
 *
 * This used to be one of six still photographs of Ghanaian skies, chosen from
 * the condition string. The sky now follows the WMO code, so fog, drizzle and
 * a downpour each look like themselves, and it changes through dawn and dusk
 * as well as day and night. See `sky/AnimatedSky.tsx`.
 */
export function WeatherBackdrop({ weatherCode, isDay, observedAt, children }: Props) {
  const scene = useMemo(() => skyScene({ weatherCode, isDay, observedAt }), [weatherCode, isDay, observedAt]);
  return (
    <View style={{ flex: 1 }}>
      <AnimatedSky scene={scene} />
      {children}
    </View>
  );
}

/** Re-exported so the screens drawing text on the backdrop keep one import. */
export { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED };
