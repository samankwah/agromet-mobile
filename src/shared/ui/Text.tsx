import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'caption';

type Props = RNTextProps & {
  variant?: Variant;
  /** Explicit color override — falls back to the theme's default text
   * color, or its muted color when `muted` is set. */
  color?: string;
  muted?: boolean;
};

/**
 * The one Text component in the app. Applies the brand fonts and type
 * scale from theme tokens so no screen repeats fontFamily/fontSize/color
 * inline — components pick a `variant`, not a font.
 */
export function Text({ variant = 'body', color, muted, style, ...rest }: Props) {
  const theme = useTheme();
  const variantStyle = theme.typeScale[variant];

  return <RNText style={[variantStyle, { color: color ?? (muted ? theme.colors.muted : theme.colors.text) }, style]} {...rest} />;
}
