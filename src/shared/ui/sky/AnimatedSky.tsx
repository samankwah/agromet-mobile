import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { SkyScene } from '../../domain/skyScene';
import { useReduceMotion } from '../../a11y/useReduceMotion';
import { SkyLightning } from './SkyLightning';
import { SkyRain } from './SkyRain';
import { SKY_IMAGES } from './skyImages';
import { useSkyClock } from './useSkyClock';

/** How much larger than the screen the painting is drawn, which is the room it
 * has to drift in. */
const OVERSCAN = 1.12;

/** One slow sweep across and back: the clouds' drift, as on the phone's own
 * weather app. Slow enough that it reads as weather, not as motion. */
const DRIFT_MS = 90_000;
const RAIN_LOOP_MS = 2_400;

/**
 * The sky behind the Daily and Weekly forecast: a painted sky for the weather
 * now (`domain/skyScene.ts` picks it from the real cloud cover, the weather
 * code and the sunrise and sunset), drifting slowly, with rain and lightning
 * drawn live on top when the weather has them.
 *
 * The paintings are made offline by `scripts/render-skies.py` at a quality a
 * live drawing cannot reach on a low-end phone, and shipped in the app, so the
 * sky shows offline. The drift is one transform on the UI thread.
 *
 * Still when the phone asks for reduced motion and while the tab is out of
 * view. Decorative: hidden from screen readers. The condition is written on
 * screen.
 */
export function AnimatedSky({ scene }: { scene: SkyScene }) {
  // Sized from its own box, not the window. On Android, drawing edge to edge,
  // the window height leaves out the status and gesture bars, so a sky sized
  // from it stopped short and the page showed through behind the tab bar.
  const windowSize = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const width = box?.width ?? windowSize.width;
  const height = box?.height ?? windowSize.height;

  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const moving = focused && !reduceMotion;

  const drift = useSharedValue(0);
  useEffect(() => {
    if (!moving) return undefined;
    drift.value = withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(drift);
  }, [moving, drift]);

  const rainClock = useSkyClock(RAIN_LOOP_MS, moving && scene.precip !== 'none');

  const spareX = (width * (OVERSCAN - 1)) / 2;
  const spareY = (height * (OVERSCAN - 1)) / 2;
  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (drift.value * 2 - 1) * spareX }, { translateY: (drift.value * 2 - 1) * spareY * 0.25 }],
  }));

  return (
    <View
      testID="animated-sky"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        if (w > 0 && h > 0 && (w !== box?.width || h !== box?.height)) setBox({ width: w, height: h });
      }}
    >
      {/* The sky is always dark enough for the clock and battery to go light
          over it. Only while the tab is in view: the tabs stay mounted, and a
          status bar left here would turn Home's icons white on a light page. */}
      {focused ? <StatusBar style="light" /> : null}

      <Animated.View
        style={[{ position: 'absolute', left: -spareX, top: -spareY, width: width * OVERSCAN, height: height * OVERSCAN }, driftStyle]}
      >
        <Image
          testID={`sky-${scene.backdrop}`}
          source={SKY_IMAGES[scene.backdrop]}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          fadeDuration={250}
        />
      </Animated.View>

      <SkyRain precip={scene.precip} width={width} height={height} clock={rainClock} />
      {scene.lightning ? <SkyLightning active={moving} /> : null}

      {/* A light shade where the temperature sits, so white type holds on the
          brightest sky. Apple does the same. */}
      <LinearGradient
        colors={['rgba(4,10,20,0.18)', 'rgba(4,10,20,0)', 'rgba(4,10,20,0.12)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
