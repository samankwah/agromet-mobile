import React from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { ON_BACKDROP_COLOR } from './PhotoBackdrop';
import { Text } from './Text';

/**
 * `onBackdrop` is the only variant whose colours are fixed rather than themed:
 * it sits on a photograph, which is as dark as it is in both schemes.
 *
 * A light hairline and a light label over a faint translucent fill — not a solid
 * white button. The fill is what the reference does not need and this app does:
 * the reference sits on near-black, while a photograph varies underneath, and a
 * bare outline would leave the label's contrast to whatever happened to be
 * behind it.
 */
type Variant = 'primary' | 'secondary' | 'outline' | 'onBackdrop';

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
    variant === 'primary'
      ? theme.colors.accent
      : variant === 'onBackdrop'
        ? 'rgba(255,255,255,0.14)'
        : variant === 'secondary'
          ? theme.colors.surfaceStrong
          : 'transparent';
  const textColor =
    variant === 'primary'
      ? theme.colors.onAccent
      : variant === 'onBackdrop'
        ? ON_BACKDROP_COLOR
        : variant === 'outline'
          ? theme.colors.accent
          : theme.colors.text;
  const borderColor =
    variant === 'outline' ? theme.colors.accent : variant === 'onBackdrop' ? ON_BACKDROP_COLOR : 'transparent';

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
            borderWidth: variant === 'outline' || variant === 'onBackdrop' ? 1 : 0,
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
