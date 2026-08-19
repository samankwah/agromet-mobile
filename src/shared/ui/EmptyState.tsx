import React from 'react';
import { View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { Ionicons as IoniconsComponent } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  /** e.g. a Retry button (AsyncStateView) or a "Manage my districts" link
   * (AlertBanner's empty state) — kept generic so this one component covers
   * every "centered icon + title + message [+ action]" layout in the app. */
  children?: React.ReactNode;
};

export function EmptyState({ icon, title, message, children }: Props) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing['2xl'],
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <IoniconsComponent name={icon} size={32} color={theme.colors.muted} />
      <Text variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" muted style={{ textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
