import React from 'react';
import { Switch, View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

type Props = {
  label: string;
  /** What actually changes when this is on. Not marketing copy — the farmer
   * should be able to predict the effect from reading it. */
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/**
 * An on/off setting.
 *
 * React Native's own `Switch` rather than a hand-rolled toggle: it is the one
 * control here that has a real platform equivalent, and the OS version already
 * carries the right accessibility role, state and gesture handling on both
 * platforms. Only its colours are themed.
 */
export function ToggleSetting({ label, description, value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.lg }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" muted>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
        thumbColor={theme.colors.surfaceStrong}
        ios_backgroundColor={theme.colors.border}
      />
    </View>
  );
}
