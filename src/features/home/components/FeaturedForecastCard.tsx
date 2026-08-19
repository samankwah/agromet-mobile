import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import type { WeeklyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { formatTemperature } from '../../../shared/utils/formatTemperature';

type Props = {
  forecast: WeeklyForecast | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/** Home's teaser into the (not-yet-built) Forecasts tab — today + next 2
 * days' range plus a one-line plain-language summary, never presented as
 * more certain than a short-range forecast actually is (contrast with the
 * subseasonal/seasonal outlook types, which carry a mandatory uncertainty
 * summary for exactly this reason). Presentational only — data comes from
 * useHomeData, same pattern as every other Home card. */
export function FeaturedForecastCard({ forecast, status, error, onRetry }: Props) {
  const theme = useTheme();

  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry}>
      {forecast ? (
        <Pressable
          onPress={() => router.push('/(tabs)/forecasts')}
          accessibilityRole="button"
          accessibilityLabel="Featured weekly forecast. View Forecasts tab."
        >
          <Card style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text variant="caption" muted>
                7-day outlook
              </Text>
              <Text variant="caption" muted>
                Updated {formatRelativeTime(forecast.generatedAt)}
              </Text>
            </View>
            <Text variant="body">{forecast.summary}</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
              {forecast.days.slice(0, 3).map((day) => (
                <View key={day.date} style={{ alignItems: 'center' }}>
                  <Text variant="caption" muted>
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                  </Text>
                  <Text variant="bodyStrong">{formatTemperature(day.tempMaxC)}</Text>
                  <Text variant="caption" muted>
                    {formatTemperature(day.tempMinC)}
                  </Text>
                </View>
              ))}
            </View>
            <MockDataTag />
          </Card>
        </Pressable>
      ) : null}
    </AsyncStateView>
  );
}
