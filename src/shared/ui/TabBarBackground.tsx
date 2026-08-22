import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';
import { chamferedRectPath } from './cardShape';

/**
 * The bottom tab bar's surface: the same chamfered silhouette as a Card, but
 * outlined in an accent-tinted rim rather than the neutral hairline.
 *
 * In the reference design the bar is a *floating* panel — inset from the screen
 * edges rather than a full-width strip welded to the bottom — and its outline is
 * visibly green where a card's is blue-grey. That tint is what marks it as
 * chrome rather than content, so it is worth keeping distinct from
 * `colors.border`.
 *
 * The inset itself is not set here; it comes from `tabBarStyle`'s margins in
 * app/(tabs)/_layout.tsx, so the navigator still measures the bar's full box
 * and the scene ends above it. Positioning the bar absolutely instead would let
 * every tab screen's scroll content run underneath it.
 *
 * `tint` (not an alpha suffix) because this fill must be opaque — see
 * theme/blend.ts.
 */
export function TabBarBackground() {
  const theme = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // Measured off the reference: bar fill sits *below* the page in luminance
  // (hence `chrome`, not `surface`) and the rim is very close to the theme's
  // own accentStrong — #95eeb8 measured against #94e2b8 in the dark palette.
  const fill = theme.colors.chrome;
  const stroke = theme.colors.accentStrong;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
        ? prev
        : { width, height },
    );
  };

  const path = size
    ? chamferedRectPath({
        width: size.width,
        height: size.height,
        // No minorChamfer: it defaults to `chamfer`, cutting all four corners
        // equally. That symmetry is what separates the bar from a Card, whose
        // two cut sizes are deliberately unequal.
        chamfer: theme.cardShape.chamfer,
      })
    : null;

  return (
    <View
      onLayout={handleLayout}
      style={[
        StyleSheet.absoluteFill,
        // Same one-frame fallback as Card: a plain rounded surface until the
        // first layout gives a size to draw the path against.
        size ? null : { backgroundColor: fill, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: stroke },
      ]}
    >
      {size && path ? (
        <Svg pointerEvents="none" width={size.width} height={size.height}>
          <Path d={path} fill={fill} stroke={stroke} strokeWidth={1} />
        </Svg>
      ) : null}
    </View>
  );
}
