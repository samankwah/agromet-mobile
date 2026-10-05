import React from 'react';
import { StyleSheet } from 'react-native';

import { tint } from '../theme/blend';
import { useTheme } from '../theme/ThemeProvider';
import { Surface } from './Surface';

/**
 * The bottom tab bar's surface: a floating capsule in the same glass style as
 * SegmentedControl, with no rim.
 *
 * The bar is a *floating* panel — inset from the screen edges rather than a
 * full-width strip welded to the bottom. Its fill is the switch track's colour
 * (the text colour at 12% over the page), blended down to an opaque colour
 * rather than left see-through: the bar floats over maps and photographs, and
 * labels on a see-through fill would sit on whatever is scrolling past.
 *
 * It takes the deepest raise in the app. The bar genuinely floats over the
 * scrolling content, and that is the one relationship here the depth language
 * can state literally. Note this reverses the old arrangement, where the bar
 * sat *behind* the page: under soft UI a recessed floating bar reads as a hole
 * cut in the screen. The `chrome` fill is kept, though — a shade below the
 * page keeps the bar reading as navigation rather than as one more card, and
 * the lift now carries the separation the darkness used to. With the rim gone
 * the lift is also the bar's only edge over content of a similar colour.
 *
 * The inset itself is not set here; it comes from `tabBarStyle`'s margins in
 * app/(tabs)/_layout.tsx, so the navigator still measures the bar's full box
 * and the scene ends above it.
 *
 * This used to paint a chamfered SVG path, which needed an `onLayout` measure
 * and a one-frame rounded fallback before the first paint. A rounded bar needs
 * neither, so both are gone.
 */
export function TabBarBackground() {
  const theme = useTheme();

  return (
    <Surface
      pointerEvents="none"
      // `lifted`, not `raised`. The bar is inset from the screen edges, so both
      // halves of a pair would land on screen — but it floats over whatever the
      // current tab is showing, and that is not always its own page. Over the
      // forecasts map the highlight had nothing to bevel against and drew a
      // white band across the screen above the bar. Home hid it only because
      // that page is already near-white.
      depth="lifted"
      level="lg"
      radius={theme.radii.pill}
      background={tint(theme.colors.text, theme.colors.bg, 0.12)}
      bordered={false}
      style={StyleSheet.absoluteFill}
    />
  );
}
