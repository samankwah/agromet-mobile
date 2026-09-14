import React from 'react';
import { View } from 'react-native';
import type { Icon } from 'phosphor-react-native';

import { useTheme } from '../theme/ThemeProvider';

/**
 * A Phosphor glyph in the app's duotone treatment — the large mark opposite a
 * hub card's title, the mark on a Home quick action, and the small one beside a
 * stat tile's figure.
 *
 * Phosphor rather than the Ionicons used elsewhere, and `duotone` rather than a
 * single stroke: two tones read as artwork instead of as a bullet, which is
 * what an icon carrying its own weight needs. Both tones are painted from one
 * colour, so dark mode and any future accent change come along for free. Fixed
 * multi-colour art would not.
 *
 * Always decorative. Every caller sets its own text naming the same thing, so
 * the glyph is hidden from screen readers rather than announced as a second,
 * wordless copy of the label.
 */
export function DuotoneIcon({
  icon: Glyph,
  size = 36,
  color,
}: {
  icon: Icon;
  size?: number;
  /** Defaults to the accent. Stat tiles pass `muted`, so the figure beside the
   * glyph stays the loudest thing in the tile. */
  color?: string;
}) {
  const theme = useTheme();
  const paint = color ?? theme.colors.accent;

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Glyph size={size} weight="duotone" color={paint} duotoneColor={paint} duotoneOpacity={0.22} />
    </View>
  );
}
