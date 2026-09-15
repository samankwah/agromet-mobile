import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { DepthLevel } from '../theme/tokens';

export type SurfaceDepth = 'raised' | 'sunken' | 'lifted' | 'flat';

type Props = ViewProps & {
  /**
   * `raised` stands the surface forward of the page, `sunken` presses it in
   * (a well, a track, a control being held). `flat` keeps the fill and the
   * hairline but casts nothing — for a surface sitting on a photograph, or
   * inside a parent that clips (see the overflow note below).
   *
   * `lifted` is `raised` without the highlight, for a surface that floats over
   * content it does not control: a map, a photograph, a subtree pinned to the
   * opposite scheme. The pair's white half only reads as a bevel against the
   * page background of its own scheme — over foreign content it paints a haze,
   * which is what put a white band above the tab bar on the forecasts map.
   */
  depth?: SurfaceDepth;
  level?: DepthLevel;
  /** Defaults to the nested-block radius. Cards pass `radii.xl`. */
  radius?: number;
  /** Defaults to `colors.surface`. */
  background?: string;
  /**
   * The hairline is deliberately on by default.
   *
   * The reference designs drop it, but depth here has to be additive rather
   * than load-bearing: these users read outdoors, where a soft shadow washes
   * out completely and the outline is the only thing left holding the panel
   * together. Turn it off only where something else already draws the edge.
   */
  bordered?: boolean;
  borderColor?: string;
};

/**
 * The one depth primitive. Every panel, control and chip in the app gets its
 * fill, radius, hairline and shadow pair from here, so the light source stays
 * consistent and retuning depth is a change to `theme/tokens.ts` alone.
 *
 * Two things to know before using it:
 *
 * 1. **Chrome goes on a nested View, never on a `Pressable`.** Android drops a
 *    Pressable's own background while still drawing its children, which leaves
 *    an unstyled row. So wrap: `<Pressable><Surface>…</Surface></Pressable>`.
 * 2. **A parent with `overflow: 'hidden'` clips an outer shadow.** That is the
 *    usual reason a `raised` surface looks flat. Either lift the clipping to
 *    the Surface itself, or use `depth="flat"` and let the parent cast. Inset
 *    shadows are unaffected, since they fall inside the box.
 *
 * Built on RN's `boxShadow` style prop rather than `shadow*`/`elevation`:
 * those cannot express two shadows, and Android's `elevation` cannot express
 * an inset one at all.
 */
export function Surface({
  depth = 'raised',
  level = 'md',
  radius,
  background,
  bordered = true,
  borderColor,
  style,
  children,
  ...rest
}: Props) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: background ?? theme.colors.surface,
    borderRadius: radius ?? theme.radii.md,
  };

  if (bordered) {
    base.borderWidth = 1;
    base.borderColor = borderColor ?? theme.colors.border;
  }

  if (depth === 'raised') {
    base.boxShadow = theme.raised(level);
  } else if (depth === 'sunken') {
    base.boxShadow = theme.sunken(level);
  } else if (depth === 'lifted') {
    base.boxShadow = theme.lifted(level);
  }

  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}
