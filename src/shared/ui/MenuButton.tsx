import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/**
 * Bar widths in dp, top to bottom, measured off the reference.
 *
 * Note they are **unequal and the middle is longest** — this is not the usual
 * three-equal-bars hamburger, and `Ionicons name="menu"` (which is equal bars)
 * would be visibly wrong. Right-aligned, so the ragged ends sit on the left.
 */
const BAR_WIDTHS = [17, 23, 12];
const BAR_HEIGHT = 2;
/** 2 + 8 = the reference's 10dp pitch between bar centres. */
const BAR_GAP = 8;

type Props = {
  onPress: () => void;
  /**
   * Overrides the bar colour. The header on the Daily view sits on a
   * photographic backdrop with fixed light-on-dark colours, so it cannot use
   * the themed text colour.
   */
  color?: string;
};

/**
 * The menu trigger.
 *
 * Plain Views rather than an SVG or an icon font: three axis-aligned rectangles
 * need neither, and this way the bars inherit the theme colour directly.
 *
 * Sized small with generous `hitSlop` rather than padded out to 44dp, following
 * the close button in `features/forecasts/day-detail/DayDetailScreen.tsx` —
 * a 44dp box would dominate a header this size while adding nothing a farmer
 * can see.
 */
export function MenuButton({ onPress, color }: Props) {
  const theme = useTheme();
  const barColor = color ?? theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {/* The chrome lives on this nested View, never on the Pressable:
          Android drops a Pressable's own layout props while still drawing its
          children, which renders the bars as an unspaced stack. */}
      <View style={{ alignItems: 'flex-end', gap: BAR_GAP }}>
        {BAR_WIDTHS.map((width, index) => (
          <View
            key={index}
            style={{ width, height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, backgroundColor: barColor }}
          />
        ))}
      </View>
    </Pressable>
  );
}
