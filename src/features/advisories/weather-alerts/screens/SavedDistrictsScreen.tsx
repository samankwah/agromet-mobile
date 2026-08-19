import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DISTRICTS } from '../../../../shared/data/districts';
import { useLocationStore } from '../../../../shared/state/locationStore';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Screen } from '../../../../shared/ui/Screen';
import { Text } from '../../../../shared/ui/Text';

/**
 * The one place a farmer manages which districts they get alerts for —
 * reached from AlertBanner's empty state or AlertDetailsScreen, not
 * duplicated as a second nav entry elsewhere (e.g. the Library tab).
 * Saved-district selection lives in `locationStore` (Zustand) —
 * this screen reads/writes it directly, no local component state needed.
 */
export function SavedDistrictsScreen() {
  const theme = useTheme();
  const savedDistrictIds = useLocationStore((state) => state.savedDistrictIds);
  const toggleSavedDistrict = useLocationStore((state) => state.toggleSavedDistrict);

  return (
    <Screen>
      <Text variant="body" muted>
        Choose the districts you want weather alerts for. Leave none selected to see alerts for every district.
      </Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {DISTRICTS.map((district, index) => {
          const selected = savedDistrictIds.includes(district.id);
          return (
            <Pressable
              key={district.id}
              onPress={() => toggleSavedDistrict(district.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${district.name}, ${district.region}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                minHeight: theme.minTouchTarget,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.sm,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={22}
                color={selected ? theme.colors.accent : theme.colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text variant="body">{district.name}</Text>
                <Text variant="caption" muted>
                  {district.region}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
