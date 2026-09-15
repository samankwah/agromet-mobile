import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CurrentWeather } from '../../../shared/domain/currentWeather';
import type { DailyForecast, HourlyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { CloudRain, Drop, NavigationArrow, Thermometer } from 'phosphor-react-native';

import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED } from '../../../shared/ui/WeatherBackdrop';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';
import { LiveWeatherIcon } from '../../../shared/ui/weather/LiveWeatherIcon';
import { dayHeadline } from '../../../shared/utils/weatherNarrative';
import { HourlyStripItem } from './HourlyStripItem';
import { MapPreviewCard } from './MapPreviewCard';

type Props = {
  conditions: CurrentWeather;
  today: DailyForecast;
  hourly: HourlyForecast[];
};

/**
 * Purpose one of the two-purpose screen: "what should I do today."
 *
 * Rendered over the photographic weather backdrop, so every card here is
 * translucent and the surrounding subtree is pinned to the dark palette
 * (see ForecastsScreen) — that way text and icons come out light-on-dark
 * automatically rather than each component needing bespoke colours.
 */
export function TodaySection({ conditions, today, hourly }: Props) {
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
          {/* The hero animates: this is the one icon on the screen whose whole
              job is to say what the sky is doing right now. */}
          <LiveWeatherIcon
            weatherCode={conditions.weatherCode}
            isDay={conditions.isDay}
            size={60}
            color={ON_BACKDROP_COLOR}
            animated
          />
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
          <StatTile icon={Thermometer} label="Feels like" value={formatTemperature(conditions.feelsLikeC)} />
          <StatTile icon={Drop} label="Humidity" value={`${conditions.humidityPct}%`} />
          <StatTile icon={NavigationArrow} label="Wind" value={formatWind(conditions.windKph)} />
          <StatTile icon={CloudRain} label="Rain chance" value={`${today.rainfallProbabilityPct}%`} />
        </View>
      </Card>

      {/* Directly under the rain-chance tile it expands on. The map runs three
          hours back to twelve ahead, which is this section's timescale and not
          the week's, so this is where it belongs. */}
      <MapPreviewCard
        center={{ lat: conditions.lat, lng: conditions.lng }}
        locationName={conditions.locationName}
        temperatureC={conditions.temperatureC}
      />

      {/* Today's own reading, not the week's — the week's headline and
          bullets already sit on the Weekly tab, and showing the same card
          twice was the bug. `dayHeadline`/`farmerInterpretation` are both
          keyed off this single day's numbers. */}
      <Card translucent raised style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">{dayHeadline(today)}</Text>
        <Text variant="body" muted>
          {today.farmerInterpretation}
        </Text>
      </Card>
    </View>
  );
}
