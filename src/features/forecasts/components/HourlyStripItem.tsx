import React from 'react';
import { View } from 'react-native';

import type { HourlyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { LiveWeatherIcon } from '../../../shared/ui/weather/LiveWeatherIcon';
import { formatTemperature } from '../../../shared/utils/formatTemperature';

export function HourlyStripItem({ hour }: { hour: HourlyForecast }) {
  const theme = useTheme();
  const label = new Date(hour.hour).toLocaleTimeString(undefined, { hour: 'numeric' });

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xs, minWidth: 52 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <LiveWeatherIcon weatherCode={hour.weatherCode} isDay={hour.isDay} size={27} />
      <Text variant="bodyStrong">{formatTemperature(hour.tempC)}</Text>
      {hour.rainfallProbabilityPct >= 30 ? (
        <Text variant="caption" color={theme.colors.teal}>
          {hour.rainfallProbabilityPct}%
        </Text>
      ) : null}
    </View>
  );
}
