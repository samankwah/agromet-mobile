import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DISTRICTS, getDistrictById } from '../../../../shared/data/districts';
import { openLocationSettings } from '../../../../shared/location/locationClient';
import { useLocationStore } from '../../../../shared/state/locationStore';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { Screen } from '../../../../shared/ui/Screen';
import { Text } from '../../../../shared/ui/Text';
import { detectAndStoreDistrict } from '../useDetectedDistrict';

/**
 * The one place a farmer manages which districts they get alerts for —
 * reached from AlertBanner's empty state or AlertDetailsScreen, not
 * duplicated as a second nav entry elsewhere.
 * Saved-district selection lives in `locationStore` (Zustand) —
 * this screen reads/writes it directly, no local component state needed.
 *
 * When nothing is saved, alerts follow the farmer's location; this screen
 * shows what that resolved to and lets them override it by ticking districts.
 */
export function SavedDistrictsScreen() {
  const theme = useTheme();
  const savedDistrictIds = useLocationStore((state) => state.savedDistrictIds);
  const toggleSavedDistrict = useLocationStore((state) => state.toggleSavedDistrict);
  const detectedDistrictId = useLocationStore((state) => state.detectedDistrictId);
  const locationPermission = useLocationStore((state) => state.locationPermission);
  const clearLocationDetection = useLocationStore((state) => state.clearLocationDetection);

  const [locating, setLocating] = useState(false);
  const detectedName = detectedDistrictId ? getDistrictById(detectedDistrictId)?.name : undefined;

  const useMyLocation = async () => {
    setLocating(true);
    try {
      clearLocationDetection();
      await detectAndStoreDistrict();
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen>
      <Text variant="body" muted>
        Choose the districts you want weather alerts for. Leave none selected to use your location.
      </Text>

      {savedDistrictIds.length === 0 && detectedName ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Ionicons name="location" size={20} color={theme.colors.accent} />
          <Text variant="body" style={{ flex: 1 }}>
            Using your location: {detectedName}. Tick districts below to choose your own instead.
          </Text>
        </Card>
      ) : null}

      {savedDistrictIds.length === 0 && !detectedName ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="body">
            {locationPermission === 'denied'
              ? 'Location is off, so alerts are not tied to your area yet.'
              : 'AgroMet has not found your area yet.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button label="Use my location" variant="secondary" loading={locating} onPress={useMyLocation} />
            {locationPermission === 'denied' ? <Button label="Open settings" variant="outline" onPress={openLocationSettings} /> : null}
          </View>
        </Card>
      ) : null}

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
                color={selected ? theme.colors.focusRim : theme.colors.muted}
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
