import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children: React.ReactNode;
  /** Screens with their own internal scrolling (e.g. a form with a fixed
   * submit button) set this false and manage layout themselves. */
  scroll?: boolean;
  /** Set false for full-bleed content (e.g. a map that should reach the
   * screen edges); the screen then owns its own insets. Only meaningful
   * alongside `scroll={false}`. */
  padded?: boolean;
};

/**
 * The one screen-level layout wrapper — safe-area insets, themed
 * background, and (by default) a scroll container with consistent padding
 * and vertical rhythm between cards, so no screen hand-rolls its own
 * SafeAreaView/ScrollView boilerplate.
 */
export function Screen({ children, scroll = true, padded = true }: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: padded ? theme.spacing.lg : 0 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
