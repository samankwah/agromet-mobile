import React from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
};

/**
 * The one button in the app — always meets the 44x44pt minimum touch
 * target, always exposes accessibilityRole="button" and a disabled state
 * for screen readers, and never renders a spinner *instead of* the label
 * without also disabling the press (so a farmer can't double-submit a
 * diagnosis while it's already in flight).
 */
export function Button({ label, variant = 'primary', loading, disabled, icon, ...rest }: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? theme.colors.accent : variant === 'secondary' ? theme.colors.surfaceStrong : 'transparent';
  const textColor = variant === 'primary' ? theme.colors.onAccent : variant === 'outline' ? theme.colors.accent : theme.colors.text;
  const borderColor = variant === 'outline' ? theme.colors.accent : 'transparent';

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: isDisabled, busy: loading }} disabled={isDisabled} {...rest}>
      {({ pressed }) => (
        // The chrome lives on a nested View rather than on the Pressable
        // itself. Styling the Pressable directly left the background,
        // border and padding unrendered on Android while the label still
        // drew — an invisible button. A plain View has no such ambiguity.
        <View
          style={{
            minHeight: theme.minTouchTarget,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radii.md,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor,
            backgroundColor,
            opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm,
          }}
        >
          {loading ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <>
              {icon}
              <Text variant="bodyStrong" color={textColor}>
                {label}
              </Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}
