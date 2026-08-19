import React from 'react';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/**
 * The small, bold, letter-spaced uppercase label above a filter control
 * (e.g. "FORECAST VIEW", "VARIABLE") — reusable anywhere a labeled filter/
 * form field pattern shows up next (Advisories/Library filters are likely
 * future consumers), not a one-off for the spatial outlook drawer.
 */
export function FieldLabel({ children }: { children: string }) {
  const theme = useTheme();

  return (
    <Text
      variant="caption"
      style={{ fontFamily: theme.fontFamily.bodySemiBold, letterSpacing: 0.6, color: theme.colors.muted, marginBottom: theme.spacing.xs }}
    >
      {children}
    </Text>
  );
}
