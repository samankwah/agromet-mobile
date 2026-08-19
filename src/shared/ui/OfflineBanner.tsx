import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNetworkStatus } from '../net/useNetworkStatus';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/**
 * The one "you're offline" message in the app, rendered once from
 * app/_layout.tsx above every screen. Individual features (Alerts,
 * Diagnose) don't repeat this — they only handle what's specific to being
 * offline for *them* (showing cached data, showing a queued-submission
 * indicator).
 */
export function OfflineBanner() {
  const { isOnline, isChecking } = useNetworkStatus();
  const theme = useTheme();

  if (isChecking || isOnline) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.muted,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.surface} />
      <Text variant="caption" color={theme.colors.surface}>
        You&apos;re offline — showing saved data where available.
      </Text>
    </View>
  );
}
