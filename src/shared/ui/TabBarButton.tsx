import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { PlatformPressable } from 'expo-router/react-navigation';

import { useTheme } from '../theme/ThemeProvider';
import { Surface } from './Surface';

/**
 * One tab's button, carrying the selected tab's highlight.
 *
 * The navigator's default button only recolours the icon and label, which left
 * the selected tab reading as "slightly greener text" rather than a selected
 * thing. This paints a filled block behind the focused tab's icon and label,
 * the way a selected chip works elsewhere in the app.
 *
 * The block is *sunken*, not raised. The bar itself is the raised thing; a tab
 * is selected by being pressed into it, which is the one place in the app
 * where the depth language carries a state rather than a hierarchy. The
 * `focus` fill still carries it on its own, so the state is never
 * shadow-only — which matters in sunlight, and for anyone who cannot see the
 * bevel at all.
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
 * The pair of them comes to `spacing.sm`, the app's standard small gap. */
const HIGHLIGHT_INSET = 4;

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
          <Surface
            pointerEvents="none"
            depth="sunken"
            level="sm"
            radius={theme.radii.md}
            background={theme.colors.focus}
            // Rimmed, because the fill cannot do this alone. `focus` is a pale
            // ice blue and the bar it sits on is `chrome`, which in the light
            // scheme is pale too — about 1.07:1 between them. The border is
            // what makes the active tab findable there; in dark the fill
            // already carries it and the rim just tidies the edge.
            bordered
            borderColor={theme.colors.focusRim}
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
  fill: { position: 'absolute', top: 0, bottom: 0, left: HIGHLIGHT_INSET, right: HIGHLIGHT_INSET },
});
