import React from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export type SheetOption = { id: string; label: string };

type Props = {
  visible: boolean;
  options: SheetOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Shown above the list when the trigger is not a labelled field. */
  title?: string;
};

/**
 * The bottom sheet half of a single select, on its own.
 *
 * Split out of `Dropdown` so a trigger that is not a field can open the same
 * list — the advisory panel's cells are one, and reimplementing the sheet
 * beside them would leave two lists to keep in step. `Dropdown` still owns the
 * field chrome and renders this underneath.
 *
 * RN's built-in Modal and FlatList, not a native picker library: still the only
 * kind of picker the app needs.
 */
export function OptionSheet({ visible, options, selectedId, onSelect, onClose, title }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <View
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            // The sheet slides up over the whole screen, so it takes the
            // deepest lift — the one surface that is unambiguously in front
            // of everything else.
            boxShadow: theme.raised('lg'),
            paddingVertical: theme.spacing.sm,
            /* A sheet is a sibling of the screen, so it inherits no safe-area
               inset of its own. Clearing the inset is not enough either: a
               short list ends right against the gesture bar, and Android gives
               that strip to the system, so the last option swallows taps that
               look like they landed on it. The extra step keeps every row in
               the app's own touch area. */
            paddingBottom: insets.bottom + theme.spacing.lg,
            maxHeight: '60%',
          }}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: theme.radii.pill,
              // A grab handle is a groove cut into the sheet, not a bar laid
              // on it. This is the canonical soft-UI handle.
              backgroundColor: theme.colors.bg,
              boxShadow: theme.sunken('sm'),
              alignSelf: 'center',
              marginVertical: theme.spacing.sm,
            }}
          />

          {title ? (
            <Text
              variant="caption"
              color={theme.colors.muted}
              style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm, letterSpacing: 0.6 }}
            >
              {title.toUpperCase()}
            </Text>
          ) : null}

          <FlatList
            data={options}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;

              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
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
                  <Text
                    variant={isSelected ? 'bodyStrong' : 'body'}
                    color={isSelected ? theme.colors.teal : theme.colors.text}
                    style={{ flex: 1 }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}
