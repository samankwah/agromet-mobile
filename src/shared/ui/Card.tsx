import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Surface } from './Surface';

type Props = ViewProps & {
  /** Stands the card further forward, for one the user is meant to notice
   * first — an alert banner, a "what to do" block. Resting cards use the
   * plain depth so a screen doesn't look like a wall of equally-loud boxes. */
  raised?: boolean;
  /** Semi-transparent surface, for cards sitting on the Daily view's
   * photographic backdrop — the photo reads through, but the card still
   * darkens what's behind its own text so contrast never depends on
   * whatever happens to be in the picture.
   *
   * Casts no shadow: a soft dual shadow needs a flat ground to fall on, and
   * over a photograph it reads as smudged glass. Depth there comes from the
   * fill darkening the image instead. */
  translucent?: boolean;
  /** Set by a card that is itself a button, while it is held. The card
   * presses into the page instead of dimming, which is the whole point of
   * the depth language — a tappable card should feel like a physical one. */
  pressed?: boolean;
};

/**
 * The one card surface in the app — a raised neumorphic panel with a themed
 * fill, a hairline edge and consistent padding across every screen.
 *
 * This used to paint an SVG chamfered path, because the design cut all four
 * corners at 45 degrees and no `borderRadius` can express that. The design is
 * now soft-UI and rounded, so the path, the `onLayout` measure it needed and
 * the one-frame fallback for the first render are all gone — which also means
 * a card no longer mounts an `<Svg>` each.
 *
 * The style keys a caller passes still behave the way they did under the SVG
 * version: `backgroundColor` sets the fill, `borderColor` the edge, and
 * `borderLeftWidth`/`borderLeftColor` the severity accent stripe several
 * screens put down the left edge. That stripe is intercepted rather than
 * passed through, because a plain left border would square off the two left
 * corners and break the silhouette.
 */
export function Card({ raised, translucent, pressed, style, children, ...rest }: Props) {
  const theme = useTheme();

  const {
    backgroundColor,
    borderColor,
    borderWidth: _borderWidth,
    borderRadius,
    borderLeftWidth,
    borderLeftColor,
    ...passthrough
  } = (StyleSheet.flatten(style) ?? {}) as ViewStyle;

  const fill = (backgroundColor as string) ?? (translucent ? 'rgba(10,22,34,0.55)' : theme.colors.surface);
  const stroke =
    (borderColor as string) ??
    (translucent
      ? `rgba(255,255,255,${raised ? 0.28 : 0.16})`
      : raised
        ? theme.colors.borderStrong
        : theme.colors.border);

  const radius = typeof borderRadius === 'number' ? borderRadius : theme.radii.xl;
  const accentWidth = typeof borderLeftWidth === 'number' ? borderLeftWidth : 0;

  return (
    <Surface
      depth={translucent ? 'flat' : pressed ? 'sunken' : 'raised'}
      level={raised ? 'lg' : 'md'}
      radius={radius}
      background={fill}
      borderColor={stroke}
      // `overflow: 'hidden'` only when there is a stripe to clip to the
      // rounded corners. It would otherwise cut the shadow off any raised
      // child that came near the edge — a button inside a card clears it by
      // the padding today, but that is luck, not design.
      style={[{ padding: theme.spacing.lg }, accentWidth > 0 ? { overflow: 'hidden' } : null, passthrough]}
      {...rest}
    >
      {accentWidth > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: accentWidth,
            backgroundColor: (borderLeftColor as string) ?? stroke,
          }}
        />
      ) : null}
      {children}
    </Surface>
  );
}
