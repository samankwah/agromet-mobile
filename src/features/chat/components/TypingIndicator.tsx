import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

const DOTS = [0, 1, 2];

/**
 * Sits in the assistant's slot while a reply is in flight.
 *
 * `Animated` rather than Reanimated, matching `Skeleton`'s reasoning: a
 * three-stop opacity loop needs nothing more, and Animated is already the house
 * tool. Motion drops entirely under reduced motion — the dots still render,
 * they just hold still — so the indicator never becomes the one piece of the app
 * that ignores the setting.
 *
 * Not `AsyncStateView`, even though that is the house rule for query-backed
 * surfaces: it swaps its whole region for a spinner, and a chat must keep the
 * transcript on screen with the pending marker appended to it.
 */
export function TypingIndicator() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const loop = Animated.loop(Animated.timing(progress, { toValue: 3, duration: 1200, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="AgroMet AI is typing"
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        // The incoming bubble's shape and fill, so the pending marker reads as
        // a message being written rather than as a widget on the wallpaper.
        borderRadius: 10,
        backgroundColor: theme.colors.bubbleIn,
        // Matches MessageBubble's lift, for the same reason as its fill: this
        // has to read as a message being written, not a widget.
        boxShadow: theme.raised('sm'),
      }}
    >
      {reduceMotion ? (
        <Text variant="body" muted>
          Thinking…
        </Text>
      ) : (
        DOTS.map((index) => (
          <Animated.View
            key={index}
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: theme.colors.muted,
              // Each dot peaks a third of the loop after the one before it, so
              // the three read as a travelling pulse rather than a blink.
              opacity: progress.interpolate({
                inputRange: [index - 1, index, index + 1, index + 2, index + 3],
                outputRange: [0.3, 1, 0.3, 0.3, 1],
                extrapolate: 'clamp',
              }),
            }}
          />
        ))
      )}
    </View>
  );
}
