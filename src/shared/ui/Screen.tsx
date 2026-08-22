import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
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
};

/**
 * The one screen-level layout wrapper — safe-area insets, themed
 * background, and (by default) a scroll container with consistent padding
 * and vertical rhythm between cards, so no screen hand-rolls its own
 * SafeAreaView/ScrollView boilerplate.
 *
 * The top inset is claimed unconditionally, which is right while the tab
 * screens carry no navigator header of their own. Worth knowing if one is ever
 * added: `@react-navigation/bottom-tabs` uses the safe-area insets for its tab
 * bar but never zeroes the top for the scene, so a navigator header that
 * applies the status-bar inset itself would leave every tab screen padding it a
 * second time — a band of empty background beneath the header.
 */
export function Screen({ children, scroll = true, padded = true, fullBleed = false }: Props) {
  const theme = useTheme();
  // Room for the floating tab bar, which no longer reserves its own space.
  // Zero on pushed screens and in tests.
  const tabBarClearance = useTabBarClearance();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={fullBleed ? ['left', 'right'] : ['top', 'left', 'right']}
    >
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
