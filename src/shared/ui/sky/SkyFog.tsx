import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

/** Two wide bands of mist, twice the screen's width, drifting slowly sideways
 * and wrapping, at different heights and speeds. */
const BANDS = [
  { top: 0.38, speed: 1, opacity: 0.32 },
  { top: 0.62, speed: 2, opacity: 0.26 },
];

type BandProps = (typeof BANDS)[number] & { width: number; height: number; clock: SharedValue<number> };

function Band({ top, speed, opacity, width, height, clock }: BandProps) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -((clock.value * speed) % 1) * width }] }));
  return (
    <Animated.View style={[{ position: 'absolute', top: height * top, left: 0, width: width * 2, height: height * 0.3, opacity }, style]}>
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']} style={{ flex: 1 }} />
    </Animated.View>
  );
}

export function SkyFog({ width, height, clock }: { width: number; height: number; clock: SharedValue<number> }) {
  return (
    <>
      {BANDS.map((band, index) => (
        <Band key={index} {...band} width={width} height={height} clock={clock} />
      ))}
    </>
  );
}
