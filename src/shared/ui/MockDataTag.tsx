import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/**
 * "Never present fake real-time claims; label mock data clearly in
 * development." — a small, dev-only badge, not a redesign. `__DEV__` is
 * a React Native global; this returns null entirely in production builds,
 * zero bundle-visible cost beyond the trivial check. Drop inline next to a
 * card's "Updated X ago" caption, not as a full-width banner.
 */
export function MockDataTag() {
  const theme = useTheme();

  if (!__DEV__) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start' }}>
      <Ionicons name="flask-outline" size={11} color={theme.colors.muted} />
      <Text variant="caption" muted>
        Mock data
      </Text>
    </View>
  );
}
