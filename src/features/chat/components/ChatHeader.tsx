import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

type Props = {
  /** Drives the status line — "typing…" while a reply is in flight, the way a
   * messaging app reports the other side rather than showing a spinner. */
  isSending: boolean;
  isOnline: boolean;
};

/**
 * The contact bar at the top of the conversation.
 *
 * Replaces the `h1` + subtitle header the other tabs use, and that is the point:
 * a chat's header names *who you are talking to*, not what the screen is. The
 * avatar plus a status line is what makes the screen read as a conversation
 * before a single message has been sent.
 *
 * No back chevron and no call buttons, unlike the app this borrows from. This is
 * a tab, so there is nowhere to go back to, and an affordance that does nothing
 * is worse than a plainer bar. The avatar is the same robot glyph as the tab
 * icon, so the tab and the thing it opens are visibly the same object.
 */
export function ChatHeader({ isSending, isOnline }: Props) {
  const theme = useTheme();
  // Claimed here rather than by `Screen`, which this screen runs `fullBleed` so
  // that the bar's fill reaches the top of the display instead of stopping
  // below the status bar and leaving a band of page colour above it.
  const insets = useSafeAreaInsets();

  const status = isSending ? 'typing…' : isOnline ? 'online' : 'offline';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: insets.top + theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        // The bar is chrome, so it takes the recessed plane the tab bar uses —
        // content advances, navigation recedes (see tokens.ts `chrome`).
        backgroundColor: theme.colors.chrome,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.accent,
        }}
      >
        <MaterialCommunityIcons name="robot" size={22} color={theme.colors.onAccent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="h3" numberOfLines={1}>
          AgroMet AI
        </Text>
        {/* One line, always present — a status that appears and disappears
            shifts the name up and down every time a reply starts. */}
        <Text variant="caption" muted numberOfLines={1}>
          {status}
        </Text>
      </View>
    </View>
  );
}
