import React from 'react';
import { View } from 'react-native';

import type { CurrentWeather } from '../../../shared/domain/currentWeather';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';

type Props = {
  conditions: CurrentWeather | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

export function CurrentConditionsCard({ conditions, status, error, onRetry }: Props) {
  const theme = useTheme();

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry}>
      {conditions ? (
        <Card style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text variant="h1">{formatTemperature(conditions.temperatureC)}</Text>
              <Text variant="body" muted>
                {conditions.condition}
              </Text>
            </View>
            <Text variant="caption" muted>
              Updated {formatRelativeTime(conditions.observedAt)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.md, columnGap: theme.spacing.lg }}>
            <StatTile icon="thermometer-outline" label="Feels like" value={formatTemperature(conditions.feelsLikeC)} />
            <StatTile
              icon="swap-vertical-outline"
              label="Min / Max"
              value={`${formatTemperature(conditions.minC)} / ${formatTemperature(conditions.maxC)}`}
            />
            <StatTile icon="rainy-outline" label="Rainfall" value={`${conditions.rainfallMm} mm`} />
            <StatTile icon="water-outline" label="Humidity" value={`${conditions.humidityPct}%`} />
            <StatTile icon="navigate-outline" label="Wind" value={formatWind(conditions.windKph)} />
          </View>
          <MockDataTag />
        </Card>
      ) : null}
    </AsyncStateView>
  );
}
