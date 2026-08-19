import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { HourlyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import { getConditionIcon } from '../../../shared/utils/getConditionIcon';

export function HourlyStripItem({ hour }: { hour: HourlyForecast }) {
  const theme = useTheme();
  const label = new Date(hour.hour).toLocaleTimeString(undefined, { hour: 'numeric' });

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xs, minWidth: 52 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Ionicons name={getConditionIcon(hour.condition)} size={22} color={theme.colors.accent} />
      <Text variant="bodyStrong">{formatTemperature(hour.tempC)}</Text>
      {hour.rainfallProbabilityPct >= 30 ? (
        <Text variant="caption" color={theme.colors.teal}>
          {hour.rainfallProbabilityPct}%
        </Text>
      ) : null}
    </View>
  );
}
