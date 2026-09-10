import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';

type Props = {
  elapsedSeconds: number;
  maxSeconds: number;
  onCancel: () => void;
};

/**
 * Takes the text field's place while a question is being recorded.
 *
 * Two things have to be obvious: that the phone is listening, and how to make
 * it stop without sending anything. Cancel lives here rather than beside the
 * stop control on the right, because discarding and using the recording are
 * opposite outcomes and should not be neighbouring taps.
 *
 * The elapsed count is not decoration. Recording stops itself at the cap, and a
 * farmer mid-sentence deserves to see that coming rather than have the app cut
 * them off unannounced.
 */
export function RecordingBar({ elapsedSeconds, maxSeconds, onCancel }: Props) {
  const theme = useTheme();
  const remaining = Math.max(0, maxSeconds - elapsedSeconds);
  // Quiet until it matters. A countdown running the whole time reads as
  // pressure to hurry, which is the opposite of helpful for a farmer choosing
  // their words.
  const isRunningOut = remaining <= 10;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        minHeight: theme.minTouchTarget,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.minTouchTarget / 2,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <LiveDot />

      <Text variant="body" style={{ flex: 1 }} accessibilityLiveRegion="polite">
        {isRunningOut ? `${remaining}s left` : 'Listening…'}
      </Text>

      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel recording" hitSlop={12}>
        {/* Chrome on the nested View: Android drops a Pressable's own. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Ionicons name="close" size={16} color={theme.colors.muted} />
          <Text variant="caption" muted>
            Cancel
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

/** A pulsing dot, the one convention everyone already reads as "recording". */
function LiveDot() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Honour the system setting: with reduced motion on, the dot is simply
    // present rather than moving. The colour still carries the meaning.
    if (reduceMotion) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.warning,
        opacity: reduceMotion ? 1 : pulse,
      }}
    />
  );
}
