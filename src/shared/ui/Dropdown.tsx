import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { FieldLabel } from './FieldLabel';
import { OptionSheet, type SheetOption } from './OptionSheet';
import { Surface } from './Surface';
import { Text } from './Text';

type Props = {
  label: string;
  options: SheetOption[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/**
 * A single-select dropdown — tap to open a bottom sheet-style modal list.
 *
 * The field is here; the sheet lives in `OptionSheet`, so a trigger that is not
 * a field can open the same list without a second implementation of it.
 */
export function Dropdown({ label, options, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === selectedId);

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'Select'}`}
      >
        {({ pressed }) => (
          // Held down, or with its sheet open, the trigger stays pushed in —
          // so the control visibly remains "the thing you are editing" for as
          // long as the sheet is up. Chrome on a nested View; see Button.tsx.
          <Surface
            depth={pressed || open ? 'sunken' : 'raised'}
            level="md"
            radius={theme.radii.lg}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: theme.minTouchTarget + 8,
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            <Text variant="bodyStrong">{selected?.label ?? 'Select'}</Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.teal} />
          </Surface>
        )}
      </Pressable>

      <OptionSheet
        visible={open}
        options={options}
        selectedId={selectedId}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
