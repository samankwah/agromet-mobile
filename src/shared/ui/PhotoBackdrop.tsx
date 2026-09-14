import React from 'react';
import { ImageBackground, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  source: ImageSourcePropType;
  children: React.ReactNode;
};

/** Text and icons sitting directly on a backdrop. Fixed rather than
 * theme-derived, because a photograph is as dark as it is in both schemes —
 * and the scrim below guarantees these stay legible. */
export const ON_BACKDROP_COLOR = '#ffffff';
export const ON_BACKDROP_MUTED = 'rgba(255,255,255,0.82)';

/**
 * A full-bleed photograph with a scrim over it, and whatever sits on top.
 *
 * The scrim is the load-bearing part. Photographs have unpredictable local
 * brightness (a pale cloud, a lit building), so white text placed directly on
 * one is legible only by luck. A dark gradient over the whole image forces a
 * predictable floor of contrast regardless of which photo is showing or what is
 * in it — the standard technique for text over imagery, and non-negotiable for
 * an app used outdoors in daylight.
 *
 * Split out from `WeatherBackdrop`, which chooses its image from the current
 * condition and time of day. The welcome screen needs a *fixed* photograph, and
 * the only way to get one from `WeatherBackdrop` would be to hand it a weather
 * condition it is not describing — a lie in the code to obtain the right
 * picture. So the picture-choosing and the scrim are now separate jobs.
 */
export function PhotoBackdrop({ source, children }: Props) {
  return (
    <ImageBackground source={source} resizeMode="cover" style={{ flex: 1 }}>
      {/* Denser at the top, where the hero text sits, easing downward so the
          photograph still reads through the middle, then firming up again at
          the foot where a caption or an action sits. */}
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
