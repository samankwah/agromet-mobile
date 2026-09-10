import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';
import { chamferedRectPath } from './cardShape';

/**
 * One tab's button, carrying the selected tab's filled highlight.
 *
 * The navigator's default button only recolours the icon and label, which left
 * the selected tab reading as "slightly greener text" rather than a selected
 * thing. This paints a filled block behind the focused tab's icon and label,
 * the way a selected chip works elsewhere in the app.
 *
 * Chamfered, not rounded: `borderRadius` cannot cut a corner straight, and a
 * pill inside this bar would be the only rounded shape on the screen. It takes
 * `nestedChamfer` with square minor corners, which is the treatment tokens.ts
 * documents for a block sitting *inside* a card — the bar being the card here.
 *
 * `colors.focus`/`onFocus` rather than `accent`/`onAccent`: those are the
 * palette's designated selected-chip pair, already used by SegmentedControl's
 * pill variant, and `onFocus` is scheme-independent so one active tint reads
 * correctly on the fill in both themes.
 *
 * The fill stretches to the slot minus a fixed inset. Every slot is the same
 * width, so every highlight is too, and the selected block lands on the same
 * rhythm wherever it moves — which the labels alone do not do, ranging from
 * "Home" to "Advisories".
 *
 * That inset is applied to the *painted path only*, never to the layout box:
 * taking it as a margin instead cost the widest label ("Farm Tools") the room
 * it needs and truncated it to an ellipsis.
 *
 * Built on PlatformPressable, the same component the navigator's own button
 * uses, so press feedback and the tab's accessibility wiring are unchanged.
 */

/** How far the fill sits inside its slot, leaving a gutter between neighbours.
 * The pair of them comes to `spacing.sm`, the app's standard small gap. */
const HIGHLIGHT_INSET = 4;

/** The navigator's own per-tab padding (its `tabVerticalUiKit` style), cancelled
 * so the highlight spans the whole slot. Left in place it costs 5dp a side, and
 * the fill ends up narrower than the widest label sitting on it. */
const NAV_TAB_PADDING = 5;

export function TabBarButton({ children, style, ...props }: BottomTabBarButtonProps) {
  const theme = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // v7 of bottom-tabs marks the focused tab with `aria-selected`, not
  // `accessibilityState.selected` (see its BottomTabItem). Reading the latter
  // silently never matches, and the highlight never paints.
  const focused = props['aria-selected'] === true;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5 ? prev : { width, height }));
  };

  const fillWidth = size ? Math.max(0, size.width - HIGHLIGHT_INSET * 2) : 0;

  // Only the focused tab paints one, so the path is built for that tab alone
  // rather than memoised across all five.
  const path =
    focused && size
      ? chamferedRectPath({
          width: fillWidth,
          height: size.height,
          chamfer: theme.cardShape.nestedChamfer,
          // Square minor corners, per tokens.ts: a nested block pairs its cut
          // with genuinely square corners, unlike the bar's symmetrical octagon.
          minorChamfer: 0,
          // No stroke to keep inside, so the fill runs to the path's own edge.
          inset: 0,
        })
      : null;

  return (
    <PlatformPressable {...props} style={[style, styles.pressable]}>
      {/* Chrome on a nested View, never on the Pressable: Android drops a
          Pressable's own background while still drawing its children.
          Card.tsx and CityCarousel document the same constraint. */}
      <View onLayout={handleLayout} style={styles.item}>
        {path && size ? (
          <Svg pointerEvents="none" style={[styles.fill, { left: HIGHLIGHT_INSET }]} width={fillWidth} height={size.height}>
            <Path d={path} fill={theme.colors.focus} />
          </Svg>
        ) : null}
        {children}
      </View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  // `alignSelf: 'stretch'` is load-bearing: the navigator's own tab style sets
  // `alignItems: 'center'`, so without it this View shrinks to its content and
  // the highlight comes out as narrow as the icon rather than filling the slot.
  item: {
    flex: 1,
    alignSelf: 'stretch',
    marginHorizontal: -NAV_TAB_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Positioned rather than absoluteFill: the fill is narrower than its slot, so
  // it needs an explicit left edge to sit on.
  fill: { position: 'absolute', top: 0 },
});
