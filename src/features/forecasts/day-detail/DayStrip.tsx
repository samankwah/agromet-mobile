import React from 'react';
import { Pressable, View } from 'react-native';

import type { DailyForecast } from '../../../shared/domain/forecast';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

type Props = {
  days: DailyForecast[];
  selectedDate: string;
  onSelect: (date: string) => void;
};

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The week as a row of day-of-month chips, so a farmer can move between
 * days without going back to the list — the same affordance as the
 * reference. Past days aren't shown at all: this is a forecast, so the
 * week always starts at today.
 */
export function DayStrip({ days, selectedDate, onSelect }: Props) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((day) => {
        const date = new Date(day.date);
        const isSelected = day.date === selectedDate;
        return (
          <Pressable
            key={day.date}
            onPress={() => onSelect(day.date)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            style={{ alignItems: 'center', gap: theme.spacing.xs, flex: 1, minHeight: theme.minTouchTarget }}
          >
            <Text variant="caption" muted>
              {WEEKDAY_INITIALS[date.getDay()]}
            </Text>
            {/* The day you are reading wears the app's glass selection, the
                flat grey circle a selected switch or tab shows. Keyed on the
                state so Android redraws its rounded corners. */}
            <View
              key={isSelected ? 'selected' : 'idle'}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSelected ? theme.colors.text + '3D' : 'transparent',
              }}
            >
              <Text variant="bodyStrong" color={theme.colors.text}>
                {date.getDate()}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
