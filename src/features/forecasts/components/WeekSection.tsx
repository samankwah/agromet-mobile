import React from 'react';
import { View } from 'react-native';

import type { WeeklyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';
import { DayRow } from './DayRow';

type Props = {
  forecast: WeeklyForecast;
};

/** Purpose two of the two-purpose screen: "what does the week look like." */
export function WeekSection({ forecast }: Props) {
  const theme = useTheme();
  const weekMinC = Math.min(...forecast.days.map((day) => day.tempMinC));
  const weekMaxC = Math.max(...forecast.days.map((day) => day.tempMaxC));

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card translucent style={{ gap: theme.spacing.sm }}>
        <Text variant="body">{forecast.summary}</Text>
      </Card>

      <Card translucent style={{ padding: 0, overflow: 'hidden' }}>
        {forecast.days.map((day, index) => (
          <View key={day.date} style={{ paddingHorizontal: theme.spacing.lg }}>
            <DayRow
              label={index === 0 ? 'Today' : new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
              day={day}
              weekMinC={weekMinC}
              weekMaxC={weekMaxC}
              isFirst={index === 0}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}
