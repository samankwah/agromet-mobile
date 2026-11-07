import React from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import type { SkyPhase } from '../../domain/skyScene';

/**
 * A glow in the top corner rather than a drawn disc: the light of the sun, the
 * way a phone camera sees it, without a yellow circle competing with the
 * temperature for attention. Warmer and lower at dawn and dusk.
 */
export function SkySun({ phase, width, clock }: { phase: SkyPhase; width: number; clock: SharedValue<number> }) {
  const warm = phase === 'dawn' || phase === 'dusk';
  const size = width * 1.3;
  const colour = warm ? '#ffc387' : '#fff3c4';

  // One slow breath per clock cycle.
  const style = useAnimatedStyle(() => {
    const breath = Math.sin(clock.value * Math.PI * 2);
    return { opacity: 0.85 + breath * 0.15, transform: [{ scale: 1 + breath * 0.04 }] };
  });

  return (
    <Animated.View
      testID="sky-sun"
      style={[{ position: 'absolute', width: size, height: size, top: warm ? -size * 0.25 : -size * 0.45, right: -size * 0.4 }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="skySun" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colour} stopOpacity={0.75} />
            <Stop offset="0.18" stopColor={colour} stopOpacity={0.4} />
            <Stop offset="1" stopColor={colour} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#skySun)" />
      </Svg>
    </Animated.View>
  );
}
