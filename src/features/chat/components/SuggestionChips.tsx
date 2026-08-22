import React from 'react';
import { Pressable, View } from 'react-native';

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
 * Shaped like outgoing bubbles and aligned right, because that is exactly what
 * tapping one produces — the chip becomes the message, so it should already look
 * like the message. It also teaches which side of the transcript the farmer owns
 * before a word has been sent.
 *
 * Full-width-ish rows rather than a wrapped grid of short pills: these are whole
 * sentences, and at the extra-large text size a grid either truncates them or
 * reflows into ragged one-word lines.
 */
export function SuggestionChips({ onSelect, disabled }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
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
                alignSelf: 'flex-end',
                maxWidth: '92%',
                minHeight: theme.minTouchTarget,
                justifyContent: 'center',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 10,
                borderTopRightRadius: 0,
                backgroundColor: theme.colors.bubbleOut,
                opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
              }}
            >
              <Text variant="body">{prompt}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
