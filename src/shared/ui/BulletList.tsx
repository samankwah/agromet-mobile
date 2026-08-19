import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Props = {
  items: string[];
  /** Accent-colored bullets read as "recommended actions"; muted (default)
   * bullets read as neutral informational lists (e.g. expected impacts). */
  accent?: boolean;
};

/** The one bulleted-list component in the app — extracted from a copy
 * that was private to AlertDetailsScreen once a second consumer (the
 * Forecasts tab's Today/Outlook action cards) needed the identical
 * layout. */
export function BulletList({ items, accent }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {items.map((item, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Text variant="body" color={accent ? theme.colors.accent : theme.colors.muted}>
            •
          </Text>
          <Text variant="body" style={{ flex: 1 }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
