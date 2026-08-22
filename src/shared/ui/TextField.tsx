import React from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { FieldLabel } from './FieldLabel';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Grows to fit several lines — for notes rather than names. */
  multiline?: boolean;
};

/**
 * The one text input in the app.
 *
 * The styling here was previously written inline, once per field, inside
 * StartCycleForm — border, radius, touch target, font, placeholder colour, all
 * repeated. This is that block, factored out, so a form is a list of fields
 * rather than a wall of style objects.
 *
 * `minHeight` is the theme's touch target rather than a font-derived height:
 * a text field small enough to look neat is a text field a farmer with wet or
 * calloused hands cannot reliably hit.
 */
export function TextField({ label, multiline, accessibilityLabel, ...rest }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={theme.colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          minHeight: multiline ? theme.minTouchTarget * 2 : theme.minTouchTarget,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: multiline ? theme.spacing.md : 0,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          fontFamily: theme.fontFamily.body,
          fontSize: theme.typeScale.body.fontSize,
        }}
        {...rest}
      />
    </View>
  );
}
