import React from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

type Action = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
};

const ACTIONS: Action[] = [
  { label: '7-Day Forecast', icon: 'cloud-outline', route: '/(tabs)/forecasts' },
  { label: 'Advisories', icon: 'megaphone-outline', route: '/(tabs)/advisories' },
  // A camera, not a leaf: diagnosis is driven by photographing the crop, and
  // it matches both the web header's icon and the Diagnose screen's own.
  { label: 'Diagnose Crop', icon: 'camera-outline', route: '/diagnose' },
  // One tile per distinct destination rather than a second tile also
  // pointing at Farm Tools, which the Diagnose tile already covers.
  // Forecasts: the spatial-outlook choropleth is the app's map, and it ships
  // there. This tile used to land on the old Library tab's placeholder.
  { label: 'Maps', icon: 'map-outline', route: '/(tabs)/forecasts' },
];

export function QuickActionsRow() {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => router.push(action.route)}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={{
            flexBasis: '47%',
            flexGrow: 1,
            minHeight: theme.minTouchTarget + 12,
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            paddingVertical: theme.spacing.md,
          }}
        >
          <Ionicons name={action.icon} size={22} color={theme.colors.accent} />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
