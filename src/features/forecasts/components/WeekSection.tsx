import React from 'react';
import { View } from 'react-native';

import type { WeeklyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { BulletList } from '../../../shared/ui/BulletList';
import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';
import { DayRow } from './DayRow';

type Props = {
  forecast: WeeklyForecast;
};

/**
 * Purpose two of the two-purpose screen: "what does the week look like."
 *
 * Three cards, in an overview → detail → action order: the summary sentence,
 * the day-by-day list it summarises, then what to do about it. That third
 * card is `farmerActionCard` — the same rule-derived guidance
 * `weatherNarrative.ts` produces for the whole week (see its header comment
 * for why this stays a reading of the numbers and never becomes agronomic
 * advice). The Daily tab already renders it above the fold, next to a single
 * day's reading; here it is the week's, and it is what a farmer scrolling
 * this list is actually looking for once they have seen the numbers — not a
 * fourth thing to fit in, but the point the first two cards were building to.
 */
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

      {forecast.farmerActionCard.actions.length > 0 ? (
        <Card translucent raised style={{ gap: theme.spacing.sm }}>
          <Text variant="h3">{forecast.farmerActionCard.headline}</Text>
          <BulletList items={forecast.farmerActionCard.actions} accent />
        </Card>
      ) : null}
    </View>
  );
}
