import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { PlatformPressable } from 'expo-router/react-navigation';

import { useTheme } from '../theme/ThemeProvider';
import { Surface } from './Surface';
import { TAB_BAR_PADDING } from './tabBarLayout';

/**
 * One tab's button, carrying the selected tab's highlight.
 *
 * The navigator's default button only recolours the icon and label, which left
 * the selected tab reading as "slightly greener text" rather than a selected
 * thing. This paints a filled block behind the focused tab's icon and label,
 * the way a selected chip works elsewhere in the app.
 *
 * The block matches SegmentedControl's selected segment: a flat capsule of the
 * text colour at 24% over the bar's 12% track, with no rim and no shadow, so
 * the tab bar and every switch in the app mark a selection the same way. The
 * fill alone carries the state, never a shadow, which matters in sunlight.
 *
 * The fill stretches to the slot minus a fixed inset. Every slot is the same
 * width, so every highlight is too, and the selected block lands on the same
 * rhythm wherever it moves — which the labels alone do not do, ranging from
 * "Home" to "Advisories".
 *
 * That inset is applied to the *painted fill only*, never to the layout box:
 * taking it as a margin instead cost the widest label ("Farm Tools") the room
 * it needs and truncated it to an ellipsis. It is now an absolutely-positioned
 * sibling, which is also why the `onLayout` measure the old SVG path needed is
 * gone — a View can stretch to its own edges without being told the size.
 *
 * Built on PlatformPressable, the same component the navigator's own button
 * uses, so press feedback and the tab's accessibility wiring are unchanged.
 */

/** How far the fill sits inside its slot, leaving a gutter between neighbours.
 * Kept tight: "Farm Tools" is nearly as wide as its slot, and a wider gutter
 * left the label running past the fill's rounded ends. */
const HIGHLIGHT_INSET = 2;

/** How far the fill reaches past the slot, up and down, into the bar's own
 * padding. The icon and label together are taller than the slot, so a fill
 * cut to the slot sat below the top of the icon and under the label. This
 * leaves a 4dp gap to the bar's edge. */
const HIGHLIGHT_OUTSET = TAB_BAR_PADDING - 4;

/** The navigator's own per-tab padding (its `tabVerticalUiKit` style), cancelled
 * so the highlight spans the whole slot. Left in place it costs 5dp a side, and
 * the fill ends up narrower than the widest label sitting on it. */
const NAV_TAB_PADDING = 5;

export function TabBarButton({ children, style, ...props }: BottomTabBarButtonProps) {
  const theme = useTheme();

  // v7 of bottom-tabs marks the focused tab with `aria-selected`, not
  // `accessibilityState.selected` (see its BottomTabItem). Reading the latter
  // silently never matches, and the highlight never paints.
  const focused = props['aria-selected'] === true;

  return (
    <PlatformPressable {...props} style={[style, styles.pressable]}>
      {/* Chrome on a nested View, never on the Pressable: Android drops a
          Pressable's own background while still drawing its children.
          Card.tsx and CityCarousel document the same constraint. */}
      <View style={styles.item}>
        {focused ? (
          // Mounted only while focused, so a newly selected tab is always a
          // fresh view. Android draws a pill square when its fill changes in
          // place (see SegmentedControl), which this sidesteps.
          <Surface
            pointerEvents="none"
            depth="flat"
            level="sm"
            // A rounded rectangle, not a full capsule: at this height a
            // capsule's ends are as deep as the slot is wide, which turns the
            // fill into a near-circle that cuts the longer labels.
            radius={theme.radii.lg}
            background={theme.colors.text + '3D'}
            bordered={false}
            style={styles.fill}
          />
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
  // Inset rather than absoluteFill: the fill is narrower than its slot, leaving
  // a gutter between neighbours.
  fill: { position: 'absolute', top: -HIGHLIGHT_OUTSET, bottom: -HIGHLIGHT_OUTSET, left: HIGHLIGHT_INSET, right: HIGHLIGHT_INSET },
});
