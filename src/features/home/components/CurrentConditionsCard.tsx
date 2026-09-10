import React from 'react';
import { View } from 'react-native';

import type { CurrentWeather } from '../../../shared/domain/currentWeather';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { ArrowsVertical, CloudRain, Drop, NavigationArrow, Thermometer } from 'phosphor-react-native';

import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';
import { CurrentConditionsSkeleton } from './HomeSkeletons';

type Props = {
  conditions: CurrentWeather | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

export function CurrentConditionsCard({ conditions, status, error, onRetry }: Props) {
  const theme = useTheme();

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} skeleton={<CurrentConditionsSkeleton />}>
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
            <StatTile icon={Thermometer} label="Feels like" value={formatTemperature(conditions.feelsLikeC)} />
            <StatTile
              icon={ArrowsVertical}
              label="Min / Max"
              value={`${formatTemperature(conditions.minC)} / ${formatTemperature(conditions.maxC)}`}
            />
            <StatTile icon={CloudRain} label="Rainfall" value={`${conditions.rainfallMm} mm`} />
            <StatTile icon={Drop} label="Humidity" value={`${conditions.humidityPct}%`} />
            <StatTile icon={NavigationArrow} label="Wind" value={formatWind(conditions.windKph)} />
          </View>
        </Card>
      ) : null}
    </AsyncStateView>
  );
}
