import React, { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Fill, Shader } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import { useDerivedValue } from 'react-native-reanimated';

import type { Rgb, SkyScene } from '../../domain/skyScene';
import { useReduceMotion } from '../../a11y/useReduceMotion';
import { cloudEffect, cloudUniforms } from './cloudShader';
import { SkyLightning } from './SkyLightning';
import { SkyRain } from './SkyRain';
import { useSkyClock } from './useSkyClock';

/**
 * The shader draws at a third of the screen's size and is scaled up. Cloud has
 * no hard edges to lose, so the difference does not show, and it is a ninth of
 * the pixels for the low-end Android phones this app targets.
 */
const SCALE = 3;

/** One pass of the drift clock. The clouds move continuously within it and
 * jump once at the wrap, so it is long: two hours. */
const DRIFT_LOOP_MS = 2 * 60 * 60 * 1000;
const RAIN_LOOP_MS = 2_400;

const css = ([r, g, b]: Rgb) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

/**
 * The sky behind the Daily and Weekly forecast, in the manner of a phone's own
 * weather app: real cloud cover drawn as soft cloud, drifting slowly, with rain
 * and lightning over it when the weather has them. `domain/skyScene.ts` decides
 * what is in it; `cloudShader.ts` draws the sky and cloud.
 *
 * Still, with everything else the same, when the phone asks for reduced motion
 * and while the tab is out of view, so a hidden screen costs nothing.
 *
 * Decorative: hidden from screen readers. The condition is written on screen.
 */
export function AnimatedSky({ scene }: { scene: SkyScene }) {
  // Sized from its own box, not the window. On Android, drawing edge to edge,
  // the window height leaves out the status and gesture bars, so a sky sized
  // from it stopped about 70dp short and the page showed through behind the
  // tab bar. The window is only the first guess, before layout reports.
  const windowSize = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const width = box?.width ?? windowSize.width;
  const height = box?.height ?? windowSize.height;
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const moving = focused && !reduceMotion;

  const effect = useMemo(() => cloudEffect(), []);
  const small = { width: Math.ceil(width / SCALE), height: Math.ceil(height / SCALE) };

  const drift = useSkyClock(DRIFT_LOOP_MS, moving && effect !== null);
  const rainClock = useSkyClock(RAIN_LOOP_MS, moving && scene.precip !== 'none');

  const uniforms = useDerivedValue(() => cloudUniforms(scene, small.width, small.height, (drift.value * DRIFT_LOOP_MS) / 1000));

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

      {effect ? (
        <Canvas
          testID="sky-clouds"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: small.width,
            height: small.height,
            // Scaling happens about the view's centre, so it is moved first by
            // its own size to land the enlarged copy on the screen's top left.
            transform: [{ translateX: small.width }, { translateY: small.height }, { scale: SCALE }],
          }}
        >
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : (
        <LinearGradient testID="sky-gradient" colors={[css(scene.skyTop), css(scene.skyBottom)]} style={StyleSheet.absoluteFill} />
      )}

      <SkyRain precip={scene.precip} width={width} height={height} clock={rainClock} />
      {scene.lightning ? <SkyLightning active={moving} /> : null}

      {/* A light shade where the temperature sits, so white type holds on the
          brightest sky. Apple does the same. */}
      <LinearGradient
        colors={['rgba(4,10,20,0.22)', 'rgba(4,10,20,0)', 'rgba(4,10,20,0.12)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
