import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ConfidenceLevel } from '../domain/subseasonalOutlook';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

const META: Record<ConfidenceLevel, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  low: { label: 'Low confidence', icon: 'help-circle-outline' },
  moderate: { label: 'Moderate confidence', icon: 'information-circle-outline' },
  high: { label: 'High confidence', icon: 'checkmark-circle-outline' },
};

/**
 * Marks subseasonal/seasonal outlook cards as probabilistic at a glance —
 * paired with the domain type's mandatory `plainLanguageSummary`, this is
 * what keeps a farmer from mistaking a climate outlook for a deterministic
 * forecast (the exact confusion the product brief calls out).
 */
export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const theme = useTheme();
  const meta = META[level];
  const color = level === 'high' ? theme.colors.accent : level === 'moderate' ? theme.colors.teal : theme.colors.warning;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.sm,
        backgroundColor: color + '22',
      }}
    >
      <Ionicons name={meta.icon} size={14} color={color} />
      <Text variant="caption" color={color}>
        {meta.label}
      </Text>
    </View>
  );
}
