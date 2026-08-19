import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { DailyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { TemperatureRangeBar } from '../../../shared/ui/TemperatureRangeBar';
import { getConditionIcon } from '../../../shared/utils/getConditionIcon';

type Props = {
  label: string;
  day: DailyForecast;
  weekMinC: number;
  weekMaxC: number;
  isFirst: boolean;
};

/**
 * One row of the 7-day list. Tapping opens the full day-detail page —
 * previously this expanded a few extra fields inline, which couldn't grow
 * into the charts and hourly breakdown a day actually warrants. The row
 * now does one thing: summarise, and hand off.
 */
export function DayRow({ label, day, weekMinC, weekMaxC, isFirst }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/forecast-day/${day.date}`)}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${day.condition}, low ${Math.round(day.tempMinC)} degrees, high ${Math.round(day.tempMaxC)} degrees, ${day.rainfallProbabilityPct} percent chance of rain. Open full forecast.`}
      style={{
        minHeight: theme.minTouchTarget,
        paddingVertical: theme.spacing.sm,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
      }}
    >
      {/* Wide enough for "Today" — at the previous 40px it wrapped to
          "Toda/y" on a 360px screen. */}
      <Text variant="bodyStrong" numberOfLines={1} style={{ width: 52 }}>
        {label}
      </Text>

      <Ionicons name={getConditionIcon(day.condition)} size={20} color={theme.colors.accent} />

      <View style={{ width: 34 }}>
        {day.rainfallProbabilityPct >= 30 ? (
          <Text variant="caption" color={theme.colors.teal}>
            {day.rainfallProbabilityPct}%
          </Text>
        ) : null}
      </View>

      <Text variant="body" muted style={{ width: 30, textAlign: 'right' }}>
        {Math.round(day.tempMinC)}°
      </Text>
      <View style={{ flex: 1 }}>
        <TemperatureRangeBar minC={day.tempMinC} maxC={day.tempMaxC} weekMinC={weekMinC} weekMaxC={weekMaxC} />
      </View>
      <Text variant="bodyStrong" style={{ width: 34, textAlign: 'right' }}>
        {Math.round(day.tempMaxC)}°
      </Text>
    </Pressable>
  );
}
