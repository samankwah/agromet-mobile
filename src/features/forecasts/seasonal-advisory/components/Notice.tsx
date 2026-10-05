import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { tint } from '../../../../shared/theme/blend';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  tone: 'info' | 'warning';
  /** Read first, in bold. */
  title?: string;
  children: string;
};

/** A quiet tinted line for something the reader must not miss. */
export function Notice({ tone, title, children }: Props) {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.colors.warning : theme.colors.accent;

  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.radii.md,
        backgroundColor: tint(color, theme.colors.surface, 0.12),
      }}
    >
      <Ionicons name={tone === 'warning' ? 'time-outline' : 'information-circle-outline'} size={18} color={color} style={{ marginTop: 1 }} />
      <Text variant="caption" style={{ flex: 1 }}>
        {title ? (
          <Text variant="caption" style={{ fontFamily: theme.fontFamily.bodySemiBold }}>
            {title}{' '}
          </Text>
        ) : null}
        {children}
      </Text>
    </View>
  );
}
