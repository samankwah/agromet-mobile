import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { AdvisoryActivity } from '../../../../shared/domain/weeklyAdvisory';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  activities: AdvisoryActivity[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

/**
 * Which stage of the season the advisory is for.
 *
 * A horizontal strip rather than the web page's vertical sidebar, which is a
 * desktop affordance — a phone has no column to spare, and there are rarely
 * more than a handful of stages. Follows CityCarousel's idiom, including its
 * radio semantics, so a screen reader announces this as a choice rather than a
 * row of unrelated buttons.
 *
 * Hidden entirely for a single activity: a picker offering one option is a
 * control that cannot do anything.
 */
export function ActivityPicker({ activities, selectedIndex, onSelect }: Props) {
  const theme = useTheme();

  if (activities.length < 2) return null;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="h3">Activity</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.lg }}
      >
        {activities.map((activity, index) => {
          const isSelected = index === selectedIndex;

          return (
            <Pressable
              key={activity.activity}
              onPress={() => onSelect(index)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={activity.activity}
            >
              {({ pressed }) => (
                // Chrome on a View, never on the Pressable — Button.tsx
                // documents why: Android drops a Pressable's own background
                // and border while still drawing its children.
                <View
                  style={{
                    minHeight: theme.minTouchTarget,
                    justifyContent: 'center',
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <Text
                    variant={isSelected ? 'bodyStrong' : 'body'}
                    color={isSelected ? theme.colors.onAccent : theme.colors.text}
                    numberOfLines={1}
                  >
                    {activity.activity}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
