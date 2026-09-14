import React, { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewProps, type ViewStyle } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';
import { chamferedRectPath } from './cardShape';

type Props = ViewProps & {
  /** Stronger outline — for cards the user is meant to notice first, like
   * the alert banner. Resting cards (default) use the plain hairline so the
   * screen doesn't look like a wall of equally-loud boxes. This used to be a
   * heavier shadow; in the flat system emphasis is carried by the border
   * colour instead (see theme/tokens.ts's `elevation`). */
  raised?: boolean;
  /** Semi-transparent surface, for cards sitting on the Daily view's
   * photographic backdrop — the photo reads through, but the card still
   * darkens what's behind its own text so contrast never depends on
   * whatever happens to be in the picture. */
  translucent?: boolean;
};

/**
 * The one card surface in the app — outline-first and never shadowed (see
 * theme/tokens.ts's `elevation`), themed surface color, consistent
 * padding/silhouette across every screen.
 *
 * The silhouette is an SVG path, not a `borderRadius`: the design cuts all four
 * corners at 45 degrees, deeply on the top-left and bottom-right and about half
 * as far on the other two. No border radius can express that. See
 * ui/cardShape.ts.
 *
 * Because the background is painted rather than set with `backgroundColor`,
 * the fill/border style keys a caller passes would otherwise draw a *square*
 * rectangle over the shape. So they are intercepted from `style` and fed into
 * the path instead — `backgroundColor` becomes the fill, `borderColor` the
 * stroke, and `borderLeftWidth`/`borderLeftColor` become the severity accent
 * stripe several screens put down the left edge. Callers therefore need no
 * changes, and a future caller reaching for those keys still gets a card that
 * looks right.
 */
export function Card({ raised, translucent, style, children, onLayout, ...rest }: Props) {
  const theme = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  // Every card renders its own <Svg>, but ids have bitten react-native-svg
  // before when two documents share one — so scope the clip path per instance.
  // React's useId contains colons, which are not safe inside url(#...).
  const clipId = `cardClip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Pull the keys that must become path paint rather than View chrome.
  const {
    backgroundColor,
    borderColor,
    borderWidth: _borderWidth,
    borderRadius: _borderRadius,
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

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    // Re-render only on a real size change; a rounding wobble between layout
    // passes would otherwise loop this component.
    setSize((prev) =>
      prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
        ? prev
        : { width, height },
    );
    onLayout?.(event);
  };

  const accentWidth = typeof borderLeftWidth === 'number' ? borderLeftWidth : 0;
  const path = size
    ? chamferedRectPath({
        width: size.width,
        height: size.height,
        chamfer: theme.cardShape.chamfer,
        minorChamfer: theme.cardShape.minorChamfer,
      })
    : null;

  return (
    <View
      onLayout={handleLayout}
      style={[
        {
          padding: theme.spacing.lg,
          // Until the first layout gives us a size to draw against, fall back
          // to a plain rounded surface. That is one frame at most, and it
          // keeps a card from flashing as a transparent hole.
          ...(size
            ? null
            : { backgroundColor: fill, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: stroke }),
        },
        passthrough,
      ]}
      {...rest}
    >
      {size && path ? (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          // The shape is drawn in real pixels, so no viewBox: scaling one
          // would skew the 45-degree cuts on any non-default aspect ratio.
        >
          {accentWidth > 0 ? (
            <Defs>
              <ClipPath id={clipId}>
                <Path d={path} />
              </ClipPath>
            </Defs>
          ) : null}
          <Path d={path} fill={fill} stroke={stroke} strokeWidth={1} />
          {accentWidth > 0 ? (
            <Rect
              x={0}
              y={0}
              width={accentWidth}
              height={size.height}
              fill={(borderLeftColor as string) ?? stroke}
              clipPath={`url(#${clipId})`}
            />
          ) : null}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
