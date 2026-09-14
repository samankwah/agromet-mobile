import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Props = {
  label: string;
  value: string;
  /** Draws a small filled dot before the label, tying the row to a series
   * colour used in a chart above it. */
  dotColor?: string;
  /** Colours the value to match that same series. Both are optional, so
   * existing plain label/value callers are unaffected. */
  valueColor?: string;
  /**
   * Puts the label above the value instead of beside it.
   *
   * For values that cannot fit a phone's width beside a label — a full source
   * attribution, a timestamp with its relative form. Side by side, those leave
   * the label a few pixels and it breaks mid-word ("Comp / uted / by"), which
   * is what this prop exists to stop.
   */
  stacked?: boolean;
};

/** A label/value row — extracted from a copy private to AlertDetailsScreen
 * once the Forecasts tab's Seasonal outlook card needed the identical
 * layout. */
export function DetailRow({ label, value, dotColor, valueColor, stacked }: Props) {
  const theme = useTheme();

  const labelGroup = (
    // `flexShrink: 0`: the label is always the shorter half, so it should never
    // be the half that gets compressed. Without this a long value squeezes it to
    // a couple of characters wide and every label wraps mid-word.
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 0 }}>
      {dotColor ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} /> : null}
      <Text variant="body" muted>
        {label}
      </Text>
    </View>
  );

  if (stacked) {
    return (
      <View style={{ gap: 2, paddingVertical: 2 }}>
        {labelGroup}
        <Text variant="body" color={valueColor}>
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
      {labelGroup}
      {/* `flex: 1`, not `flexShrink: 1` — the value takes whatever the label
          leaves and wraps inside it, rather than the two fighting over the
          width. */}
      <Text variant="body" color={valueColor} style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
