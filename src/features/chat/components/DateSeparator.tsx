import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

/**
 * The centred "Today" / "Yesterday" pill between days.
 *
 * Fully rounded rather than the app's chamfered card silhouette: it is a label
 * floating on the wallpaper, not a surface holding content, and the pill shape
 * is what stops it being mistaken for a very short message.
 */
export function DateSeparator({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.bubbleIn,
          // Floats above the transcript the way the bubbles do, at the same
          // shallow depth so it does not outrank them.
          boxShadow: theme.raised('sm'),
        }}
      >
        <Text variant="caption" muted>
          {label}
        </Text>
      </View>
    </View>
  );
}
