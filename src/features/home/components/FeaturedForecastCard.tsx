import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { DailyForecast, WeeklyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Text } from '../../../shared/ui/Text';
import { formatDegrees } from '../../../shared/utils/formatTemperature';
import { getConditionIcon } from '../../../shared/utils/getConditionIcon';
import { FeaturedForecastSkeleton } from './HomeSkeletons';
import { TeaserCard } from './TeaserCard';

type Props = {
  forecast: WeeklyForecast | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  onRetry: () => void;
};

/**
 * Home's week at a glance, above the fold of the Forecasts tab.
 *
 * It used to promise "7-day outlook" and show three days, left-aligned against
 * an empty half-card, with the minimum temperature as an unlabelled grey number
 * under the maximum — no icon, no way to tell which figure was which. It also
 * repeated the "Updated X ago" caption that the conditions card directly above
 * already carries, from the same fetch.
 *
 * Now it shows the week it names: seven equal columns, each with the day, what
 * the sky is doing, and the high over the low. The timestamp is gone as a
 * duplicate. This is a glance, not a replacement for the Forecasts tab's day
 * rows — which is why there is no rainfall column and no range bar here.
 */
export function FeaturedForecastCard({ forecast, status, error, onRetry }: Props) {
  return (
    <AsyncStateView status={status} error={error} onRetry={onRetry} skeleton={<FeaturedForecastSkeleton />}>
      {forecast ? (
        <TeaserCard
          label="This week"
          href="/(tabs)/forecasts?segment=weekly"
          action="7-day forecast"
          accessibilityLabel={`This week: ${forecast.summary} View the 7-day forecast.`}
        >
          <Text variant="body">{forecast.summary}</Text>
          <WeekStrip days={forecast.days} />
        </TeaserCard>
      ) : null}
    </AsyncStateView>
  );
}

/**
 * Seven columns, sized by `flex` rather than a fixed width.
 *
 * Equal flex is what keeps the row honest at every text size the settings offer
 * — at extra-large the columns narrow together instead of the last two falling
 * off the card. Each label is clamped to one line for the same reason.
 *
 * Each column is its own `Pressable` to that day's detail page, nested inside
 * the card's own `Pressable` (which opens the 7-day list). RN's responder
 * system hands the touch to the innermost one, so tapping a day never falls
 * through to the card-wide navigation — the reader lands on the day they
 * actually tapped, not on the weekly list with an extra tap still owed.
 */
function WeekStrip({ days }: { days: DailyForecast[] }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', marginTop: theme.spacing.xs }}>
      {days.map((day, index) => {
        const label = index === 0 ? 'Today' : weekdayLabel(day.date);
        return (
          <Pressable
            key={day.date}
            onPress={() => router.push(`/forecast-day/${day.date}`)}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${day.condition}, high ${formatDegrees(day.tempMaxC)}, low ${formatDegrees(day.tempMinC)}. Open full forecast.`}
            style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 3, opacity: pressed ? 0.6 : 1 })}
          >
            <Text variant="caption" muted numberOfLines={1}>
              {label}
            </Text>
            <Ionicons name={getConditionIcon(day.condition)} size={17} color={theme.colors.muted} />
            <Text variant="bodyStrong" numberOfLines={1}>
              {formatDegrees(day.tempMaxC)}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {formatDegrees(day.tempMinC)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Open-Meteo dates are plain `YYYY-MM-DD`, which `new Date` reads as UTC
 * midnight. Ghana is UTC+0, so the weekday is the right one without any
 * timezone handling — the same assumption `openMeteo.ts` documents. */
function weekdayLabel(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'short' });
}
