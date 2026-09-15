import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { STARTER_PROMPTS } from '../starterPrompts';

type Props = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

/**
 * The empty state's tappable questions.
 *
 * These used to be shaped exactly like outgoing bubbles: right-aligned, filled
 * with `bubbleOut`, squared at the top-right corner. The reasoning was that a
 * chip becomes the message when tapped, so it should already look like one. On
 * screen it read the other way round. Under an incoming greeting, four green
 * right-hand bubbles are indistinguishable from four questions the farmer has
 * already asked and is waiting on, and an offer to help reads as a queue.
 *
 * So they are pills now, not bubbles. Left-aligned, outlined rather than
 * filled, fully rounded (the radius this design system reserves for a label
 * floating on wallpaper), each with an arrow saying it goes somewhere, under a
 * caption that names them as suggestions. Nothing here can be mistaken for a
 * turn in the transcript, because nothing here is shaped like one.
 *
 * Still full-width rows rather than a wrapped grid of short pills: these are
 * whole sentences, and at the extra-large text size a grid either truncates
 * them or reflows into ragged one-word lines.
 */
export function SuggestionChips({ onSelect, disabled }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="caption" muted style={{ paddingHorizontal: theme.spacing.xs }}>
        Try asking
      </Text>

      {STARTER_PROMPTS.map((prompt) => (
        <Pressable
          key={prompt}
          accessibilityRole="button"
          accessibilityLabel={`Ask: ${prompt}`}
          accessibilityState={{ disabled: Boolean(disabled) }}
          disabled={disabled}
          onPress={() => onSelect(prompt)}
        >
          {({ pressed }) => (
            // Chrome on a nested View, never on the Pressable — on Android the
            // Pressable's own background and border go unrendered while its
            // children still draw. Same reason Button and FaqItem do this.
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                alignSelf: 'flex-start',
                maxWidth: '100%',
                minHeight: theme.minTouchTarget,
                paddingLeft: theme.spacing.lg,
                paddingRight: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                // A chip you can tap is a key: it lifts off the transcript
                // and presses in, rather than dimming.
                opacity: disabled ? 0.6 : 1,
                boxShadow: pressed ? theme.sunken('sm') : theme.raised('sm'),
              }}
            >
              <Text variant="body" style={{ flexShrink: 1 }}>
                {prompt}
              </Text>
              {/* Decorative: the label already says "Ask", and a screen reader
                  announcing an arrow after it adds nothing. */}
              <Ionicons
                name="arrow-forward"
                size={15}
                color={theme.colors.muted}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
