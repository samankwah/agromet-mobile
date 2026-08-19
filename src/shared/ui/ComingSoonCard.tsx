import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
};

/**
 * A compact "not built yet" row for use *within* a composed screen that
 * also has real content (Advisories, Farm Tools) — distinct from
 * ComingSoon.tsx, which is a full-screen placeholder for tabs with nothing
 * else on them. Composed screens need several of these; this is the one
 * shared layout for that instead of hand-rolling it per section.
 */
export function ComingSoonCard({ icon, title, message }: Props) {
  const theme = useTheme();

  return (
    <Card style={{ opacity: 0.7, gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Ionicons name={icon} size={20} color={theme.colors.muted} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {title}
        </Text>
        <View
          style={{
            borderRadius: theme.radii.sm,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            backgroundColor: theme.colors.border,
          }}
        >
          <Text variant="caption" muted>
            Coming soon
          </Text>
        </View>
      </View>
      <Text variant="body" muted>
        {message}
      </Text>
    </Card>
  );
}
