import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useQueries } from '@tanstack/react-query';

import { getCurrentConditions } from '../../../shared/api/weatherService';
import { HOME_LOCATIONS } from '../../../shared/data/mockWeather';
import { useLocationStore } from '../../../shared/state/locationStore';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { formatTemperature } from '../../../shared/utils/formatTemperature';

/**
 * Replaces the previous increment's LocationSelector — one town-selection
 * mechanism instead of two doing the same job. Each card shows name +
 * condition + current temp at a glance; tap-to-select writes
 * locationStore directly (same interaction LocationSelector had).
 *
 * Data-saver behavior: when enabled, only the selected town's query runs
 * eagerly — the rest stay disabled (showing a lightweight "…" placeholder)
 * until the farmer actually taps them, rather than fetching all 10 towns'
 * conditions up front.
 */
export function CityCarousel() {
  const theme = useTheme();
  const selectedLocationId = useLocationStore((state) => state.selectedLocationId);
  const setSelectedLocationId = useLocationStore((state) => state.setSelectedLocationId);
  const dataSaverEnabled = useSettingsStore((state) => state.dataSaverEnabled);

  const results = useQueries({
    queries: HOME_LOCATIONS.map((location) => ({
      queryKey: ['currentConditions', location.id],
      queryFn: () => getCurrentConditions(location.id),
      enabled: !dataSaverEnabled || location.id === selectedLocationId,
    })),
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
      {HOME_LOCATIONS.map((location, index) => {
        const isSelected = location.id === selectedLocationId;
        const conditions = results[index]?.data;
        const fg = isSelected ? theme.colors.onAccent : theme.colors.text;
        const fgMuted = isSelected ? theme.colors.onAccent : theme.colors.muted;

        return (
          <Pressable
            key={location.id}
            onPress={() => setSelectedLocationId(location.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${location.name}${conditions ? `, ${formatTemperature(conditions.temperatureC)}, ${conditions.condition}` : ''}`}
            style={{
              minWidth: 96,
              minHeight: theme.minTouchTarget + 16,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: isSelected ? theme.colors.accent : theme.colors.border,
              backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <Text variant="bodyStrong" color={fg} numberOfLines={1}>
              {location.name}
            </Text>
            {conditions ? (
              <>
                <Text variant="caption" color={fgMuted} numberOfLines={1}>
                  {conditions.condition}
                </Text>
                <Text variant="body" color={fg}>
                  {formatTemperature(conditions.temperatureC)}
                </Text>
              </>
            ) : (
              <Text variant="caption" color={fgMuted}>
                …
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
