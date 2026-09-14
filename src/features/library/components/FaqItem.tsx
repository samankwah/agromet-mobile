import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { FaqEntry } from '../../../shared/domain/faq';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

type Props = {
  entry: FaqEntry;
  /** Divider above every row but the first. */
  first: boolean;
};

/**
 * One question, with its answer behind a tap.
 *
 * Collapsed by default. Four answers of prose shown at once is a wall of text
 * that has to be read to be navigated; four questions is a list that can be
 * scanned. The same disclosure shape the flood/drought "Calmer regions" section
 * and the archive filters use.
 */
export function FaqItem({ entry, first }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Pressable
      onPress={() => setOpen((current) => !current)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={
        open ? `${entry.question} Hide the answer.` : `${entry.question} Show the answer.`
      }
    >
      {({ pressed }) => (
        // Chrome on the nested View, never on the Pressable — Button.tsx
        // documents why: Android drops a Pressable's own padding, border and
        // flex direction while still drawing its children.
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderTopWidth: first ? 0 : 1,
            borderTopColor: theme.colors.border,
            backgroundColor: pressed ? theme.colors.bg : 'transparent',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              minHeight: theme.minTouchTarget,
            }}
          >
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {entry.question}
            </Text>
            <Ionicons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.muted}
            />
          </View>

          {open ? (
            // Deliberately not `muted`. Everywhere else in the app muted marks
            // secondary information — a timestamp, a subtitle, a unit — but
            // here the answer is the thing the farmer opened the screen for.
            // Muting it says the wrong thing and drops the contrast from
            // 12.2:1 to 4.96:1 on prose likely to be read in bright sun.
            //
            // `sm` rather than `xs`: a one-line question is padded out by the
            // 44px touch target on its own, but one that wraps to two lines
            // fills that box and leaves the answer 4px beneath it.
            <Text variant="body" style={{ marginTop: theme.spacing.sm }}>
              {entry.answer}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
