import React, { createContext, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../theme/tokens';

/**
 * Geometry of the floating bottom tab bar, and the room screens must leave for
 * it.
 *
 * The bar is positioned absolutely so content passes *behind* it — that is what
 * the reference design does, and it is also the only way the Daily view's
 * full-bleed photographic backdrop can reach the bottom of the screen instead of
 * stopping short and leaving a band of page colour under it.
 *
 * The cost of absolute positioning is that the navigator no longer reserves
 * space, so anything scrollable underneath would end with its last item stuck
 * behind the bar. `useTabBarClearance` is how a screen gets that room back.
 *
 * It deliberately does *not* read `@react-navigation/bottom-tabs`'s
 * `BottomTabBarHeightContext`, even though that would work: that package is only
 * a transitive dependency here, and this app's tests mock `expo-router` with
 * partial objects, so anything reaching into the navigator from `Screen` breaks
 * a dozen suites. Our own context defaults to 0 outside the tab navigator, which
 * is exactly right for pushed screens and for tests.
 */

/**
 * The bar's own box — the chamfered shape drawn by TabBarBackground.
 *
 * 72, not the navigator's default 49: an icon above a label needs the room (at
 * 49 the labels painted outside the bar and were clipped), and the extra height
 * is what lets `TAB_BAR_PADDING` keep both off the outline. It also matches the
 * reference bar, which measured ~71dp.
 */
export const TAB_BAR_HEIGHT = 72;
/**
 * Gap from the left and right screen edges.
 *
 * `spacing.lg` deliberately — the same token `Screen` uses for its own padding,
 * so the bar's outline lines up with the card edges above it instead of running
 * to its own margin. Referencing the token rather than repeating 16 is what
 * keeps them aligned if that padding ever changes.
 *
 * Applied as a *margin*, not `left`/`right`: with `position: 'absolute'`,
 * @react-navigation/bottom-tabs overrides those two on Android (it honours
 * `height` and `bottom` but forces the bar edge-to-edge), which left the bar
 * visibly wider than the cards. Margin is not in the position family and
 * survives.
 */
export const TAB_BAR_INSET = spacing.lg;
/** Breathing room between the icon/label group and the bar's own outline. */
export const TAB_BAR_PADDING = spacing.sm;
/** Room left above the bar so content scrolls clear of the outline. */
export const TAB_BAR_GAP = spacing.sm;

/**
 * How far the bar is allowed to sit inside the system's bottom inset. Tune this
 * to raise or lower the bar; everything else (including each screen's scroll
 * clearance) follows from `tabBarBottomOffset`.
 */
const TAB_BAR_BOTTOM_GIVEBACK = spacing.md;
/** Floor for devices that reserve nothing at the bottom, so the bar is never
 * flush against the glass. */
const TAB_BAR_BOTTOM_MIN = spacing.xs;

const TabBarClearanceContext = createContext(0);

export function TabBarClearanceProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  // Bar box, whatever sits beneath it, and a gap above so the last item clears
  // the outline rather than touching it. Mirrors tabBarBottomOffset below.
  const clearance = TAB_BAR_HEIGHT + tabBarBottomOffset(insets.bottom) + TAB_BAR_GAP;

  return <TabBarClearanceContext.Provider value={clearance}>{children}</TabBarClearanceContext.Provider>;
}

/**
 * Bottom padding a scrollable area needs so its content can scroll clear of the
 * floating tab bar. Zero outside the tab navigator.
 */
export function useTabBarClearance(): number {
  return useContext(TabBarClearanceContext);
}

/**
 * How far the bar sits above the bottom of the screen.
 *
 * Where the system reserves space (an Android gesture bar, an iOS home
 * indicator) that reservation is the gap — adding our own on top of it pushed
 * the bar visibly high up the screen. Only when there is no system inset does
 * the bar need a gap of its own, so it isn't flush against the glass.
 */
export function tabBarBottomOffset(bottomInset: number): number {
  // Sitting at the full system inset parked the bar noticeably high, so the bar
  // sits *inside* that inset by TAB_BAR_BOTTOM_GIVEBACK. Safe because the bar's
  // touch targets live inside its 72dp height, well above its bottom edge — the
  // only thing entering the gesture strip is the outline.
  return Math.max(bottomInset - TAB_BAR_BOTTOM_GIVEBACK, TAB_BAR_BOTTOM_MIN);
}
