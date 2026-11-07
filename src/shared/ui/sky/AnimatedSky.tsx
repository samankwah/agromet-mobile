import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';

import type { SkyScene } from '../../domain/skyScene';
import { useReduceMotion } from '../../a11y/useReduceMotion';
import { SkyClouds } from './SkyClouds';
import { SkyFog } from './SkyFog';
import { SkyLightning } from './SkyLightning';
import { SkyRain } from './SkyRain';
import { SkyStars } from './SkyStars';
import { SkySun } from './SkySun';
import { useSkyClock } from './useSkyClock';

/** One loop of each clock. Clouds cross the screen in two to four minutes,
 * which is about how fast real cloud drifts at this scale; rain is fast; the
 * sun's glow and the stars breathe slowly. */
const CLOUD_LOOP_MS = 240_000;
const RAIN_LOOP_MS = 2_400;
const GLOW_LOOP_MS = 8_000;
const FOG_LOOP_MS = 180_000;

/**
 * The drawn, moving sky behind the Daily and Weekly forecast, in the manner of
 * a phone's own weather app. `domain/skyScene.ts` decides what is in it; this
 * only paints, back to front: the sky's colour, sun or stars, clouds, fog,
 * rain, lightning, and a light shade so the white text on top stays legible.
 *
 * Cheap enough for the low-end Android phones this app targets: every layer
 * moves by one transform or opacity on the UI thread, with at most a dozen
 * animated views in the worst scene (a storm), and a clock that a scene does
 * not use never starts.
 *
 * Still, and identical otherwise, when the phone asks for reduced motion. Also
 * still while the tab is out of view, so a hidden screen costs nothing.
 *
 * Decorative: hidden from screen readers. The condition is written on screen.
 */
export function AnimatedSky({ scene }: { scene: SkyScene }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const moving = focused && !reduceMotion;

  const cloudClock = useSkyClock(CLOUD_LOOP_MS, moving && scene.clouds.count > 0);
  const rainClock = useSkyClock(RAIN_LOOP_MS, moving && scene.precip !== 'none');
  const glowClock = useSkyClock(GLOW_LOOP_MS, moving && (scene.sun || scene.stars));
  const fogClock = useSkyClock(FOG_LOOP_MS, moving && scene.fog);

  return (
    <View
      testID="animated-sky"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      {/* The sky is always dark, so the clock and battery go light over it.
          Only while the tab is in view: the tabs stay mounted, and a status
          bar left here would turn Home's icons white on a light page. */}
      {focused ? <StatusBar style="light" /> : null}
      <LinearGradient colors={scene.gradient} style={StyleSheet.absoluteFill} />
      {scene.sun ? <SkySun phase={scene.phase} width={width} clock={glowClock} /> : null}
      {scene.stars ? <SkyStars width={width} height={height} clock={glowClock} /> : null}
      <SkyClouds count={scene.clouds.count} tone={scene.clouds.tone} phase={scene.phase} width={width} height={height} clock={cloudClock} />
      {scene.fog ? <SkyFog width={width} height={height} clock={fogClock} /> : null}
      <SkyRain precip={scene.precip} width={width} height={height} clock={rainClock} />
      {scene.lightning ? <SkyLightning active={moving} /> : null}
      {/* Denser at the top, where the temperature and place name sit, and at
          the foot, clear through the middle so the sky still reads. */}
      <LinearGradient
        colors={['rgba(4,10,20,0.32)', 'rgba(4,10,20,0.06)', 'rgba(4,10,20,0.3)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
