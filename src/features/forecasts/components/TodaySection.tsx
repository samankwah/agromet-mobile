import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CurrentWeather } from '../../../shared/domain/currentWeather';
import type { DailyForecast, HourlyForecast, WeeklyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { BulletList } from '../../../shared/ui/BulletList';
import { Card } from '../../../shared/ui/Card';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED } from '../../../shared/ui/WeatherBackdrop';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';
import { getConditionIcon } from '../../../shared/utils/getConditionIcon';
import { HourlyStripItem } from './HourlyStripItem';

type Props = {
  conditions: CurrentWeather;
  today: DailyForecast;
  hourly: HourlyForecast[];
  actionCard: WeeklyForecast['farmerActionCard'];
};

/**
 * Purpose one of the two-purpose screen: "what should I do today."
 *
 * Rendered over the photographic weather backdrop, so every card here is
 * translucent and the surrounding subtree is pinned to the dark palette
 * (see ForecastsScreen) — that way text and icons come out light-on-dark
 * automatically rather than each component needing bespoke colours.
 */
export function TodaySection({ conditions, today, hourly, actionCard }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="h1" color={ON_BACKDROP_COLOR} style={{ fontSize: 46, lineHeight: 52 }}>
              {formatTemperature(conditions.temperatureC)}
            </Text>
            <Text variant="bodyStrong" color={ON_BACKDROP_COLOR} numberOfLines={1}>
              {conditions.condition}
            </Text>
            <Text variant="caption" color={ON_BACKDROP_MUTED}>
              Feels like {formatTemperature(conditions.feelsLikeC)} · H {formatTemperature(today.tempMaxC)} · L{' '}
              {formatTemperature(today.tempMinC)}
            </Text>
          </View>
          <Ionicons name={getConditionIcon(conditions.condition)} size={60} color={ON_BACKDROP_COLOR} />
        </View>
      </View>

      <Card translucent style={{ gap: theme.spacing.md }}>
        <Text variant="caption" muted>
          Next hours
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.lg }}>
          {hourly.map((hour) => (
            <HourlyStripItem key={hour.hour} hour={hour} />
          ))}
        </ScrollView>
      </Card>

      <Card translucent style={{ gap: theme.spacing.md }}>
        <Text variant="caption" muted>
          Today&apos;s conditions
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.md, columnGap: theme.spacing.lg }}>
          <StatTile icon="thermometer-outline" label="Feels like" value={formatTemperature(conditions.feelsLikeC)} />
          <StatTile icon="water-outline" label="Humidity" value={`${conditions.humidityPct}%`} />
          <StatTile icon="navigate-outline" label="Wind" value={formatWind(conditions.windKph)} />
          <StatTile icon="rainy-outline" label="Rain chance" value={`${today.rainfallProbabilityPct}%`} />
        </View>
        <MockDataTag />
      </Card>

      <Card translucent raised style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">{actionCard.headline}</Text>
        <Text variant="body" muted>
          {today.farmerInterpretation}
        </Text>
        <BulletList items={actionCard.actions} accent />
      </Card>
    </View>
  );
}
