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
};

/** A label/value row — extracted from a copy private to AlertDetailsScreen
 * once the Forecasts tab's Seasonal outlook card needed the identical
 * layout. */
export function DetailRow({ label, value, dotColor, valueColor }: Props) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1 }}>
        {dotColor ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} /> : null}
        <Text variant="body" muted>
          {label}
        </Text>
      </View>
      <Text variant="body" color={valueColor} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
