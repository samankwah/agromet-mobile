import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { Surface } from './Surface';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  accessibilityLabel: string;
};

/**
 * A search field with a leading icon and a clear button.
 *
 * `shared/ui/TextField` cannot be used: it has no slot for a leading icon, and
 * a magnifier is what tells a reader this box filters rather than records. The
 * chrome here is the row MarketScreen hand-rolled for the same reason. It lived
 * under the advisory archive until the subseasonal map needed to search
 * districts, which is the third consumer and well past the point where this
 * codebase moves a pattern into the shared kit.
 *
 * No debounce. Filtering is a synchronous `useMemo` over an already-fetched
 * list, so there is no request to delay; adding one would introduce the app's
 * first debounce for no gain and would make typing feel laggy.
 */
export function SearchField({ value, onChange, placeholder, accessibilityLabel }: Props) {
  const theme = useTheme();

  return (
    // A search box is a well, like every other input — see TextField.
    <Surface
      depth="sunken"
      level="sm"
      radius={theme.radii.md}
      background={theme.colors.bg}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        minHeight: theme.minTouchTarget,
      }}
    >
      <Ionicons name="search" size={18} color={theme.colors.muted} />

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        returnKeyType="search"
        style={{
          flex: 1,
          color: theme.colors.text,
          fontFamily: theme.fontFamily.body,
          fontSize: theme.typeScale.body.fontSize,
          paddingVertical: theme.spacing.sm,
        }}
      />

      {/* Only present when there is something to clear. Every other filter here
          clears by re-selecting its sentinel option; a text box has no
          equivalent, so it needs this. */}
      {value !== '' ? (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear the search">
          {({ pressed }) => (
            // Chrome on a nested View — Button.tsx documents why: Android drops
            // a Pressable's own padding while still drawing its children.
            <View
              style={{
                opacity: pressed ? 0.6 : 1,
                paddingVertical: theme.spacing.sm,
                paddingLeft: theme.spacing.sm,
              }}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
            </View>
          )}
        </Pressable>
      ) : null}
    </Surface>
  );
}
