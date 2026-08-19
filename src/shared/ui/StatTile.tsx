import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

/**
 * The one icon+label+value stat tile in the app — extracted from a
 * function that was private to CurrentConditionsCard so the Forecasts
 * tab's Today section can reuse it instead of re-implementing the same
 * three-line layout a second time.
 */
export function StatTile({ icon, label, value }: Props) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minWidth: '42%' }}>
      <Ionicons name={icon} size={18} color={theme.colors.muted} />
      <View>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}
