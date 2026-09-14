import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';

type Props<T extends string> = {
  label: string;
  /** Says what the setting does, in the farmer's terms rather than the code's. */
  description: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A setting with a small set of named choices.
 *
 * `SegmentedControl` rather than a dropdown because both settings that use this
 * have three short options: a dropdown would hide them behind a tap and tell
 * the farmer nothing about what the alternatives are.
 */
export function ChoiceSetting<T extends string>({ label, description, options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" muted>
          {description}
        </Text>
      </View>

      <SegmentedControl
        segments={options.map((option) => option.label)}
        selectedIndex={selectedIndex}
        onChange={(index) => onChange(options[index].value)}
        accessibilityLabel={label}
      />
    </View>
  );
}
