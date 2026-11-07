import React from 'react';
import { ScrollView, View } from 'react-native';

import type { CurrentWeather } from '../../../shared/domain/currentWeather';
import type { DailyForecast, HourlyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fontFamily } from '../../../shared/theme/tokens';
import { Card } from '../../../shared/ui/Card';

import { StatTile } from '../../../shared/ui/StatTile';
import { Text } from '../../../shared/ui/Text';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED } from '../../../shared/ui/WeatherBackdrop';
import { formatDegrees, formatTemperature } from '../../../shared/utils/formatTemperature';
import { formatWind } from '../../../shared/utils/formatWind';
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
 * Rendered over the moving sky backdrop, so every card here is
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
        {/* Centred, large and thin over the sky, as the phone's own weather
            app lays it out. No condition icon here: the sky behind already
            shows the weather, and the words say it. */}
        <View style={{ alignItems: 'center' }}>
          <Text
            variant="h1"
            color={ON_BACKDROP_COLOR}
            style={{ fontFamily: fontFamily.headingLight, fontSize: 96, lineHeight: 104 }}
            accessibilityLabel={formatTemperature(conditions.temperatureC)}
          >
            {formatDegrees(conditions.temperatureC)}
          </Text>
          <Text variant="h3" color={ON_BACKDROP_COLOR} numberOfLines={1}>
            {conditions.condition}
          </Text>
          <Text variant="bodyStrong" color={ON_BACKDROP_COLOR}>
            H: {formatDegrees(today.tempMaxC)} L: {formatDegrees(today.tempMinC)}
          </Text>
          <Text variant="caption" color={ON_BACKDROP_MUTED}>
            Feels like {formatTemperature(conditions.feelsLikeC)}
          </Text>
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
          <StatTile onBackdrop icon="temperature" label="Feels like" value={formatTemperature(conditions.feelsLikeC)} />
          <StatTile onBackdrop icon="humidity" label="Humidity" value={`${conditions.humidityPct}%`} />
          <StatTile onBackdrop icon="wind" label="Wind" value={formatWind(conditions.windKph)} />
          <StatTile onBackdrop icon="rainfall" label="Rain chance" value={`${today.rainfallProbabilityPct}%`} />
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
