import React from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Ellipse, G } from 'react-native-svg';

import type { CloudTone, SkyPhase } from '../../domain/skyScene';

/** Each cloud's height on screen, size and speed. Speeds are whole numbers so
 * every cloud wraps exactly when the clock does, with no jump. */
const LAYOUT = [
  { top: 0.06, scale: 1.0, speed: 1, offset: 0.15, depth: 0.55 },
  { top: 0.2, scale: 0.75, speed: 2, offset: 0.6, depth: 0.75 },
  { top: 0.26, scale: 1.15, speed: 1, offset: 0.85, depth: 0.45 },
  { top: 0.12, scale: 0.6, speed: 3, offset: 0.35, depth: 0.9 },
];

const FILL: Record<CloudTone, string> = {
  light: '#ffffff',
  grey: '#c9d1d9',
  dark: '#7d8792',
};

type Props = {
  count: number;
  tone: CloudTone;
  phase: SkyPhase;
  width: number;
  height: number;
  clock: SharedValue<number>;
};

/** A soft cloud from overlapping ellipses: no outline, low opacity, so it reads
 * as vapour rather than a cartoon. */
function CloudShape({ width, fill, opacity }: { width: number; fill: string; opacity: number }) {
  return (
    <Svg width={width} height={width * 0.42} viewBox="0 0 200 84">
      <G fill={fill} opacity={opacity}>
        <Ellipse cx="60" cy="56" rx="52" ry="24" />
        <Ellipse cx="100" cy="40" rx="46" ry="32" />
        <Ellipse cx="142" cy="54" rx="50" ry="26" />
        <Ellipse cx="80" cy="34" rx="30" ry="22" />
        <Ellipse cx="124" cy="30" rx="26" ry="20" />
      </G>
    </Svg>
  );
}

function Cloud({ index, tone, phase, width, height, clock }: Omit<Props, 'count'> & { index: number }) {
  const layout = LAYOUT[index];
  const cloudWidth = width * 0.75 * layout.scale;
  // Kept faint: a cloud drifting behind the temperature must not pale the
  // white text over it. Seen on a device, 0.4 and above already did. After
  // dark they are dimmer still, read as night cloud rather than white shapes
  // pasted on a black sky.
  const opacity = phase === 'night' ? 0.08 + 0.14 * layout.depth : 0.14 + 0.24 * layout.depth;

  const style = useAnimatedStyle(() => {
    const progress = (clock.value * layout.speed + layout.offset) % 1;
    return { transform: [{ translateX: progress * (width + cloudWidth) - cloudWidth }] };
  });

  return (
    <Animated.View style={[{ position: 'absolute', top: height * layout.top, left: 0 }, style]}>
      <CloudShape width={cloudWidth} fill={FILL[tone]} opacity={opacity} />
    </Animated.View>
  );
}

export function SkyClouds({ count, ...rest }: Props) {
  return (
    <>
      {LAYOUT.slice(0, count).map((_, index) => (
        <Cloud key={index} index={index} {...rest} />
      ))}
    </>
  );
}
