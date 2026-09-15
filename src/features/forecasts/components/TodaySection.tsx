import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CurrentWeather } from '../../../shared/domain/currentWeather';
import type { DailyForecast, HourlyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';

import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED } from '../../../shared/ui/WeatherBackdrop';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';
import { LiveWeatherIcon } from '../../../shared/ui/weather/LiveWeatherIcon';
import { describeNextHours } from '../../../shared/utils/weatherNarrative';
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
  // Keyed off the observation time rather than the device clock, so this card
  // and the hero above it describe the same instant even on a phone set to
  // another timezone.
  const now = React.useMemo(
    () => describeNextHours(hourly, today, new Date(conditions.observedAt)),
    [hourly, today, conditions.observedAt],
  );

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
              job is to say what the sky is doing right now.

              It used to be forced to flat white here, because a drawn glyph
              laid over a photograph of the sky disappeared into it. The 3D
              renders bring their own lighting and a baked shadow, so they hold
              their edge against an image without being flattened first. */}
          <LiveWeatherIcon weatherCode={conditions.weatherCode} isDay={conditions.isDay} size={60} animated />
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
          <StatTile icon="temperature" label="Feels like" value={formatTemperature(conditions.feelsLikeC)} />
          <StatTile icon="humidity" label="Humidity" value={`${conditions.humidityPct}%`} />
          <StatTile icon="wind" label="Wind" value={formatWind(conditions.windKph)} />
          <StatTile icon="rainfall" label="Rain chance" value={`${today.rainfallProbabilityPct}%`} />
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

      {/* The next few hours' reading, not the week's and not the calendar
          day's. The week's headline and bullets already sit on the Weekly
          tab. The day's own aggregates used to sit here, which is why the
          card never changed between breakfast and bedtime — see
          `describeNextHours`. It reads the same hours the strip at the top of
          this section shows, and names the stretch of day the reader is in. */}
      <Card translucent raised style={{ gap: theme.spacing.sm }}>
        <Text variant="h3">{now.headline}</Text>
        <Text variant="body" muted>
          {now.body}
        </Text>
      </Card>
    </View>
  );
}
