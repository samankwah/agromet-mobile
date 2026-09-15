import React from 'react';
import { View } from 'react-native';

import type { CurrentWeather } from '../../../shared/domain/currentWeather';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';

import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { LiveWeatherIcon } from '../../../shared/ui/weather/LiveWeatherIcon';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { formatDegrees, formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';
import { CurrentConditionsSkeleton } from './HomeSkeletons';

/** The disc behind the condition icon. Fixed rather than derived from the type
 * scale: it has to stay a circle, and the text-size preference growing it would
 * push the temperature off the card on a narrow screen. */
const MEDALLION = 64;

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexShrink: 1 }}>
              {/* A raised disc carrying the condition, which is the shape the
                  reference designs give the headline reading. Home had no
                  condition icon at all before, only the words. */}
              <View
                style={{
                  width: MEDALLION,
                  height: MEDALLION,
                  borderRadius: MEDALLION / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.surface,
                  boxShadow: theme.raised('lg'),
                }}
              >
                <LiveWeatherIcon
                  weatherCode={conditions.weatherCode}
                  isDay={conditions.isDay}
                  // 0.56 was right for a drawn glyph, which used its whole box.
                  // The 3D renders carry their own margin inside the PNG, so at
                  // the same nominal size the art lands visibly smaller and the
                  // medallion reads as mostly empty circle. This buys that
                  // padding back.
                  size={MEDALLION * 0.78}
                  animated
                />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text variant="h1">{formatTemperature(conditions.temperatureC)}</Text>
                <Text variant="body" muted>
                  {conditions.condition}
                </Text>
              </View>
            </View>
            <Text variant="caption" muted>
              Updated {formatRelativeTime(conditions.observedAt)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.md, columnGap: theme.spacing.lg }}>
            {/* The day's range rides under the feels-like figure rather than
                taking a tile of its own. Two thermometer tiles side by side
                were saying one thing about temperature, and the odd tile count
                left Wind stranded on a full-width row by itself. Four tiles
                make the 2x2 the rest of the card is built for. */}
            <StatTile
              icon="temperature"
              label="Feels like"
              value={formatTemperature(conditions.feelsLikeC)}
              hint={`H ${formatDegrees(conditions.maxC)} · L ${formatDegrees(conditions.minC)}`}
            />
            <StatTile icon="wind" label="Wind" value={formatWind(conditions.windKph)} />
            <StatTile icon="rainfall" label="Rainfall" value={`${conditions.rainfallMm} mm`} />
            <StatTile icon="humidity" label="Humidity" value={`${conditions.humidityPct}%`} />
          </View>
        </Card>
      ) : null}
    </AsyncStateView>
  );
}
