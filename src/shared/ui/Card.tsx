import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Props = ViewProps & {
  /** Slightly stronger shadow — for cards the user is meant to notice
   * first, like the alert banner. Resting cards (default) use a quieter
   * shadow so the screen doesn't look like a wall of equally-loud boxes. */
  raised?: boolean;
  /** Semi-transparent surface, for cards sitting on the Daily view's
   * photographic backdrop — the photo reads through, but the card still
   * darkens what's behind its own text so contrast never depends on
   * whatever happens to be in the picture. */
  translucent?: boolean;
};

/**
 * The one card surface in the app — flat elevation (see theme/tokens.ts's
 * comment on why this replaces the web app's neumorphic shadows), themed
 * surface color, consistent radius/padding/border across every screen.
 */
export function Card({ raised, translucent, style, children, ...rest }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: translucent ? 'rgba(10,22,34,0.55)' : theme.colors.surface,
          borderRadius: theme.radii.md,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: translucent ? 'rgba(255,255,255,0.16)' : theme.colors.border,
        },
        raised ? theme.elevation.raised : theme.elevation.card,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
