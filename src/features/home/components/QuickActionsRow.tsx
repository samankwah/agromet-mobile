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
  { label: 'Diagnose Crop', icon: 'leaf-outline', route: '/diagnose' },
  // One tile per distinct destination rather than a second tile also
  // pointing at Farm Tools (which the Diagnose tile already covers) —
  // Maps is a concrete, glanceable "quick tool" that lives in Library.
  { label: 'Maps', icon: 'map-outline', route: '/(tabs)/library' },
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
