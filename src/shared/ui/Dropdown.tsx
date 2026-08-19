import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { FieldLabel } from './FieldLabel';
import { Text } from './Text';

type Option = { id: string; label: string };

type Props = {
  label: string;
  options: Option[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/**
 * A single-select dropdown — tap to open a bottom sheet-style modal list.
 * No new dependency: RN's built-in Modal + FlatList, not a native picker
 * library, since this is the only place in the app that needs one so far.
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: theme.minTouchTarget + 8,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.surface,
          ...theme.elevation.card,
        }}
      >
        <Text variant="bodyStrong">{selected?.label ?? 'Select'}</Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.teal} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View
            style={{
              backgroundColor: theme.colors.bg,
              borderTopLeftRadius: theme.radii.lg,
              borderTopRightRadius: theme.radii.lg,
              paddingVertical: theme.spacing.sm,
              maxHeight: '60%',
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
                alignSelf: 'center',
                marginVertical: theme.spacing.sm,
              }}
            />
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      minHeight: theme.minTouchTarget,
                      paddingHorizontal: theme.spacing.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}
                  >
                    {/* A fixed-width slot rather than a transparent-coloured
                        icon: Ionicons doesn't reliably honour a transparent
                        colour on Android, which left every row looking
                        selected. The slot keeps the labels aligned. */}
                    <View style={{ width: 18, alignItems: 'center' }}>
                      {isSelected ? <Ionicons name="checkmark" size={18} color={theme.colors.teal} /> : null}
                    </View>
                    <Text variant={isSelected ? 'bodyStrong' : 'body'} color={isSelected ? theme.colors.teal : theme.colors.text}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
