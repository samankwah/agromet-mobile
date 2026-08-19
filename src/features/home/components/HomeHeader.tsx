import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

export function HomeHeader() {
  const theme = useTheme();

  return (
    <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radii.sm,
          backgroundColor: theme.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="leaf" size={20} color={theme.colors.onAccent} />
      </View>
      <View>
        <Text variant="h2">AgroMet Ghana</Text>
        <Text variant="caption" muted>
          Farm weather at a glance
        </Text>
      </View>
    </View>
  );
}
