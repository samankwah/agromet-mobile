import React, { useContext } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderShownContext } from '@react-navigation/elements';

import { useTheme } from '../theme/ThemeProvider';
import { DoodleWallpaper } from './DoodleWallpaper';
import { useTabBarClearance } from './tabBarLayout';

type Props = {
  children: React.ReactNode;
  /** Screens with their own internal scrolling (e.g. a form with a fixed
   * submit button) set this false and manage layout themselves. */
  scroll?: boolean;
  /** Set false for full-bleed content (e.g. a map that should reach the
   * screen edges); the screen then owns its own insets. Only meaningful
   * alongside `scroll={false}`. */
  padded?: boolean;
  /**
   * Releases the top safe-area inset so content can run behind the status bar —
   * for a screen whose own background is the point, like the Daily view's
   * photographic backdrop. Without this the backdrop stops below the status bar
   * and leaves a band of page colour above it.
   *
   * The screen then owes its content the top inset itself, usually as
   * `paddingTop` on its scroll container.
   */
  fullBleed?: boolean;
  /**
   * Paints the doodle pattern behind the page (see ui/DoodleWallpaper).
   *
   * Opt-in rather than the default: it suits a screen of opaque cards, where the
   * texture shows in the gaps and gives them something to sit on, and it is
   * wrong behind a screen that already owns its own ground — a map, or the
   * Forecasts photograph.
   */
  wallpaper?: boolean;
};

/**
 * The one screen-level layout wrapper — safe-area insets, themed
 * background, and (by default) a scroll container with consistent padding
 * and vertical rhythm between cards, so no screen hand-rolls its own
 * SafeAreaView/ScrollView boilerplate.
 *
 * The top inset is claimed only when no navigator header is shown above the
 * screen. Neither navigator zeroes the top inset for the scene — bottom-tabs
 * uses the insets for its own bar, and native-stack computes `topInset` for the
 * header alone — so `useSafeAreaInsets()` inside a screen still reports the
 * full window inset even when the header has already consumed it. Claiming it
 * unconditionally left every *pushed* screen (diagnose, market, reminders,
 * alert details) padding the status bar a second time: a band of empty
 * background under the header.
 *
 * `HeaderShownContext` is a plain context defaulting to `false`, so tab screens
 * — which show no header at either layer — and tests rendering a screen bare
 * keep the top inset, which is correct in both cases. Note this is not the
 * navigator-context trap `tabBarLayout.tsx` warns about: that one needs a real
 * navigator in the tree and fights the expo-router mocks; this reads a
 * defaulted context and touches no router.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  fullBleed = false,
  wallpaper = false,
}: Props) {
  const theme = useTheme();
  // Room for the floating tab bar, which no longer reserves its own space.
  // Zero on pushed screens and in tests.
  const tabBarClearance = useTabBarClearance();
  // True on a pushed screen with a navigator header, which has already spent
  // the status-bar inset — see the note above.
  const headerShown = useContext(HeaderShownContext);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={fullBleed || headerShown ? ['left', 'right'] : ['top', 'left', 'right']}
    >
      {/* Behind the content, and inside the SafeAreaView so it covers the whole
          page — including the status-bar strip when `fullBleed` released it.
          It is absolutely positioned and pointerEvents="none", so it changes
          neither the layout below nor what is tappable. */}
      {wallpaper ? <DoodleWallpaper /> : null}

      {scroll ? (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.lg + tabBarClearance,
            gap: theme.spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        // `padded={false}` means the child owns its insets, so it owns the tab
        // bar clearance too — adding it here would double-pad a screen that has
        // already accounted for it.
        <View style={{ flex: 1, padding: padded ? theme.spacing.lg : 0, paddingBottom: padded ? theme.spacing.lg + tabBarClearance : 0 }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
