import React, { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { useReduceMotion } from '../a11y/useReduceMotion';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';

type Props = {
  width?: ViewStyle['width'];
  height?: number;
  /**
   * Height follows width instead of being fixed — for placeholders standing
   * in for an image whose box is known by ratio but not in pixels.
   */
  aspectRatio?: number;
  /** Defaults to the small radius; pass a matching value for circles/pills. */
  radius?: number;
  style?: ViewStyle;
};

/**
 * A placeholder block that pulses while real content loads.
 *
 * Built on React Native's own Animated rather than Reanimated or a shimmer
 * library: CalendarGrid already establishes Animated as the house tool, and
 * a two-stop opacity loop needs nothing more. No new dependency.
 *
 * Why a skeleton rather than the spinner AsyncStateView shows by default: a
 * spinner says "something is happening"; a skeleton in the shape of the
 * screen says "this is what is coming, and it will not jump when it does".
 * On a slow rural connection — the case this app is built for — that is the
 * difference between a blank wait and a page you can already read the
 * structure of.
 *
 * Motion is dropped entirely when the device asks for reduced motion; the
 * block still renders, it just holds still.
 */
export function Skeleton({ width = '100%', height = 16, aspectRatio, radius, style }: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.6);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      // One "Loading" announcement per screen comes from the wrapper below,
      // so the individual blocks stay silent rather than reading out a dozen
      // meaningless placeholders.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          ...(aspectRatio ? { aspectRatio } : { height }),
          borderRadius: radius ?? theme.radii.sm,
          backgroundColor: theme.colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Wraps a screen's skeleton so assistive tech hears one clear "Loading"
 * rather than nothing at all — the placeholder blocks themselves are hidden
 * from the accessibility tree.
 */
export function SkeletonScreen({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ gap: theme.spacing.lg }}>
      {children}
    </View>
  );
}

/**
 * A run of text lines. The last is short, because real paragraphs end
 * mid-line — a stack of equal-length bars reads as a barcode, not as prose.
 */
export function SkeletonText({ lines = 2, height = 12, lastWidth = '55%' }: { lines?: number; height?: number; lastWidth?: ViewStyle['width'] }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? lastWidth : '100%'} height={height} />
      ))}
    </View>
  );
}

/**
 * A card-shaped placeholder, for the many screens whose loading unit is one
 * Card rather than a whole screen. Carries its own "Loading" announcement,
 * which is right when each card is backed by its own query — as on Home,
 * where four cards load independently.
 */
export function SkeletonCard({ children, gap }: { children: React.ReactNode; gap?: number }) {
  const theme = useTheme();

  return (
    <Card
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ gap: gap ?? theme.spacing.md }}
    >
      {children}
    </Card>
  );
}
